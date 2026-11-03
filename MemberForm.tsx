"use client";
import { useActionState } from "react";
import type { Dict } from "@/lib/i18n";
import { createMember, type MemberState } from "../actions";

export default function MemberForm({ lang, r }: { lang: string; r: Dict["research"] }) {
  const [state, action, pending] = useActionState<MemberState, FormData>(createMember, {});
  return (
    <form action={action} className="form-grid">
      <input type="hidden" name="lang" value={lang} />
      {state.ok && (
        <p className="alert ok full" role="status">
          {r.created.replace("{email}", state.ok.email).replace("{password}", "")}
          <code style={{ fontSize: "1.05rem", userSelect: "all" }}>{state.ok.password}</code>
        </p>
      )}
      {state.error && <p className="alert error full" role="alert">{state.error === "exists" ? r.exists : r.invalid}</p>}
      <div>
        <label htmlFor="m_name">{r.fullName}</label>
        <input id="m_name" name="full_name" type="text" required maxLength={120} />
      </div>
      <div>
        <label htmlFor="m_email">{r.email}</label>
        <input id="m_email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="m_role">{r.role}</label>
        <select id="m_role" name="role" defaultValue="researcher">
          <option value="researcher">{r.roles.researcher}</option>
          <option value="admin">{r.roles.admin}</option>
        </select>
      </div>
      <div style={{ alignSelf: "end" }}>
        <button className="btn" type="submit" disabled={pending}>{r.create}</button>
      </div>
    </form>
  );
}
