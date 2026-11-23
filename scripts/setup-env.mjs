import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const example = readFileSync(".env.example", "utf8");
const secret = () => randomBytes(36).toString("base64url");
const contents = example
  .replace("ADMIN_PASSWORD=\n", `ADMIN_PASSWORD=${secret()}\n`)
  .replace("SESSION_SECRET=\n", `SESSION_SECRET=${secret()}\n`)
  .replace("CRON_SECRET=\n", `CRON_SECRET=${secret()}\n`);

try {
  writeFileSync(".env.local", contents, { flag: "wx", mode: 0o600 });
  console.log("Created .env.local with a generated admin password and secrets.");
} catch (error) {
  if (error.code !== "EEXIST") throw error;
  console.log(".env.local already exists.");
}
