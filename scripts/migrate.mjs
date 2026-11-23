import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import process from "node:process";
import pg from "pg";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const migrationUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!migrationUrl) {
  console.error("Set DATABASE_MIGRATION_URL or DATABASE_URL before running migrations.");
  process.exit(1);
}

const connection = new URL(migrationUrl);
if (connection.hostname.endsWith(".supabase.com") && connection.port === "6543") {
  console.error("Use the Supabase session pooler or direct connection in DATABASE_MIGRATION_URL.");
  process.exit(1);
}
const ca = process.env.DATABASE_CA_CERT?.replaceAll("\\n", "\n");
if (ca) connection.searchParams.delete("sslmode");

const client = new pg.Client({
  connectionString: connection.toString(),
  ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
});

try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(1837012672)");
  await client.query("CREATE SCHEMA IF NOT EXISTS studio");
  await client.query("REVOKE ALL ON SCHEMA studio FROM PUBLIC");
  await client.query(`
    CREATE TABLE IF NOT EXISTS studio.schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const applied = new Set((await client.query("SELECT filename FROM studio.schema_migrations")).rows.map((row) => row.filename));
  const directory = new URL("../db/migrations/", import.meta.url);
  for (const filename of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) {
    if (applied.has(filename)) continue;
    const sql = await readFile(new URL(filename, directory), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO studio.schema_migrations(filename) VALUES ($1)", [filename]);
      await client.query("COMMIT");
      console.log(`Applied ${filename}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
  console.log("Database is up to date.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
} finally {
  await client.end();
}
