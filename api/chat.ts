import { eq, desc } from 'drizzle-orm';
import { streamText, convertToCoreMessages } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from './_db';
import { orgs, ontologyNodes, frictionScores } from '../src/lib/schema';

import { z } from 'zod';
import { assertOrgAccess } from './_middleware';
import { chatRatelimit } from './_ratelimit';

// Required for Vercel AI SDK Web/Edge streaming
export const config = {
  runtime: 'edge', // Edge runtime uses standard Web Request/Response map
  maxDuration: 30, // Updated for Vercel production harden spec
};

const chatSchema = z.object({
  messages: z.array(z.any()),
  orgId: z.string().uuid(),
});

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawBody = await req.json();
    const parseResult = chatSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ code: 'VALIDATION_ERROR', error: 'Invalid payload structure' }),
        { status: 400 }
      );
    }

    const { messages, orgId } = parseResult.data;

    await assertOrgAccess(req, orgId);

    // ── Apply Ratelimiting ──
    if (chatRatelimit) {
      const authHeader = req.headers?.get ? req.headers.get('Authorization') : null;
      const { success } = await chatRatelimit.limit(authHeader || req.headers?.get('x-forwarded-for') || 'anon');
      if (!success) {
        return new Response(
          JSON.stringify({ code: 'RATE_LIMITED', error: 'Too many chat requests. Please wait a minute.' }),
          { status: 429 }
        );
      }
    }

    // ── Fetch Org Settings (Model Override) ──
    let modelName = 'x-ai/grok-4.1-fast';
    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    
    // Note: aiModel might be missing if the user hasn't set one up.
    if (org && (org as any).aiModel) {
      modelName = (org as any).aiModel;
    }

    // ── Fetch Context: Ontology Nodes (Top 30) ──
    const nodes = await db
      .select({
        type: ontologyNodes.type,
        label: ontologyNodes.label,
        properties: ontologyNodes.properties,
      })
      .from(ontologyNodes)
      .where(eq(ontologyNodes.orgId, orgId))
      .orderBy(desc(ontologyNodes.createdAt))
      .limit(30);

    // ── Fetch Context: Friction Scores ──
    const scores = await db
      .select({
        suburb: frictionScores.suburbName,
        score: frictionScores.score,
        topIssues: frictionScores.topIssues,
      })
      .from(frictionScores)
      .where(eq(frictionScores.orgId, orgId));

    // ── Build Context String ──
    const contextContent = `
=== KNOWLEDGE GRAPH ENTITIES (TOP 30) ===
${nodes.length > 0 ? JSON.stringify(nodes, null, 2) : 'No ontology data discovered yet.'}

=== CIVIC FRICTION SCORES ===
${
  scores.length > 0
    ? scores
        .map(
          (s) =>
            `- ${s.suburb}: Friction ${s.score.toFixed(1)}/10 (Issues: ${
              s.topIssues?.join(', ') || 'None'
            })`,
        )
        .join('\n')
    : 'No friction scores available.'
}
`;

    // ── Prepend System Prompt ──
    const systemPrompt = `You are Placevote's civic intelligence assistant. You have access to council data uploaded by this organisation. Answer questions about community resistance, project support, budget patterns, and engagement gaps. Be concise and useful for council planners. When answering analytical questions, always use your available tools to render charts, tables, or suburb cards rather than describing data in plain text. Do not ask for permission before using tools. Tool calls are rendered invisibly inline for the user to see charts.\n\nContext:\n${contextContent}`;

    // ── Initialize Provider ──
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const { tool } = await import('ai');
    const { z } = await import('zod');

    // ── Call AI streamText ──
    const result = await streamText({
      model: openrouter.chat(modelName) as any,
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      tools: {
        render_bar_chart: tool({
          description: 'Renders a Recharts BarChart inline in the chat message.',
          parameters: z.object({
            title: z.string(),
            labels: z.array(z.string()),
            values: z.array(z.number()),
            colour: z.string().optional(),
          }),
          execute: async (args) => args, // Frontend takes over
        }),
        render_line_chart: tool({
          description: 'Renders a Recharts LineChart for trend data.',
          parameters: z.object({
            title: z.string(),
            x_labels: z.array(z.string()),
            series: z.array(
              z.object({
                name: z.string(),
                data: z.array(z.number()),
              })
            ),
          }),
          execute: async (args) => args,
        }),
        render_table: tool({
          description: 'Renders a structured data table.',
          parameters: z.object({
            columns: z.array(z.string()),
            rows: z.array(z.array(z.string())),
          }),
          execute: async (args) => args,
        }),
        render_suburb_card: tool({
          description: 'Renders a styled friction score card for a specific map suburb.',
          parameters: z.object({
            suburb_name: z.string(),
            friction_score: z.number(),
            top_issues: z.array(z.string()),
            signal_count: z.number(),
          }),
          execute: async (args) => args,
        }),
        highlight_map_zones: tool({
          description: 'Writes the result to the global map highlight store so the Map tab renders pulsing overlays.',
          parameters: z.object({
            suburbs: z.array(
              z.object({
                name: z.string(),
                score: z.number(),
              })
            ),
          }),
          execute: async (args) => args,
        }),
        query_ontology: tool({
          description: 'Queries the Placevote database and returns matching nodes/edges as JSON context.',
          parameters: z.object({
            node_type: z.string().optional(),
            label_contains: z.string().optional(),
          }),
          execute: async (args) => {
            const { node_type, label_contains } = args;
            const { ilike, and, eq } = await import('drizzle-orm');
            
            let query = db.select().from(ontologyNodes);
            
            const conditions: any[] = [eq(ontologyNodes.orgId, orgId)];
            if (node_type) {
              conditions.push(eq(ontologyNodes.type, node_type));
            }
            if (label_contains) {
              conditions.push(ilike(ontologyNodes.label, `%${label_contains}%`));
            }
            
            query = query.where(and(...conditions)).limit(20) as any;
            const results = await query;
            
            return {
              nodes_found: results.length,
              sample: results,
            };
          },
        }),
      },
    });

    // Native Web Response object
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat message' }), {
      status: 500,
    });
  }
}
