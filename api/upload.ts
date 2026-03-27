import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { db } from './_db';
import { uploads } from '../src/lib/schema';
import { inngest } from './_inngest';

import { z } from 'zod';
import { assertOrgAccess } from './_middleware';
import { uploadRatelimit } from './_ratelimit';

/** Map file extension → detected_type label */
function detectFileType(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    csv: 'csv',
    xlsx: 'xlsx',
    pdf: 'pdf',
    json: 'json',
    geojson: 'geojson',
    zip: 'shapefile',
  };
  return ext ? map[ext] ?? null : null;
}

export const config = {
  api: { bodyParser: false },
};

const uploadSchema = z.object({
  filename: z.string().min(1),
  orgId: z.string().uuid(),
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawFilename = req.query.filename as string;
    const rawOrgId = req.query.orgId as string;

    const parseResult = uploadSchema.safeParse({ filename: rawFilename, orgId: rawOrgId });
    if (!parseResult.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', error: 'Invalid metadata' });
    }

    const { filename, orgId } = parseResult.data;

    await assertOrgAccess(req, orgId);

    if (uploadRatelimit) {
      const { success } = await uploadRatelimit.limit(req.headers.authorization || req.socket.remoteAddress || 'anon');
      if (!success) {
        return res.status(429).json({ code: 'RATE_LIMITED', error: 'Upload limit exceeded' });
      }
    }

    // ── 1. Stream file to Vercel Blob ──────────────────────────
    const blob = await put(`uploads/${orgId}/${filename}`, req, {
      access: 'public',
    });

    // ── 2. Insert row into uploads table ───────────────────────
    const detectedType = detectFileType(filename);

    const [upload] = await db
      .insert(uploads)
      .values({
        orgId,
        filename,
        blobUrl: blob.url,
        status: 'queued',
        detectedType,
      })
      .returning();

    // ── 3. Emit Inngest event (best-effort) ────────────────────
    try {
      await inngest.send({
        name: 'upload/queued',
        data: {
          uploadId: upload.id,
          orgId,
          filename,
          blobUrl: blob.url,
          detectedType,
        },
      });
    } catch {
      // Don't block the upload if Inngest isn't configured yet
      console.warn('Inngest event emission failed (is INNGEST_EVENT_KEY set?)');
    }

    return res.status(201).json(upload);
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
