import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, desc } from 'drizzle-orm';
import { db } from './_db';
import { uploads } from '../src/lib/schema';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orgId = req.query.orgId as string;

    if (!orgId) {
      return res.status(400).json({ error: 'Missing orgId query parameter' });
    }

    const rows = await db
      .select()
      .from(uploads)
      .where(eq(uploads.orgId, orgId))
      .orderBy(desc(uploads.createdAt));

    return res.status(200).json(rows);
  } catch (err) {
    console.error('List uploads error:', err);
    return res.status(500).json({ error: 'Failed to list uploads' });
  }
}
