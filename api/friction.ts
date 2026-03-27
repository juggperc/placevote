import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq, desc } from 'drizzle-orm';
import { db } from './_db.js';
import { frictionScores } from '../src/lib/schema.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orgId = req.query.orgId as string;
  if (!orgId) {
    return res.status(400).json({ error: 'Missing orgId query parameter' });
  }

  try {
    const scores = await db
      .select({
        id: frictionScores.id,
        suburbName: frictionScores.suburbName,
        sa2Code: frictionScores.sa2Code,
        score: frictionScores.score,
        topIssues: frictionScores.topIssues,
        signalCount: frictionScores.signalCount,
        updatedAt: frictionScores.updatedAt,
      })
      .from(frictionScores)
      .where(eq(frictionScores.orgId, orgId))
      .orderBy(desc(frictionScores.score));

    return res.status(200).json({ scores });
  } catch (err) {
    console.error('Friction API GET error:', err);
    return res.status(500).json({ error: 'Failed to retrieve friction scores' });
  }
}
