import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dict } from "@/lib/i18n";
import { currentUser } from "@/lib/auth";
import { login } from "../actions";
import { Flash } from "@/components/ResearchNav";
import { dbStatus } from "@/lib/dbstatus";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Login({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ e?: string; ok?: string }> }) {
  const { lang } = await params;
  const { e, ok } = await searchParams;
  const r = dict(lang).research;
  if (await currentUser()) redirect(`/${lang}/research`);
  const down = await dbStatus();
  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <header className="page-head">
        <h1>{r.title}</h1>
      </header>
      {down ? (
        <p className="alert error" role="alert">
          {r.dbDown} <strong>{down}</strong>
        </p>
      ) : (
        <Flash error={e === "locked" ? r.locked : e === "db" ? r.dbDown : e ? r.badLogin : null} ok={ok === "password" ? r.passwordChanged : null} />
      )}
      <form action={login} className="stack">
        <input type="hidden" name="lang" value={lang} />
        <div>
          <label htmlFor="email">{r.email}</label>
          <input id="email" name="email" type="email" required autoComplete="username" />
        </div>
        <div>
          <label htmlFor="password">{r.password}</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn" type="submit">{r.signIn}</button>
      </form>
    </main>
  );
}
