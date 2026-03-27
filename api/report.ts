import { eq, and } from 'drizzle-orm';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { db } from './_db.js';
import { orgs, frictionScores } from '../src/lib/schema.js';

// Required for Vercel AI SDK Web/Edge streaming
export const config = {
  runtime: 'edge',
  maxDuration: 30, // Updated for Vercel production harden spec
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    // useCompletion defaults to sending `{ prompt }`
    // We combine the parameters we sent within a JSON payload into prompt,
    // or just pass custom body keys. useCompletion allows `body: { orgId,... }`
    const { orgId, suburbName, dateRange, prompt } = body;

    if (!orgId) {
      return new Response(JSON.stringify({ error: 'Missing orgId' }), { status: 400 });
    }

    // ── Fetch Org Settings ──
    let modelName = 'x-ai/grok-4.1-fast';
    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (org && (org as any).aiModel) {
      modelName = (org as any).aiModel;
    }

    // ── Fetch Friction Scores ──
    let scoreConditions: any[] = [eq(frictionScores.orgId, orgId)];
    if (suburbName && suburbName !== 'All') {
      scoreConditions.push(eq(frictionScores.suburbName, suburbName));
    }
    
    // We use "any" to bypass exact tuple restrictions on "and" args for simplicity
    const scores = await db
      .select({
        suburb: frictionScores.suburbName,
        score: frictionScores.score,
        issues: frictionScores.topIssues,
        signals: frictionScores.signalCount,
      })
      .from(frictionScores)
      .where(and(...scoreConditions));

    // ── Build Context ──
    const contextStr = `
=== CIVIC FRICTION INTELLIGENCE ===
Filters applied: Suburb=${suburbName || 'All'}, DateRange=${dateRange || 'All Time'}

${JSON.stringify(scores, null, 2)}
`;

    const systemPrompt = `You are a premier executive strategic advisor. Given the provided civic friction scores, top issues, and signals for the selected filters, write a comprehensive 1-page executive brief for a local councillor.

Structure your response with EXACTLY these Markdown sections:
# Executive Brief: Civic Friction Report
## Summary
## Key Resistance Areas
## Top Issues by Suburb
## Recommended Actions

Ensure the tone is professional, insightful, and actionable. Base all insights strictly on the provided Context constraint.

Context:
${contextStr}
`;

    // ── Initialize Provider ──
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    // ── Call AI streamText ──
    const result = await streamText({
      model: openrouter.chat(modelName) as any,
      system: systemPrompt,
      prompt: prompt || 'Generate the Executive Brief according to the system instructions.',
    });

    // Native Web Response object
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Report API Error:', error);
    if (error?.status && error?.code) {
      return new Response(
        JSON.stringify({ code: error.code, error: error.message }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ error: 'Failed to process report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
