import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db.js';
import { uploads, ontologyNodes, frictionScores } from '../../src/lib/schema.js';
import { eq, sql } from 'drizzle-orm';
import { assertOrgAccess } from '../_middleware.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await assertOrgAccess(req, req.query.orgId as string);

    // Verify Clerk "admin" role
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const orgId = req.query.orgId as string;

    const [[uploadCountRes], [nodeCountRes], [frictionStatsRes]] = await Promise.all([
      db.select({ count: sql`count(*)`.mapWith(Number) })
        .from(uploads).where(eq(uploads.orgId, orgId)),

      db.select({ count: sql`count(*)`.mapWith(Number) })
        .from(ontologyNodes).where(eq(ontologyNodes.orgId, orgId)),
        
      db.select({ 
          count: sql`count(*)`.mapWith(Number),
          latest: sql`max(${frictionScores.updatedAt})`
        })
        .from(frictionScores).where(eq(frictionScores.orgId, orgId))
    ]);

    return res.status(200).json({
      uploads: uploadCountRes?.count || 0,
      nodes: nodeCountRes?.count || 0,
      frictionComputes: frictionStatsRes?.count || 0,
      lastFrictionUpdate: frictionStatsRes?.latest || null,
      status: 'active'
    });

  } catch (error: any) {
    console.error('Admin API error:', error);
    if (error?.status && error?.code) {
      return res.status(error.status).json({ code: error.code, error: error.message });
    }
    if (error.status) return res.status(error.status).json({ error: error.error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
