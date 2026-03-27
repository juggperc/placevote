import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { db } from './_db.js';
import { orgs, users } from '../src/lib/schema.js';
import { verifyAuthToken } from './_middleware.js';

type BootstrapBody = {
  email?: unknown;
  displayName?: unknown;
  avatarUrl?: unknown;
  organizationName?: unknown;
  organizationSlug?: unknown;
  role?: unknown;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function coerceRole(value: unknown): 'admin' | 'member' | 'viewer' {
  return value === 'member' || value === 'viewer' ? value : 'admin';
}

function getWorkspaceName(body: BootstrapBody): string {
  const organizationName = asOptionalString(body.organizationName);
  if (organizationName) return organizationName;

  const displayName = asOptionalString(body.displayName);
  if (displayName) return `${displayName}'s Workspace`;

  const email = asOptionalString(body.email);
  if (email) {
    return `${email.split('@')[0]}'s Workspace`;
  }

  return 'Placevote Workspace';
}

function getBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim() || null;
}

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Missing Authorization header' });
    }

    const payload = await verifyAuthToken(token);
    const clerkId = payload.sub as string | undefined;

    if (!clerkId) {
      return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Token does not contain user ID' });
    }

    const body = (req.body || {}) as BootstrapBody;
    const email = asOptionalString(body.email) ?? `${clerkId}@clerk.local`;
    const displayName = asOptionalString(body.displayName) ?? email.split('@')[0] ?? 'Placevote User';
    const avatarUrl = asOptionalString(body.avatarUrl);
    const requestedSlug = asOptionalString(body.organizationSlug);

    let [user] = await db
      .select({
        id: users.id,
        orgId: users.orgId,
        role: users.role,
      })
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    let [organization] = user
      ? await db
          .select({
            id: orgs.id,
            name: orgs.name,
          })
          .from(orgs)
          .where(eq(orgs.id, user.orgId))
          .limit(1)
      : [];

    if (!organization) {
      const workspaceName = getWorkspaceName(body);
      [organization] = await db
        .insert(orgs)
        .values({
          name: workspaceName,
        })
        .returning({
          id: orgs.id,
          name: orgs.name,
        });
    }

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          clerkId,
          orgId: organization.id,
          role: coerceRole(body.role),
        })
        .returning({
          id: users.id,
          orgId: users.orgId,
          role: users.role,
        });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email,
        displayName,
        avatarUrl,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: requestedSlug ?? slugify(organization.name),
      },
    });
  } catch (error: any) {
    console.error('Bootstrap API error:', error);
    if (error?.status && error?.code) {
      return res.status(error.status).json({ code: error.code, error: error.message });
    }

    return res.status(500).json({ error: 'Failed to initialize workspace' });
  }
}
