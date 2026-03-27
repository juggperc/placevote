import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db } from './_db.js';
import { ontologyNodes, ontologyEdges } from '../src/lib/schema.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const orgId = req.query.orgId as string;

  if (!orgId) {
    return res.status(400).json({ error: 'Missing orgId query parameter' });
  }

  // GET: Fetch the current ontology for the org
  if (req.method === 'GET') {
    try {
      const nodes = await db
        .select()
        .from(ontologyNodes)
        .where(eq(ontologyNodes.orgId, orgId));

      const edges = await db
        .select()
        .from(ontologyEdges)
        .where(eq(ontologyEdges.orgId, orgId));

      return res.status(200).json({ nodes, edges });
    } catch (err) {
      console.error('Fetch ontology error:', err);
      return res.status(500).json({ error: 'Failed to fetch ontology' });
    }
  }

  // DELETE: Clear all ontology data for the org
  if (req.method === 'DELETE') {
    try {
      // First delete all edges
      await db.delete(ontologyEdges).where(eq(ontologyEdges.orgId, orgId));
      
      // Then delete all nodes
      await db.delete(ontologyNodes).where(eq(ontologyNodes.orgId, orgId));

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Clear ontology error:', err);
      return res.status(500).json({ error: 'Failed to clear ontology data' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
