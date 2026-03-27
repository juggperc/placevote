import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db } from './_db.js';
import { orgs } from '../src/lib/schema.js';
import { assertOrgAccess } from './_middleware.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const orgId = req.query.orgId as string;

  if (!orgId) {
    return res.status(400).json({ error: 'Organization ID is required' });
  }

  try {
    const user = await assertOrgAccess(req, orgId);

    if (req.method === 'PATCH' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    if (req.method === 'GET') {
      const [org] = await db
        .select({
          id: orgs.id,
          name: orgs.name,
          aiModel: orgs.aiModel,
          openrouterApiKey: orgs.openrouterApiKey,
        })
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const maskedApiKey = org.openrouterApiKey
        ? `••••••••${org.openrouterApiKey.slice(-4)}`
        : null;

      return res.status(200).json({
        ...org,
        openrouterApiKey: maskedApiKey,
        hasApiKey: !!org.openrouterApiKey,
      });
    }

    const { aiModel, openrouterApiKey } = req.body || {};
    const updateData: { aiModel?: string | null; openrouterApiKey?: string | null } = {};

    if (aiModel !== undefined) {
      if (typeof aiModel !== 'string') {
        return res.status(400).json({ error: 'aiModel must be a string' });
      }
      updateData.aiModel = aiModel || null;
    }

    if (openrouterApiKey !== undefined) {
      if (typeof openrouterApiKey !== 'string') {
        return res.status(400).json({ error: 'openrouterApiKey must be a string' });
      }
      updateData.openrouterApiKey = openrouterApiKey || null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const [updatedOrg] = await db
      .update(orgs)
      .set(updateData as any)
      .where(eq(orgs.id, orgId))
      .returning({
        id: orgs.id,
        name: orgs.name,
        aiModel: orgs.aiModel,
        openrouterApiKey: orgs.openrouterApiKey,
      });

    if (!updatedOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const maskedApiKey = updatedOrg.openrouterApiKey
      ? `••••••••${updatedOrg.openrouterApiKey.slice(-4)}`
      : null;

    return res.status(200).json({
      ...updatedOrg,
      openrouterApiKey: maskedApiKey,
      hasApiKey: !!updatedOrg.openrouterApiKey,
    });
  } catch (error: any) {
    console.error('Org settings API error:', error);
    if (error?.status && error?.code) {
      return res.status(error.status).json({ code: error.code, error: error.message });
    }
    if (error?.status) {
      return res.status(error.status).json({ error: error.error });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
