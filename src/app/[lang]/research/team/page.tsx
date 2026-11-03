import type { Metadata } from "next";
import { dict } from "@/lib/i18n";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { ResearchNav } from "@/components/ResearchNav";
import { toggleMember } from "../actions";
import MemberForm from "./MemberForm";

export const metadata: Metadata = { title: "Research", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Team({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const r = d.research;
  const me = await requireAdmin(lang);
  const people = await query<{ id: string; email: string; full_name: string; role: "admin" | "researcher"; is_active: boolean; last_login_at: string | null }>(
    "select id, email, full_name, role, is_active, last_login_at from profiles order by created_at",
  );
  return (
    <main className="wrap">
      <ResearchNav lang={lang} d={d} user={me} current="team" />
      <h1>{r.team}</h1>
      <p className="muted">{r.teamHelp}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{r.fullName}</th>
              <th>{r.email}</th>
              <th>{r.role}</th>
              <th>{r.lastLogin}</th>
              <th>{r.active}</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td>
                <td>{p.email}</td>
                <td>{r.roles[p.role]}</td>
                <td>{p.last_login_at ? new Date(p.last_login_at).toISOString().slice(0, 16).replace("T", " ") : r.never}</td>
                <td>
                  {p.id === me.id ? (
                    d.common.yes
                  ) : (
                    <form action={toggleMember}>
                      <input type="hidden" name="lang" value={lang} />
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn secondary small">{p.is_active ? r.deactivate : r.activate}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <fieldset>
        <legend>{r.newMember}</legend>
        <MemberForm lang={lang} r={r} />
      </fieldset>
    </main>
  );
}
