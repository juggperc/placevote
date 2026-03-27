import { createClerkClient } from '@clerk/backend';
import { db } from './_db';
import { users } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * Shared Clerk client instance for Edge and Node runtimes.
 * Uses createClerkClient which is Edge-compatible (uses Web Crypto API).
 */
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

/**
 * Custom error class for auth failures with HTTP status codes.
 * Allows consistent error handling across Edge and Node runtimes.
 */
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

/**
 * Extracts the authorization header from both Edge (Request) and Node (VercelRequest) contexts.
 * Handles both standard Web API headers and Node.js-style headers.
 */
function getAuthHeader(req: Request | any): string | null {
  if (req.headers?.get) {
    // Edge/Web API Request
    return req.headers.get('Authorization');
  } else if (req.headers?.authorization) {
    // Node.js/VercelRequest
    return req.headers.authorization;
  }
  return null;
}

/**
 * Asserts that the incoming request contains a valid Clerk session 
 * and that the user truly belongs to the requested `orgId` within our Postgres database.
 * 
 * EDGE-COMPATIBLE: Uses createClerkClient().authenticateRequest() which works
 * in both Edge and Node.js runtimes without Node.js-specific dependencies.
 * 
 * @param req - The incoming request (Edge Request or VercelRequest)
 * @param orgId - The organization ID to validate access for
 * @returns The authenticated user record from the database
 * @throws AuthError with status and code for various failure scenarios
 */
export async function assertOrgAccess(req: Request | any, orgId: string) {
  const authHeader = getAuthHeader(req);

  if (!authHeader) {
    throw new AuthError(401, 'UNAUTHORIZED', 'Missing Authorization header');
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.replace('Bearer ', '');

  if (!token || token === authHeader) {
    throw new AuthError(401, 'UNAUTHORIZED', 'Invalid Authorization header format. Expected: Bearer <token>');
  }

  try {
    // Use authenticateRequest for Edge compatibility
    // This validates the JWT signature and extracts the session claims
    // Works in Edge runtime because it uses Web Crypto API instead of Node.js crypto
    const { isAuthenticated, toAuth } = await clerkClient.authenticateRequest(req, {
      // Optional: restrict to specific authorized parties (domains)
      // This helps prevent CSRF attacks
      authorizedParties: process.env.VERCEL_URL 
        ? [`https://${process.env.VERCEL_URL}`, `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`].filter(Boolean)
        : undefined,
      // Optional: use JWT key for offline verification (no network call needed)
      // jwtKey: process.env.CLERK_JWT_KEY,
    });

    if (!isAuthenticated) {
      throw new AuthError(401, 'UNAUTHORIZED', 'Invalid or expired authentication token');
    }

    const auth = toAuth();
    const clerkId = auth.userId;

    if (!clerkId) {
      throw new AuthError(401, 'INVALID_TOKEN', 'Token does not contain user ID');
    }

    // Fetch user from local database
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

    if (!user) {
      throw new AuthError(403, 'USER_NOT_FOUND', 'User does not exist in localized db');
    }

    if (user.orgId !== orgId) {
      throw new AuthError(403, 'FORBIDDEN', 'User does not have access to this organization');
    }

    return user;
  } catch (err: any) {
    // Re-throw AuthError instances
    if (err instanceof AuthError) {
      throw err;
    }
    
    // Log unexpected errors for debugging
    console.error('Auth middleware error:', err);
    
    // Wrap unknown errors
    throw new AuthError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
  }
}

/**
 * Alternative: Direct token verification using verifyToken (also Edge-compatible via createClerkClient)
 * This is useful when you have a raw token string rather than a full Request object.
 * 
 * @param token - The raw JWT token string
 * @returns The verified token claims
 */
export async function verifyAuthToken(token: string) {
  // Use the clerkClient's token verification
  const { verifyToken } = await import('@clerk/backend');
  
  try {
    const verified = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return verified;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new AuthError(401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
  }
}