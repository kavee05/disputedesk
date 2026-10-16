import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config";
import * as schema from "./schema";

// Tables are created with plain DDL on first use, so setup is a single
// command and there is no separate migration step for judges to run.
const DDL = `
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  data TEXT NOT NULL,
  raw TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence_bundles (
  case_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_runs_case ON agent_runs(case_id, created_at);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  case_id TEXT,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_case ON audit_log(case_id, id);
CREATE TABLE IF NOT EXISTS policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sim_store (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
`;

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __dd_sqlite?: Database.Database; __dd_db?: Db };

export function sqlite(): Database.Database {
  if (!globalForDb.__dd_sqlite) {
    if (config.databasePath !== ":memory:") mkdirSync(dirname(config.databasePath), { recursive: true });
    const conn = new Database(config.databasePath);
    conn.pragma("journal_mode = WAL");
    conn.exec(DDL);
    globalForDb.__dd_sqlite = conn;
  }
  return globalForDb.__dd_sqlite;
}

export function db(): Db {
  if (!globalForDb.__dd_db) globalForDb.__dd_db = drizzle(sqlite(), { schema });
  return globalForDb.__dd_db;
}

export const now = () => new Date().toISOString();
