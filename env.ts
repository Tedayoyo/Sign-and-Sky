// Load .env.local / .env for command-line scripts (Next.js loads them itself for the website).
import fs from "node:fs";
for (const f of [".env.local", ".env"]) {
  if (fs.existsSync(f)) {
    try {
      process.loadEnvFile(f);
    } catch {}
  }
}
