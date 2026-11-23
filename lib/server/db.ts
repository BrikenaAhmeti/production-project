import "server-only";
import pg, { type PoolClient, type QueryResultRow } from "pg";

const globalDb = globalThis as typeof globalThis & { studioPool?: pg.Pool };

function pool() {
  if (globalDb.studioPool) return globalDb.studioPool;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing.");

  const connection = new URL(process.env.DATABASE_URL);
  const ca = process.env.DATABASE_CA_CERT?.replaceAll("\\n", "\n");
  if (ca) connection.searchParams.delete("sslmode");

  const database = new pg.Pool({
    connectionString: connection.toString(),
    ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}),
    max: 4,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    query_timeout: 12000,
  });
  database.on("error", () => console.error("An idle studio database connection failed."));
  globalDb.studioPool = database;
  return database;
}

export function query<Row extends QueryResultRow = QueryResultRow>(statement: string, values: unknown[] = []) {
  return pool().query<Row>(statement, values);
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool().connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
