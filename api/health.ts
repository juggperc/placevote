import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_db.js';
import { sql } from 'drizzle-orm';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const start = Date.now();
  let dbStatus = 'disconnected';

  try {
    // Ping DB natively using SQL template tagging ensuring simple test logic
    const { rows } = await db.execute(sql`SELECT 1 AS ping`) as any;
    if (rows && rows[0]?.ping === 1) {
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error';
    console.error('Healthcheck DB Ping Error:', error);
  }

  const latency = Date.now() - start;

  return res.status(dbStatus === 'connected' ? 200 : 503).json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    latencyMs: latency,
    dbStatus,
    timestamp: new Date().toISOString(),
  });
}
