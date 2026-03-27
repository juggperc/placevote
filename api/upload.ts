import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db } from './_db.js';
import { uploads } from '../src/lib/schema.js';
import { inngest } from './_inngest.js';

import { z } from 'zod';
import { assertOrgAccess } from './_middleware.js';
import { uploadRatelimit } from './_ratelimit.js';
import { detectFileType, parseUploadBuffer } from './_upload-preview.js';

export const config = {
  runtime: 'nodejs',
  api: { bodyParser: false },
};

const uploadSchema = z.object({
  filename: z.string().min(1),
  orgId: z.string().uuid(),
});

function getContentType(req: VercelRequest): string | undefined {
  const header = req.headers['content-type'];
  return Array.isArray(header) ? header[0] : header;
}

async function readRequestBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function buildInlineBlobUrl(orgId: string, filename: string): string {
  return `inline://uploads/${orgId}/${encodeURIComponent(filename)}`;
}

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

    const fileBuffer = await readRequestBody(req);
    if (fileBuffer.length === 0) {
      return res.status(400).json({ code: 'EMPTY_UPLOAD', error: 'Uploaded file was empty' });
    }

    let preview = {
      rowCount: 0,
      sample: `[Unable to parse ${filename}]`,
    };

    try {
      preview = await parseUploadBuffer(fileBuffer, filename);
    } catch (error) {
      console.warn('Upload preview parsing failed, continuing with fallback preview:', error);
    }

    let blobUrl = buildInlineBlobUrl(orgId, filename);

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${orgId}/${filename}`, fileBuffer, {
          access: 'public',
          addRandomSuffix: true,
          contentType: getContentType(req),
        });
        blobUrl = blob.url;
      } catch (error) {
        console.warn('Blob upload failed, continuing with inline preview fallback:', error);
      }
    }

    // ── 2. Insert row into uploads table ───────────────────────
    const detectedType = detectFileType(filename);

    const [upload] = await db
      .insert(uploads)
      .values({
        orgId,
        filename,
        blobUrl,
        status: 'queued',
        detectedType,
        rowCount: preview.rowCount,
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
          blobUrl,
          detectedType,
          rowCount: preview.rowCount,
          sample: preview.sample,
        },
      });
    } catch (error) {
      console.warn('Inngest event emission failed; marking upload as error:', error);
      await db
        .update(uploads)
        .set({ status: 'error' })
        .where(eq(uploads.id, upload.id));
      upload.status = 'error';
    }

    return res.status(201).json(upload);
  } catch (err: any) {
    console.error('Upload error:', err);
    if (err?.status && err?.code) {
      return res.status(err.status).json({ code: err.code, error: err.message });
    }
    return res.status(500).json({ error: 'Upload failed' });
  }
}
