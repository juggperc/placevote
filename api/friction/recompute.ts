import type { VercelRequest, VercelResponse } from '@vercel/node';
import { inngest } from '../_inngest.js';
import { z } from 'zod';
import { assertOrgAccess } from '../_middleware.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = z.object({ orgId: z.string().uuid() }).safeParse(req.body || {});
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid orgId' });
  }
  const { orgId } = parseResult.data;

  try {
    await assertOrgAccess(req, orgId);

    // Manually trigger a recompute event
    await inngest.send({
      name: 'friction/recompute',
      data: { orgId },
    });

    return res.status(200).json({ success: true, message: 'Friction compute workflow triggered successfully' });
  } catch (err: any) {
    console.error('Friction Recompute API error:', err);
    if (err?.status && err?.code) {
      return res.status(err.status).json({ code: err.code, error: err.message });
    }
    return res.status(500).json({ error: 'Failed to trigger recomputation' });
  }
}
