import { eq, inArray, sql, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { inngest } from './_inngest.js';
import { db } from './_db.js';
import { uploads, ontologyNodes, ontologyEdges, orgs } from '../src/lib/schema.js';

const DEFAULT_MODEL = 'x-ai/grok-4.1-fast';

// ─── Ontology Generation Zod schema ─────────────────────────────
const ontologySchema = z.object({
  nodes: z
    .array(
      z.object({
        type: z.enum([
          'Place',
          'Project',
          'Submission',
          'Budget',
          'Signal',
        ]),
        label: z.string().describe('Unique identifier/name for this node'),
        properties: z.record(z.string(), z.any()).describe('Key-value metadata'),
      }),
    )
    .describe('List of discovered entities'),
  edges: z
    .array(
      z.object({
        source_label: z.string(),
        target_label: z.string(),
        label: z.string().describe('Relationship type (e.g., LOCATED_IN, PROPOSES)'),
        weight: z.number().default(1.0),
      }),
    )
    .describe('List of relationships between nodes'),
});

// ─── Inngest function ───────────────────────────────────────────
export const buildOntology = inngest.createFunction(
  {
    id: 'build-ontology',
    retries: 2, // Minimize retries on expensive LLM calls
    onFailure: async ({ event, error }) => {
      const { failedJobs } = await import('../src/lib/schema');
      await db.insert(failedJobs).values({
        eventId: event.data.event.id || 'unknown',
        functionId: 'build-ontology',
        payload: event.data.event.data,
        error: error.message,
      });
    },
    triggers: [{ event: 'upload/classified' }],
  },
  async ({ event, step }) => {
    const { uploadId, orgId, filename, sample } = event.data as {
      uploadId: string;
      orgId: string;
      filename: string;
      sample: string;
    };

    try {
      // ── Step 0: Fetch org settings for model/API key ───────────
      const orgSettings = await step.run('fetch-org-settings', async () => {
        const [org] = await db
          .select({ aiModel: orgs.aiModel, openrouterApiKey: orgs.openrouterApiKey })
          .from(orgs)
          .where(eq(orgs.id, orgId))
          .limit(1);
        return org ?? { aiModel: null, openrouterApiKey: null };
      });

      const apiKey = orgSettings.openrouterApiKey || process.env.OPENROUTER_API_KEY!;
      const modelName = orgSettings.aiModel || DEFAULT_MODEL;

      // ── Step 1: Call OpenRouter → Extract Ontology ──────────
      const ontology = await step.run('extract-ontology', async () => {
        const openrouter = createOpenRouter({
          apiKey,
        });

        const { object } = await generateObject<z.infer<typeof ontologySchema>>({
          model: openrouter.chat(modelName) as any,
          schema: ontologySchema,
          prompt: [
            'You are a civic data knowledge extraction AI.',
            'Extract an ontology graph from the following dataset sample.',
            '',
            'Placevote Ontology Node Types:',
            '- Place (suburb, street, precinct)',
            '- Project (council project or proposal)',
            '- Submission (community opinion/feedback)',
            '- Budget (line item or allocation)',
            '- Signal (complaint, DA objection, service request)',
            '',
            `Filename: ${filename}`,
            'Data sample:',
            sample,
            '',
            'Return a structured JSON with `nodes` and `edges`.',
            'Ensure `source_label` and `target_label` on edges strictly match a node `label`.',
            'Limit to the most important entities and relationships.',
          ].join('\n'),
        });

        return object;
      });

      // ── Step 2: Upsert Nodes (Capped at 200) ─────────────────
      // Free tier safety limit
      const cappedNodes = ontology.nodes.slice(0, 200);

      if (cappedNodes.length > 0) {
        await step.run('upsert-nodes', async () => {
          // Batch upsert: match on org_id + type + label, update properties
          await db
            .insert(ontologyNodes)
            .values(
              cappedNodes.map((n) => ({
                orgId,
                type: n.type,
                label: n.label,
                properties: n.properties,
              })),
            )
            .onConflictDoUpdate({
              target: [
                ontologyNodes.orgId,
                ontologyNodes.type,
                ontologyNodes.label,
              ],
              set: {
                properties: sql`EXCLUDED.properties`,
              },
            });
        });
      }

      // ── Step 3: Insert Edges ─────────────────────────────────
      const cappedEdges = ontology.edges.slice(0, 500); // safety cap

      if (cappedEdges.length > 0 && cappedNodes.length > 0) {
        await step.run('insert-edges', async () => {
          // Fetch the actual UUIDs of all nodes for this org that we just upserted
          // (We fetch all the relevant labels to map source/target)
          const nodeLabels = cappedNodes.map((n) => n.label);
          const existingNodes = await db
            .select({ id: ontologyNodes.id, label: ontologyNodes.label })
            .from(ontologyNodes)
            .where(
              and(
                eq(ontologyNodes.orgId, orgId),
                inArray(ontologyNodes.label, nodeLabels)
              )
            );

          const labelToIdMap = new Map<string, string>();
          for (const n of existingNodes) {
            labelToIdMap.set(n.label, n.id);
          }

          const mappedEdges = cappedEdges
            .map((edge) => {
              const sourceId = labelToIdMap.get(edge.source_label);
              const targetId = labelToIdMap.get(edge.target_label);
              if (!sourceId || !targetId) return null;

              return {
                orgId,
                sourceId,
                targetId,
                label: edge.label,
                weight: edge.weight ?? 1.0,
              };
            })
            .filter(Boolean) as {
            orgId: string;
            sourceId: string;
            targetId: string;
            label: string;
            weight: number;
          }[];

          if (mappedEdges.length > 0) {
            // Due to limitations of parameter binding length, 
            // chunking could be needed if the array is huge, but it's capped at 500 edges, so we safely insert.
            await db.insert(ontologyEdges).values(mappedEdges);
          }
        });
      }

      // ── Step 4: Mark upload ready ───────────────────────────
      await step.run('mark-ready', async () => {
        await db
          .update(uploads)
          .set({ status: 'ready' })
          .where(eq(uploads.id, uploadId));
      });

      return { success: true, nodesUpserted: cappedNodes.length };
    } catch (err: unknown) {
      console.error('build-ontology error:', err);
      // Mark as error on failure
      await step.run('mark-error', async () => {
        await db
          .update(uploads)
          .set({ status: 'error' })
          .where(eq(uploads.id, uploadId));
      });
      throw err; // Trigger retry if applicable
    }
  },
);
