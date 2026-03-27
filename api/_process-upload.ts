import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { inngest } from './_inngest';
import { db } from './_db';
import { uploads } from '../src/lib/schema';

const MAX_SAMPLE_CHARS = 8_000; // ≈ 2 000 tokens

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

// ─── Helpers ────────────────────────────────────────────────────
function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function truncate(text: string): string {
  return text.length > MAX_SAMPLE_CHARS
    ? text.slice(0, MAX_SAMPLE_CHARS) + '\n… [truncated]'
    : text;
}

// ─── Parsers ────────────────────────────────────────────────────
async function parseCSV(
  buffer: Buffer,
): Promise<{ rowCount: number; sample: string }> {
  const Papa = (await import('papaparse')).default;
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, { header: true, preview: 50 });
  const rows = result.data as Record<string, unknown>[];
  const totalRows = text.split('\n').filter((l) => l.trim()).length - 1;
  return {
    rowCount: totalRows,
    sample: truncate(JSON.stringify(rows.slice(0, 20), null, 2)),
  };
}

async function parseXLSX(
  buffer: Buffer,
): Promise<{ rowCount: number; sample: string }> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  return {
    rowCount: rows.length,
    sample: truncate(JSON.stringify(rows.slice(0, 20), null, 2)),
  };
}

async function parsePDF(
  buffer: Buffer,
): Promise<{ rowCount: number; sample: string }> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  await parser.destroy();
  const fullText = textResult.text;
  const lines = fullText.split('\n').filter((l) => l.trim());
  return {
    rowCount: lines.length,
    sample: truncate(fullText),
  };
}

function parseJSON(
  buffer: Buffer,
): { rowCount: number; sample: string } {
  const text = buffer.toString('utf-8');
  const data = JSON.parse(text) as unknown;

  // GeoJSON FeatureCollection
  if (
    data &&
    typeof data === 'object' &&
    'type' in data &&
    (data as Record<string, unknown>).type === 'FeatureCollection' &&
    'features' in data &&
    Array.isArray((data as Record<string, unknown>).features)
  ) {
    const features = (data as { features: unknown[] }).features;
    return {
      rowCount: features.length,
      sample: truncate(JSON.stringify(features.slice(0, 10), null, 2)),
    };
  }

  // Plain array
  if (Array.isArray(data)) {
    return {
      rowCount: data.length,
      sample: truncate(JSON.stringify(data.slice(0, 20), null, 2)),
    };
  }

  // Single object
  return {
    rowCount: 1,
    sample: truncate(JSON.stringify(data, null, 2)),
  };
}

// ─── Inngest function ───────────────────────────────────────────
export const processUpload = inngest.createFunction(
  {
    id: 'process-upload',
    retries: 2,
    triggers: [{ event: 'upload/queued' }],
    onFailure: async ({ event, error }) => {
      const { failedJobs } = await import('../src/lib/schema');
      const { db } = await import('./_db');
      await db.insert(failedJobs).values({
        eventId: event.data.event.id || 'unknown',
        functionId: 'process-upload',
        payload: event.data.event.data,
        error: error.message,
      });
    },
  },
  async ({ event, step }) => {
    const { uploadId, orgId, filename, blobUrl } = event.data as {
      uploadId: string;
      orgId: string;
      filename: string;
      blobUrl: string;
    };

    // ── Step 1: Mark as processing ──────────────────────────
    await step.run('set-processing', async () => {
      await db
        .update(uploads)
        .set({ status: 'processing' })
        .where(eq(uploads.id, uploadId));
    });

    // ── Step 2: Fetch file from Vercel Blob ─────────────────
    const fileBase64 = await step.run('fetch-blob', async () => {
      const res = await fetch(blobUrl);
      if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
      const ab = await res.arrayBuffer();
      return Buffer.from(ab).toString('base64');
    });

    // ── Step 3: Parse file based on extension ───────────────
    const parsed = await step.run('parse-file', async () => {
      const buffer = Buffer.from(fileBase64, 'base64');
      const ext = getExtension(filename);

      switch (ext) {
        case 'csv':
          return parseCSV(buffer);
        case 'xlsx':
          return parseXLSX(buffer);
        case 'pdf':
          return parsePDF(buffer);
        case 'json':
        case 'geojson':
          return parseJSON(buffer);
        case 'zip':
          return {
            rowCount: 0,
            sample:
              '[Shapefile ZIP archive. Requires GDAL for full extraction.]',
          };
        default:
          return { rowCount: 0, sample: `[Unknown file type: .${ext}]` };
      }
    });

    // ── Step 4: Classify with OpenRouter → Gemini 2.0 Flash ─
    const classification = await step.run('classify-ai', async () => {
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY!,
      });

      const { object } = await generateObject<z.infer<typeof classificationSchema>>({
        model: openrouter.chat('x-ai/grok-4.1-fast') as any,
        schema: classificationSchema,
        prompt: [
          'You are a civic data analyst working for an Australian local government.',
          'Classify the following dataset sample.',
          '',
          `Filename: ${filename}`,
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
