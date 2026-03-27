import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { db } from '../_db';
import { uploads } from '../../src/lib/schema';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const id = req.query.id as string;

    if (!id) {
      return res.status(400).json({ error: 'Missing upload id' });
    }

    // ── 1. Find the upload row ─────────────────────────────────
    const [upload] = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, id));

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // ── 2. Delete from Vercel Blob ─────────────────────────────
    try {
      await del(upload.blobUrl);
    } catch {
      console.warn('Blob deletion failed (may already be gone):', upload.blobUrl);
    }

    // ── 3. Delete from DB ──────────────────────────────────────
    await db.delete(uploads).where(eq(uploads.id, id));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete upload error:', err);
    return res.status(500).json({ error: 'Failed to delete upload' });
  }
}
