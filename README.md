# The Ink Trap

Book Store Management staff app. Sprint 1 starts here: a running app, a database, and a staging deploy.

## Stack

- Node.js 24
- Express
- SQLite, through Node's built-in `node:sqlite`

The staging server is Apache. It proxies the site to this app. SQLite is a file on that server (`data/bookstore.sqlite`), so a deploy does not need a separate database to be created first.

## Local

Requires Node.js 24.

```bash
npm install
npm test
npm start
```

Open http://127.0.0.1:3000

`GET /health` returns `{"ok":true,"database":"connected","app":"the-ink-trap"}` when migrations have run.

`PORT`, `HOST`, and `DB_PATH` override the defaults (`3000`, `127.0.0.1`, and `data/bookstore.sqlite`).

The tables are staff, books, sales, and sale items. Prices are integer cents. The diagram and the rules are in `docs/schema.md`. Migrations load 50 sample titles.

## Staging

A push to `main` runs the tests. If they pass, GitHub Actions runs `scripts/vps-deploy.sh` on the VPS. That script installs Node 24 when the server does not already have it, installs dependencies, restarts the app, and checks `/health` before reloading Apache.
