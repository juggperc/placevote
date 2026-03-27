import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  varchar,
  unique,
} from 'drizzle-orm/pg-core';

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  aiModel: varchar('ai_model', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Users ───────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull(),
  role: varchar('role', { length: 32 }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Uploads ─────────────────────────────────────────────────────
export const uploads = pgTable('uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull(),
  filename: text('filename').notNull(),
  blobUrl: text('blob_url').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  detectedType: varchar('detected_type', { length: 64 }),
  rowCount: integer('row_count'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Ontology Nodes ──────────────────────────────────────────────
export const ontologyNodes = pgTable(
  'ontology_nodes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .references(() => orgs.id, { onDelete: 'cascade' })
      .notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    label: text('label').notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique('ontology_nodes_org_type_label_unq').on(t.orgId, t.type, t.label)]
);

// ─── Ontology Edges ──────────────────────────────────────────────
export const ontologyEdges = pgTable('ontology_edges', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull(),
  sourceId: uuid('source_id')
    .references(() => ontologyNodes.id, { onDelete: 'cascade' })
    .notNull(),
  targetId: uuid('target_id')
    .references(() => ontologyNodes.id, { onDelete: 'cascade' })
    .notNull(),
  label: text('label').notNull(),
  weight: real('weight').default(1.0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Friction Scores ─────────────────────────────────────────────
export const frictionScores = pgTable('friction_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull(),
  suburbName: text('suburb_name').notNull(),
  sa2Code: varchar('sa2_code', { length: 16 }).notNull(),
  score: real('score').notNull(),
  topIssues: jsonb('top_issues').$type<string[]>(),
  signalCount: integer('signal_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Failed Jobs (Inngest Dead-letter) ───────────────────────────
export const failedJobs = pgTable('failed_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull(),
  functionId: text('function_id').notNull(),
  payload: jsonb('payload'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
