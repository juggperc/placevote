import { verifyToken } from '@clerk/backend';
import { db } from './_db';
import { users } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * Asserts that the incoming request contains a valid Clerk session 
 * and that the user truly belongs to the requested `orgId` within our Postgres database.
 */
export async function assertOrgAccess(req: Request | any, orgId: string) {
  // Edge Request has req.headers.get, Node Request has req.headers
  const authHeader = req.headers?.get
    ? req.headers.get('Authorization')
    : req.headers?.authorization;

  if (!authHeader) {
    throw { status: 401, code: 'UNAUTHORIZED', error: 'Missing Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkId = verified.sub;

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

    if (!user) {
      throw { status: 403, code: 'USER_NOT_FOUND', error: 'User does not exist in localized db' };
    }

    if (user.orgId !== orgId) {
      throw { status: 403, code: 'FORBIDDEN', error: 'User does not have access to this organization' };
    }

    return user;
  } catch (err: any) {
    if (err.status) throw err;
    throw { status: 401, code: 'INVALID_TOKEN', error: 'Invalid or expired authentication token' };
  }
}
