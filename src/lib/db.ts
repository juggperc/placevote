import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Neon serverless Postgres connection via HTTP.
 *
 * Usage (from Vercel serverless functions / API routes):
 *   import { db } from '@/lib/db';
 *   const rows = await db.select().from(schema.orgs);
 *
 * Requires DATABASE_URL in environment variables.
 */
const sql = neon(import.meta.env.VITE_DATABASE_URL ?? process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
