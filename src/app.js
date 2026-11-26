import express from "express";
import { appStatus } from "./db.js";
import { renderHome } from "./views/home.js";

export function createApp(db) {
  if (!db) {
    throw new Error("createApp requires a database");
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.get("/health", (_req, res) => {
    const status = appStatus(db);
    res
      .status(status.ok ? 200 : 503)
      .set("Cache-Control", "no-store")
      .json({
        ok: status.ok,
        database: status.database,
        app: "the-ink-trap",
      });
  });

  app.get("/", (_req, res) => {
    const status = appStatus(db);
    res
      .status(status.ok ? 200 : 503)
      .set("Cache-Control", "no-store")
      .type("html")
      .send(renderHome(status));
  });

  return app;
}
