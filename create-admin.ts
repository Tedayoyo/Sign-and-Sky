// Creates (or resets) an admin account and prints a one-time password.
// Usage: npm run create-admin -- you@example.org "Your Name"
import "./env";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../src/lib/db";

async function main() {
  const [emailRaw, ...nameParts] = process.argv.slice(2);
  const email = (emailRaw || "").trim().toLowerCase();
  const name = nameParts.join(" ").trim() || email.split("@")[0];
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run create-admin -- you@example.org "Your Name"');
    process.exit(1);
  }
  const password = crypto.randomBytes(12).toString("base64url");
  const hash = await bcrypt.hash(password, 12);
  const db = pool();
  await db.query(
    `insert into profiles (email, full_name, role, password_hash) values ($1, $2, 'admin', $3)
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin', is_active = true`,
    [email, name, hash],
  );
  console.log(`Admin ready: ${email}`);
  console.log(`One-time password: ${password}`);
  console.log("Sign in at /en/research and change it under “My account”.");
  await db.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
