import { createApp } from "./app.js";
import { migrate, openDatabase } from "./db.js";

const db = openDatabase();
migrate(db);

const app = createApp(db);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const server = app.listen(port, host, () => {
  console.log(`The Ink Trap listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
