import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { inngest } from './_inngest.js';
import { db } from './_db.js';
import { uploads, orgs } from '../src/lib/schema.js';
import { parseUploadBuffer } from './_upload-preview.js';
import { buildFallbackClassification } from './_ontology-fallback.js';

const DEFAULT_MODEL = 'x-ai/grok-4.1-fast';

// ─── Classification Zod schema ──────────────────────────────────
const classificationSchema = z.object({
  detected_type: z
    .enum([
      'CommunityConsultation',
      'BudgetData',
      'ProjectTimeline',
      'ServiceRequest',
      'DevelopmentApplication',
      'DemographicData',
      'GeospatialData',
      'Unknown',
    ])
    .describe('The primary data category'),
  useful_for: z
    .array(z.string())
    .describe('Potential uses for this data in civic decision-making'),
  risk_flags: z
    .array(z.string())
    .describe('Privacy, PII, or data-quality concerns'),
  row_summary: z
    .string()
    .describe('Brief human-readable summary of the data content'),
});

// ─── Inngest function ───────────────────────────────────────────
export const processUpload = inngest.createFunction(
  {
    id: 'process-upload',
    retries: 2,
    triggers: [{ event: 'upload/queued' }],
    onFailure: async ({ event, error }) => {
      const { failedJobs } = await import('../src/lib/schema.js');
      const { db } = await import('./_db.js');
      const { uploads } = await import('../src/lib/schema.js');
      const { eq } = await import('drizzle-orm');
      await db.insert(failedJobs).values({
        eventId: event.data.event.id || 'unknown',
        functionId: 'process-upload',
        payload: event.data.event.data,
        error: error.message,
      });
      const uploadId = event.data.event.data?.uploadId;
      if (typeof uploadId === 'string') {
        await db
          .update(uploads)
          .set({ status: 'error' })
          .where(eq(uploads.id, uploadId));
      }
    },
  },
  async ({ event, step }) => {
    const {
      uploadId,
      orgId,
      filename,
      blobUrl,
      detectedType,
      rowCount: initialRowCount,
      sample: initialSample,
    } = event.data as {
      uploadId: string;
      orgId: string;
      filename: string;
      blobUrl: string;
      detectedType?: string | null;
      rowCount?: number;
      sample?: string;
    };

    // ── Step 0: Fetch org settings for model/API key ───────────
    const orgSettings = await step.run('fetch-org-settings', async () => {
      const [org] = await db
        .select({ aiModel: orgs.aiModel, openrouterApiKey: orgs.openrouterApiKey })
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);
      return org ?? { aiModel: null, openrouterApiKey: null };
    });

    const apiKey = orgSettings.openrouterApiKey || process.env.OPENROUTER_API_KEY || null;
    const modelName = orgSettings.aiModel || DEFAULT_MODEL;

    // ── Step 1: Mark as processing ──────────────────────────
    await step.run('set-processing', async () => {
      await db
        .update(uploads)
        .set({ status: 'processing' })
        .where(eq(uploads.id, uploadId));
    });

    // ── Step 2: Prepare parsed preview ───────────────────────
    const parsed = await step.run('prepare-preview', async () => {
      if (typeof initialSample === 'string' && typeof initialRowCount === 'number') {
        return {
          rowCount: initialRowCount,
          sample: initialSample,
        };
      }

      if (!blobUrl || blobUrl.startsWith('inline://')) {
        throw new Error('Upload payload is unavailable for parsing.');
      }

      const res = await fetch(blobUrl);
      if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
      const ab = await res.arrayBuffer();
      return parseUploadBuffer(Buffer.from(ab), filename);
    });

    // ── Step 4: Classify with OpenRouter → Gemini 2.0 Flash ─
    const classification = await step.run('classify-ai', async () => {
      const fallback = buildFallbackClassification({
        filename,
        rowCount: parsed.rowCount,
        sample: parsed.sample,
      });

      if (!apiKey) {
        console.warn('OPENROUTER_API_KEY missing, using fallback classification for', filename);
        return fallback;
      }

      try {
        const openrouter = createOpenRouter({
          apiKey,
        });

        const { object } = await generateObject<z.infer<typeof classificationSchema>>({
          model: openrouter.chat(modelName) as any,
          schema: classificationSchema,
          prompt: [
            'You are a civic data analyst working for an Australian local government.',
            'Classify the following dataset sample.',
            '',
            `Filename: ${filename}`,
            `Detected file type: ${detectedType ?? 'unknown'}`,
            `Row / line count: ${parsed.rowCount}`,
            '',
            'Data sample:',
            parsed.sample,
            '',
            'Return the data type, potential civic uses, any privacy/data-quality risks,',
            'and a brief human-readable summary.',
          ].join('\n'),
        });

        return object;
      } catch (error) {
        console.warn('AI classification failed, using fallback classification:', error);
        return fallback;
      }
    });

    // ── Step 5: Update DB — status → classified ─────────────
    await step.run('update-db', async () => {
      await db
        .update(uploads)
        .set({
          detectedType: classification.detected_type,
          rowCount: parsed.rowCount,
          status: 'classified',
        })
        .where(eq(uploads.id, uploadId));
    });

    // ── Step 6: Emit upload/classified event ─────────────────
    await step.sendEvent('emit-classified', {
      name: 'upload/classified',
      data: {
        uploadId,
        orgId,
        filename,
        blobUrl,
        detectedType: classification.detected_type,
        rowCount: parsed.rowCount,
        usefulFor: classification.useful_for,
        riskFlags: classification.risk_flags,
        rowSummary: classification.row_summary,
        sample: parsed.sample,
      },
    });

    return { success: true, classification };
  },
);
