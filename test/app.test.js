import assert from "node:assert/strict";
import { once } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createApp } from "../src/app.js";
import { migrate, openDatabase } from "../src/db.js";

function listeningServer(db) {
  const app = createApp(db);
  const server = app.listen(0, "127.0.0.1");
  return once(server, "listening").then(() => server);
}

test("migrations apply once and record the scaffold", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inktrap-"));
  const db = openDatabase(path.join(dir, "bookstore.sqlite"));
  try {
    migrate(db);
    migrate(db);
    const applied = db.prepare("SELECT id FROM schema_migrations ORDER BY id").all();
    assert.deepEqual(
      applied.map((row) => row.id),
      ["001_app.sql", "002_schema.sql", "003_sample_books.sql"],
    );
    const meta = db.prepare("SELECT value FROM app_meta WHERE key = 'app'").get();
    assert.equal(meta.value, "the-ink-trap");
  } finally {
    db.close();
  }
});

test("home page and health check report a connected database", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const server = await listeningServer(db);
  const { port } = server.address();
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    const html = await home.text();
    assert.match(html, /The Ink Trap/);
    assert.match(html, /Database connected/);

    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      ok: true,
      database: "connected",
      app: "the-ink-trap",
    });
  } finally {
    server.close();
    db.close();
  }
});

test("health check fails when the database has not been migrated", async () => {
  const db = openDatabase(":memory:");
  const server = await listeningServer(db);
  const { port } = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 503);
    const body = await health.json();
    assert.equal(body.ok, false);
    assert.equal(body.database, "unavailable");
  } finally {
    server.close();
    db.close();
  }
});
