import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { Flash, ResearchNav } from "@/components/ResearchNav";
import { changePassword } from "../actions";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Account({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ e?: string }> }) {
  const { lang } = await params;
  const { e } = await searchParams;
  const d = dict(lang);
  const r = d.research;
  const user = await requireUser(lang);
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={user} current="account" />
      <h1>{r.account}</h1>
      <p>
        {user.full_name} · {user.email} · {r.roles[user.role]}
      </p>
      <Flash error={e === "wrong" ? r.passwordWrong : e === "rules" ? r.passwordRules : null} />
      <form action={changePassword} className="stack" style={{ maxWidth: 420 }}>
        <input type="hidden" name="lang" value={lang} />
        <h2>{r.changePassword}</h2>
        <div>
          <label htmlFor="cur">{r.currentPassword}</label>
          <input id="cur" name="current_password" type="password" required autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="new">{r.newPassword}</label>
          <input id="new" name="new_password" type="password" required minLength={10} autoComplete="new-password" />
        </div>
        <button className="btn" type="submit">{r.changePassword}</button>
      </form>
    </main>
  );
}
