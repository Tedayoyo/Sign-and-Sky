"use client";
// Shown instead of a broken page when something on the server fails.
import { useParams } from "next/navigation";
import en from "@/dictionaries/en.json";
import am from "@/dictionaries/am.json";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = (lang === "am" ? am : en).errorPage;
  return (
    <main className="wrap narrow" style={{ paddingBlock: "3rem" }}>
      <h1>{t.title}</h1>
      <p>{t.text}</p>
      <div className="actions">
        <button className="btn" onClick={() => reset()}>{t.retry}</button>
        <a className="btn secondary" href={`/${lang === "am" ? "am" : "en"}`}>Sign &amp; Sky</a>
      </div>
    </main>
  );
}
