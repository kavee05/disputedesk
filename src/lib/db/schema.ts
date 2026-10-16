import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // "sandbox" | "simulated"
  data: text("data").notNull(), // normalised Case JSON
  raw: text("raw").notNull(), // PayPal dispute JSON exactly as received
  syncedAt: text("synced_at").notNull(),
});

export const evidenceBundles = sqliteTable("evidence_bundles", {
  caseId: text("case_id").primaryKey(),
  data: text("data").notNull(),
  createdAt: text("created_at").notNull(),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  createdAt: text("created_at").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  data: text("data").notNull(),
  status: text("status").notNull(),
  draftText: text("draft_text").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: text("at").notNull(),
  caseId: text("case_id"),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  data: text("data").notNull(),
});

export const policy = sqliteTable("policy", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),
});

export const simStore = sqliteTable(
  "sim_store",
  {
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    data: text("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.id] })],
);
