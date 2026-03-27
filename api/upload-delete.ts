import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './_db.js';
import { uploads } from '../src/lib/schema.js';
import { assertOrgAccess } from './_middleware.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = z.string().uuid().safeParse(req.query.id);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid upload id' });
  }
  const id = parseResult.data;

  try {
    const [upload] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, id));

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    await assertOrgAccess(req, upload.orgId);

    try {
      if (!upload.blobUrl.startsWith('inline://')) {
        await del(upload.blobUrl);
      }
    } catch {
      console.warn('Blob deletion failed (may already be gone):', upload.blobUrl);
    }

    await db.delete(uploads).where(eq(uploads.id, id));

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Delete upload error:', err);
    if (err?.status && err?.code) {
      return res.status(err.status).json({ code: err.code, error: err.message });
    }
    return res.status(500).json({ error: 'Failed to delete upload' });
  }
}
