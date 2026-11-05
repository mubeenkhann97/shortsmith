// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const migration = readFileSync(new URL("../../prisma/migrations/20261013120000_add_service_statuses/migration.sql", import.meta.url), "utf8");
const cleanup = readFileSync(new URL("../../prisma/migrations/20261105120000_clear_upstream_download_incident/migration.sql", import.meta.url), "utf8");

describe("service status migration", () => {
  let db: PGlite;
  beforeAll(async () => { db = new PGlite(); await db.exec(migration); });
  afterAll(async () => { await db.close(); });

  it("seeds degraded downloads and preserves an operator's resolution when reapplied", async () => {
    expect((await db.query("SELECT id, status FROM service_statuses")).rows).toEqual([{ id: "video-downloads", status: "degraded" }]);
    await db.exec("UPDATE service_statuses SET status = 'operational', headline = 'Resolved', description = 'Downloads are working normally.', updated_at = CURRENT_TIMESTAMP WHERE id = 'video-downloads'");
    await db.exec(migration);
    expect((await db.query("SELECT status, headline FROM service_statuses")).rows).toEqual([{ status: "operational", headline: "Resolved" }]);
  });

  it("rejects unsupported status values", async () => {
    await expect(db.exec("UPDATE service_statuses SET status = 'typo' WHERE id = 'video-downloads'")).rejects.toThrow();
  });
});

describe("upstream incident cleanup migration", () => {
  it("resolves the inherited incident but keeps one an admin has edited", async () => {
    const db = new PGlite();
    await db.exec(migration);
    await db.exec(cleanup);
    expect((await db.query("SELECT status, headline FROM service_statuses")).rows).toEqual([{ status: "operational", headline: "Operational" }]);

    await db.exec("UPDATE service_statuses SET status = 'degraded', headline = 'Slow imports' WHERE id = 'video-downloads'");
    await db.exec(cleanup);
    expect((await db.query("SELECT status, headline FROM service_statuses")).rows).toEqual([{ status: "degraded", headline: "Slow imports" }]);
    await db.close();
  }, 20_000); // a fresh in-memory database
});
