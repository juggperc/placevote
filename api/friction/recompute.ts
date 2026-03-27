import type { VercelRequest, VercelResponse } from '@vercel/node';
import { inngest } from '../_inngest';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId } = req.body || {};
  if (!orgId) {
    return res.status(400).json({ error: 'Missing orgId' });
  }

  try {
    // Manually trigger a recompute event
    await inngest.send({
      name: 'friction/recompute',
      data: { orgId },
    });

    return res.status(200).json({ success: true, message: 'Friction compute workflow triggered successfully' });
  } catch (err) {
    console.error('Friction Recompute API error:', err);
    return res.status(500).json({ error: 'Failed to trigger recomputation' });
  }
}
