import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/schema';

/**
 * Shared Neon/Drizzle connection for Vercel serverless functions.
 * Uses process.env (Node.js runtime) instead of import.meta.env.
 */
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
