import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "..", "migrations");

export function defaultDatabasePath() {
  return path.join(import.meta.dirname, "..", "data", "bookstore.sqlite");
}

export function openDatabase(dbPath = process.env.DB_PATH || defaultDatabasePath()) {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare("SELECT id FROM schema_migrations")
      .all()
      .map((row) => row.id),
  );
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const record = db.prepare("INSERT INTO schema_migrations (id) VALUES (?)");

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      record.run(file);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

export function appStatus(db) {
  try {
    const row = db.prepare("SELECT value FROM app_meta WHERE key = 'app'").get();
    if (row?.value !== "the-ink-trap") {
      return { ok: false, database: "unavailable" };
    }
    return { ok: true, database: "connected", app: row.value };
  } catch {
    return { ok: false, database: "unavailable" };
  }
}
