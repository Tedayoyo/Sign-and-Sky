import type { Metadata } from "next";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { publishedSigns, tr } from "@/lib/records";
import { PREREG, BENCHMARKS } from "@/lib/science";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { TrustBadge } from "@/components/Gauge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const d = dict(lang);
  return { title: d.science.title, description: d.science.lead };
}

const REPO = "https://github.com/Tedayoyo/Sign-and-Sky";

export default async function Science({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const d = dict(lang);
  const S = d.science;
  const signs = await publishedSigns();
  const name = (n: number) => {
    const s = signs.find((x) => x.record_number === n);
    return s ? tr(s, lang).name : `#${n}`;
  };
  const months = d.calendar.months;
  const fmt = (iso: string) => {
    const [y, m, dd] = iso.split("-").map(Number);
    return `${dd} ${months[m - 1]} ${y}`;
  };
  const count = { confirmed: 0, timing: 0, direction: 0 };
  PREREG.forEach((t) => count[t.status]++);
  const sections = ["publications", "methodology", "score", "datasets", "validation", "projects", "collaborations"] as const;

  return (
    <main className="science">
      <PageHero image="science" alt={d.media.science} eyebrow={S.eyebrow} title={S.title} lead={S.lead} />
      <nav className="science__nav" aria-label={S.navLabel}>
        <div className="wrap">
          {sections.map((k) => (
            <a key={k} href={`#${k}`}>
              {S.nav[k]}
            </a>
          ))}
        </div>
      </nav>
      <div className="wrap science__body">
        {/* Publications */}
        <section id="publications" className="sci-section" aria-labelledby="pub-title">
          <h2 id="pub-title">{S.nav.publications}</h2>
          <Reveal as="article" className="pub-card">
            <p className="pub-card__status">
              <span className="status-pill status-pill--preliminary">{S.pub.status}</span>
            </p>
            <h3 lang="en">{S.pub.title}</h3>
            <p className="pub-card__authors">{S.pub.authors}</p>
            <h4>{S.pub.abstractLabel}</h4>
            <p>{S.pub.abstract}</p>
            <dl className="pub-card__meta">
              <dt>{S.pub.keywordsLabel}</dt>
              <dd>{S.pub.keywords}</dd>
              <dt>DOI</dt>
              <dd>{S.pub.doi}</dd>
              <dt>PDF</dt>
              <dd>{S.pub.pdf}</dd>
            </dl>
          </Reveal>
          <p className="muted small">{S.pub.note}</p>
        </section>

        {/* Methodology */}
        <section id="methodology" className="sci-section" aria-labelledby="meth-title">
          <h2 id="meth-title">{S.nav.methodology}</h2>
          <p>{S.method.intro}</p>
          <ol className="sci-steps">
            {S.method.steps.map(([title, text], i) => (
              <Reveal as="li" key={title} delay={i * 90}>
                <span className="sci-steps__n">{i + 1}</span>
                <strong>{title}</strong>
                <span>{text}</span>
              </Reveal>
            ))}
          </ol>
          <h3>{S.method.rulesTitle}</h3>
          <p className="muted">{S.method.rulesIntro}</p>
          <ul className="sci-rules">
            {S.method.rules.map(([code, text]) => (
              <li key={code}>
                <span className="sci-rules__code">{code}</span>
                {text}
              </li>
            ))}
          </ul>
          <h3>{S.method.measuresTitle}</h3>
          <p className="formula" lang="en">
            PC = (1/n) Σ oᵢ · E = (1/n) Σ bᵢ · HSS = (PC − E) / (1 − E)
          </p>
          <p>{S.method.measures}</p>
          <h3>{S.method.levelsTitle}</h3>
          <ol className="sci-levels">
            {S.method.levels.map(([title, text], i) => (
              <li key={title} className={i < 3 ? "is-reached" : i === 3 ? "is-next" : undefined}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* SNS-Score */}
        <section id="score" className="sci-section" aria-labelledby="score-title">
          <h2 id="score-title">{S.nav.score}</h2>
          <p className="formula" lang="en">
            {d.results.formula}
          </p>
          <p>{S.score.intro}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{S.score.colOutcome}</th>
                  <th scope="col">{S.score.colH}</th>
                  <th scope="col">P</th>
                </tr>
              </thead>
              <tbody>
                {S.score.rows.map(([o, h, p]) => (
                  <tr key={o}>
                    <td>
                      <strong>{S.outcomes[o as keyof typeof S.outcomes]}</strong> <code>{o}</code>
                    </td>
                    <td>{h}</td>
                    <td>{p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>{S.score.bandsTitle}</h3>
          <ul className="sci-bands">
            {(["very_strong", "strong", "fair", "weak"] as const).map((b, i) => (
              <li key={b}>
                <TrustBadge level={b} text={d.trust[b]} /> <span>{["≥ 9", "8–8.9", "7–7.9", "< 7"][i]}</span>
              </li>
            ))}
          </ul>
          <h3>{S.score.benchTitle}</h3>
          <p className="muted">{S.score.benchIntro}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{S.score.colOutcome}</th>
                  <th scope="col">{S.score.colChance}</th>
                  <th scope="col">N = 30</th>
                  <th scope="col">N = 10</th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARKS.map((b) => (
                  <tr key={b.outcome}>
                    <td>{b.outcome === "rain" ? S.score.rainGroup : S.outcomes[b.outcome as keyof typeof S.outcomes]}</td>
                    <td className="num">{b.chance30}</td>
                    <td className="num">{b.s30}</td>
                    <td className="num">{b.s10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="notice">{S.score.limits}</p>
          <p>
            <Link className="btn secondary" href={`/${lang}/results#method`}>
              {S.score.calcLink}
            </Link>{" "}
            <a className="btn secondary" href={`${REPO}/blob/main/src/lib/scoring.ts`} target="_blank" rel="noopener noreferrer">
              {S.score.codeLink}
            </a>
          </p>
        </section>

        {/* Datasets */}
        <section id="datasets" className="sci-section" aria-labelledby="data-title">
          <h2 id="data-title">{S.nav.datasets}</h2>
          <p>{S.data.intro}</p>
          <ul className="sci-data">
            {S.data.items.map((x) => (
              <Reveal as="li" key={x.name} className="sci-data__item">
                <div className="sci-data__top">
                  <strong>{x.name}</strong>
                  <span className="status-pill status-pill--retested">{x.role}</span>
                </div>
                <span className="muted small">{x.what}</span>
                <a href={x.link} target="_blank" rel="noopener noreferrer">
                  {x.linkText}
                </a>
              </Reveal>
            ))}
          </ul>
          <p>
            <Link href={`/${lang}/environment`}>{S.data.envLink}</Link>
          </p>
        </section>

        {/* Validation */}
        <section id="validation" className="sci-section" aria-labelledby="val-title">
          <h2 id="val-title">{S.nav.validation}</h2>
          <p>{S.val.intro}</p>
          <ul className="evidence-cards">
            {(["confirmed", "timing", "direction"] as const).map((k) => (
              <li key={k} className={`evidence-card evidence-card--${k === "confirmed" ? "validated" : k === "timing" ? "retested" : "preliminary"}`}>
                <strong>{count[k]}</strong>
                <span className="evidence-card__title">{S.val.status[k]}</span>
                <span>{S.val.statusHelp[k]}</span>
              </li>
            ))}
          </ul>
          <div className="table-scroll">
            <table className="sci-prereg">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">{S.val.colSign}</th>
                  <th scope="col">{S.val.colOutcome}</th>
                  <th scope="col">{S.val.colWindow}</th>
                  <th scope="col">{S.val.colRule}</th>
                  <th scope="col">{S.val.colStatus}</th>
                  <th scope="col">{S.val.colResult}</th>
                </tr>
              </thead>
              <tbody>
                {PREREG.map((t) => (
                  <tr key={t.n}>
                    <td className="num">{t.n}</td>
                    <td>
                      <Link href={`/${lang}/signs/${t.n}`}>{name(t.n)}</Link>
                    </td>
                    <td>{t.outcomes.map((o) => S.outcomes[o as keyof typeof S.outcomes]).join(" / ")}</td>
                    <td>{t.note === "kiremt_belg" ? S.val.kiremtBelg : t.windows.map(([a, b]) => `${fmt(a)} – ${fmt(b)}`).join("; ")}</td>
                    <td>{t.rule}</td>
                    <td>
                      <span className={`status-pill status-pill--${t.status === "confirmed" ? "connected" : t.status === "timing" ? "research" : "pending"}`}>{S.val.status[t.status]}</span>
                    </td>
                    <td className="muted">{S.val.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">{S.val.note}</p>
        </section>

        {/* Projects */}
        <section id="projects" className="sci-section" aria-labelledby="proj-title">
          <h2 id="proj-title">{S.nav.projects}</h2>
          <ul className="sci-projects">
            {S.projects.map(([title, state, text], i) => (
              <Reveal as="li" key={title} delay={(i % 3) * 90}>
                <span className="sci-projects__state">{state}</span>
                <strong>{title}</strong>
                <span>{text}</span>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Collaborations */}
        <section id="collaborations" className="sci-section" aria-labelledby="col-title">
          <h2 id="col-title">{S.nav.collaborations}</h2>
          <ul className="sci-collab">
            {S.collab.items.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="muted">{S.collab.note}</p>
        </section>
      </div>
    </main>
  );
}
