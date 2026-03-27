import { jwtVerify, createRemoteJWKSet } from 'jose';
import { db } from './_db.js';
import { users } from '../src/lib/schema.js';
import { eq } from 'drizzle-orm';

const CLERK_JWKS_URL = 'https://api.clerk.com/v1/jwks';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(CLERK_JWKS_URL), {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });
  }
  return jwks;
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

function getAuthHeader(req: Request | any): string | null {
  if (req.headers?.get) {
    return req.headers.get('Authorization');
  } else if (req.headers?.authorization) {
    return req.headers.authorization;
  }
  return null;
}

export async function assertOrgAccess(req: Request | any, orgId: string) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    throw new AuthError(401, 'UNAUTHORIZED', 'Missing Authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token || token === authHeader) {
    throw new AuthError(401, 'UNAUTHORIZED', 'Invalid Authorization header format. Expected: Bearer <token>');
  }

  try {
    const { payload } = await jwtVerify(token, getJWKS());

    const clerkId = payload.sub as string | undefined;

    if (!clerkId) {
      throw new AuthError(401, 'INVALID_TOKEN', 'Token does not contain user ID');
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

    if (!user) {
      throw new AuthError(403, 'USER_NOT_FOUND', 'User does not exist in localized db');
    }

    if (user.orgId !== orgId) {
      throw new AuthError(403, 'FORBIDDEN', 'User does not have access to this organization');
    }

    return user;
  } catch (err: any) {
    if (err instanceof AuthError) {
      throw err;
    }
    
    console.error('Auth middleware error:', err);
    
    throw new AuthError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
  }
}

export async function verifyAuthToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJWKS());
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new AuthError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
  }
}