// End-to-end checks of the whole site against the local test stack (tests/e2e/stack.ts + `next start` on BASE).
// Usage: NODE_PATH=$(npm root -g) node tests/e2e/run.cjs [axe.min.js path] [screenshot dir]
const { chromium } = require("playwright");
const fs = require("node:fs");
const BASE = process.env.BASE || "http://localhost:3100";
const AXE = process.argv[2];
const SHOTS = process.argv[3];
const results = [];
const ok = (name, pass, info = "") => {
  results.push({ name, pass: !!pass, info });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
};
const external = (t) => /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|tiles\.maps\.eox|fonts\.g/.test(t);

const PAGES = ["", "/signs", "/signs/1", "/signs/17", "/results", "/environment", "/calendar", "/share", "/about", "/science", "/team", "/stories", "/research/login"];

(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

  // 1. Every public page, both languages, desktop and phone
  for (const lang of ["en", "am"]) {
    for (const [w, label] of [[1280, "desktop"], [390, "phone"]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 860 } });
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      page.on("console", (m) => m.type() === "error" && !external(m.text()) && errs.push(m.text()));
      for (const p of PAGES) {
        const url = `${BASE}/${lang}${p}`;
        const r = await page.goto(url, { waitUntil: "networkidle" });
        const info = await page.evaluate(() => ({
          lang: document.documentElement.lang,
          h1: document.querySelectorAll("h1").length,
          title: document.title,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          noAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
          broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && !/eox|tiles/.test(i.currentSrc)).map((i) => i.currentSrc),
        }));
        const good = r.status() === 200 && info.lang === lang && info.h1 === 1 && info.title && info.overflow <= 0 && info.noAlt === 0 && info.broken.length === 0;
        ok(`page ${lang}${p || "/"} ${label}`, good, good ? "" : JSON.stringify({ status: r.status(), ...info }));
      }
      ok(`no script errors ${lang} ${label}`, errs.length === 0, errs.slice(0, 3).join(" | "));
      await ctx.close();
    }
  }

  // 2. Accessibility (axe-core, WCAG 2 A/AA rules) on the main pages
  if (AXE && fs.existsSync(AXE)) {
    const src = fs.readFileSync(AXE, "utf8");
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
    for (const [lang, theme] of [["en", "light"], ["am", "dark"]]) {
      await ctx.addInitScript((t) => { try { localStorage.setItem("sns-theme", t); } catch {} }, theme);
      for (const p of PAGES) {
        await page.goto(`${BASE}/${lang}${p}`, { waitUntil: "networkidle" });
        await page.evaluate(() => document.querySelectorAll(".reveal-ready").forEach((e) => e.classList.add("is-in")));
        await page.waitForTimeout(700);
        await page.addScriptTag({ content: src });
        const v = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
          return r.violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(", ")}`);
        });
        ok(`a11y ${lang}${p || "/"} ${theme}`, v.length === 0, v.join(" ; "));
      }
    }
    await ctx.close();
  }

  // 3. Interactions
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, permissions: ["microphone"] });
  const page = await ctx.newPage();
  const net = [];
  page.on("response", (r) => net.push({ url: r.url(), status: r.status(), type: r.headers()["content-type"] || "" }));

  // Theme toggle persists
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  const before = await page.evaluate(() => document.documentElement.dataset.theme || "auto");
  await page.click(".theme-toggle");
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.reload({ waitUntil: "networkidle" });
  const kept = await page.evaluate(() => document.documentElement.dataset.theme);
  ok("theme toggle switches and is remembered", after && after !== before && kept === after, `${before} → ${after} → ${kept}`);
  if (kept === "dark") await page.click(".theme-toggle");

  // Ask (English)
  await page.fill("#said", "I saw ants carrying their eggs uphill");
  await page.click(".ask-row button[type=submit]");
  await page.waitForSelector(".advice", { timeout: 20000 });
  const askEn = await page.evaluate(() => document.querySelector(".ask-card")?.textContent || "");
  ok("Ask in English finds 'ants carrying eggs'", /ant/i.test(askEn) && /\/en\/signs\/1/.test(await page.content()));

  // Ask (Amharic) and Amharic voice through Addis AI
  await page.goto(`${BASE}/am`, { waitUntil: "networkidle" });
  net.length = 0;
  await page.fill("#said", "ጉንዳኖች እንቁላላቸውን ወደ ላይ ሲያጓጉዙ አየሁ");
  await page.click(".ask-row button[type=submit]");
  await page.waitForSelector(".advice", { timeout: 20000 });
  await page.waitForTimeout(2500);
  const tts = net.find((n) => n.url.includes("/api/tts"));
  ok("Ask in Amharic answers and requests the Amharic voice", !!tts && tts.status === 200 && /audio/.test(tts.type), tts ? `${tts.status} ${tts.type}` : "no /api/tts request");

  // Signs explorer: tabs, search, trust filter, URL
  await page.goto(`${BASE}/en/signs`, { waitUntil: "networkidle" });
  const all = await page.locator(".explorer__grid > li, .explorer-card").count();
  await page.locator(".explorer__tabs button").nth(1).click();
  await page.waitForTimeout(300);
  const tab = await page.locator(".explorer__grid > li, .explorer-card").count();
  await page.fill("input[type=search]", "frog");
  await page.waitForTimeout(300);
  const search = await page.locator(".explorer__grid > li, .explorer-card").count();
  const url = page.url();
  ok("Signs explorer filters by group and search, and keeps the filter in the address", all === 17 && tab < all && search >= 0 && /[?&]q=frog/.test(url), `all ${all}, tab ${tab}, search ${search}, ${url.replace(BASE, "")}`);
  await page.goto(`${BASE}/en/signs?q=frog`, { waitUntil: "networkidle" });
  ok("Shared filter link opens filtered", (await page.locator(".explorer__grid > li, .explorer-card").count()) >= 1 && (await page.inputValue("input[type=search]")) === "frog");

  // Score calculator
  await page.goto(`${BASE}/en/results#method`, { waitUntil: "networkidle" });
  const calcBefore = await page.locator("#method").textContent();
  await page.locator("#method button[aria-pressed]").nth(1).click();
  await page.locator("#method input[type=range]").fill("0.2");
  const calcAfter = await page.locator("#method").textContent();
  ok("Score calculator recalculates", calcBefore !== calcAfter && /1(\.0)?\b/.test(calcAfter || ""));

  // Environment: rainfall loads, month slider moves, source shown
  net.length = 0;
  await page.goto(`${BASE}/en/environment`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const grid = net.find((n) => n.url.includes("/api/climate/grid"));
  const point = net.find((n) => n.url.includes("/api/climate/point"));
  const envText = await page.locator("main").textContent();
  const slider = page.locator(".envx input[type=range]").first();
  let moved = false;
  if (await slider.count()) {
    const v0 = await slider.inputValue();
    await slider.fill("2");
    moved = (await slider.inputValue()) !== v0 || v0 === "2";
  }
  ok("Environment page loads grid and point rainfall and names the source", grid?.status === 200 && point?.status === 200 && /ERA5/.test(envText || "") && moved, `grid ${grid?.status} point ${point?.status} slider ${moved}`);
  ok("Environment page does not show the vegetation panel while GI-AI4AFS is not configured", !(await page.locator("#ndvi-title").count()));

  // Community knowledge map: filters, area summary, no precise locations
  const kmapAll = await page.locator(".kmap__list li").count();
  await page.locator(".kmap__chips button").nth(3).click();
  const kmapInsects = await page.locator(".kmap__list li").count();
  await page.selectOption(".kmap__filters label:nth-of-type(1) select", "belg");
  const kmapBoth = await page.locator(".kmap__list li").count();
  await page.locator(".kmap__filters .linklike").click();
  const kmapReset = await page.locator(".kmap__list li").count();
  const marker = await page.locator(".kmap__marker").count();
  ok("Community map filters by type and season and resets", kmapAll === 19 && kmapInsects > 0 && kmapInsects < kmapAll && kmapBoth <= kmapInsects && kmapReset === kmapAll && marker >= 1, `all ${kmapAll}, insects ${kmapInsects}, +belg ${kmapBoth}, reset ${kmapReset}, markers ${marker}`);
  ok("Community map shows the area summary", /Offa Woreda/.test((await page.locator(".kmap__side").textContent()) || ""));

  // Calendar
  net.length = 0;
  await page.goto(`${BASE}/en/calendar`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  ok("Calendar loads average rainfall", net.some((n) => n.url.includes("/api/climate/point") && n.status === 200));

  // Science anchors
  await page.goto(`${BASE}/en/science`, { waitUntil: "networkidle" });
  const ids = await page.$$eval(".science__nav a", (a) => a.map((x) => x.getAttribute("href")));
  const missing = [];
  for (const h of ids) if (!(await page.locator(h).count())) missing.push(h);
  ok("Science section links all land on a section", ids.length === 7 && missing.length === 0, missing.join(","));
  ok("Science page states no DOI and 17 pre-registered tests", (await page.locator(".sci-prereg tbody tr").count()) === 17 && /Will be added when the paper is published/.test(await page.content()));

  // Share: online submission with a voice note
  await page.goto(`${BASE}/en/share`, { waitUntil: "networkidle" });
  await page.fill("#indicator", "E2E test sign");
  await page.fill("#description", "Automated end-to-end test entry. Not a real observation.");
  await page.fill("#region", "Wolaita");
  await page.fill("#location_text", "Offa");
  let voiceOk = false;
  if (await page.locator(".voice__btn").count()) {
    await page.click(".voice__btn");
    await page.waitForTimeout(1600);
    await page.click(".voice__btn--stop");
    await page.waitForTimeout(800);
    voiceOk = (await page.locator(".voice audio, audio").count()) > 0;
  }
  ok("Voice note records with the microphone", voiceOk);
  await page.check("input[name=consent]");
  net.length = 0;
  await page.click(".share-submit button[type=submit]");
  await page.waitForSelector(".share-done", { timeout: 20000 }).catch(() => {});
  const shareResp = net.find((n) => n.url.includes("/api/share"));
  ok("Share a sign submits online", (await page.locator(".share-done").count()) > 0 && shareResp?.status === 200, `api/share ${shareResp?.status}`);

  // Share: offline draft and queue, then sync
  await page.goto(`${BASE}/en/share`, { waitUntil: "networkidle" });
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.fill("#indicator", "E2E offline sign");
  await page.fill("#description", "Queued while offline by the automated test.");
  await page.fill("#region", "Wolaita");
  await page.fill("#location_text", "Offa");
  await page.check("input[name=consent]");
  await page.click(".share-submit button[type=submit]");
  await page.waitForTimeout(1200);
  const queued = await page.locator(".sync-bar").textContent();
  ok("Offline: the sign is kept in the outbox", /wait|1/i.test(queued || ""), queued || "");
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(4000);
  const synced = await page.locator(".sync-bar").textContent();
  ok("Back online: the outbox is sent", !/waiting/i.test(synced || ""), synced || "");

  // Research area: login, submissions include both, records, run a weather test, data trail API
  await page.goto(`${BASE}/en/research/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "e2e@example.org");
  await page.fill("#password", "e2e-password-123");
  await Promise.all([page.waitForURL(/\/en\/research(?!\/login)/, { timeout: 15000 }).catch(() => {}), page.click("form button[type=submit]")]);
  ok("Research sign-in works", !/login/.test(page.url()), page.url().replace(BASE, ""));
  await page.goto(`${BASE}/en/research/submissions`, { waitUntil: "networkidle" });
  const subs = await page.locator("main").textContent();
  ok("Both shared signs reached the research inbox", /E2E test sign/.test(subs || "") && /E2E offline sign/.test(subs || ""));
  const subLink = page.locator("a", { hasText: "E2E test sign" }).first();
  if (await subLink.count()) {
    await subLink.click();
    await page.waitForLoadState("networkidle");
    ok("Voice note plays in the submission", (await page.locator("audio").count()) > 0);
  }
  await page.goto(`${BASE}/en/research/records/1`, { waitUntil: "networkidle" });
  await page.fill("#t_date", "2025-06-10");
  await Promise.all([page.waitForLoadState("networkidle"), page.locator("form:has(#t_src) button[type=submit]").click()]);
  await page.waitForTimeout(2500);
  const testUrl = decodeURIComponent(page.url().replace(BASE, ""));
  ok("Researcher weather test runs", /ok=test/.test(testUrl), testUrl);
  await page.goto(`${BASE}/en/signs/1`, { waitUntil: "networkidle" });
  const ev = await page.locator(".evidence, .test-evidence").count();
  ok("A weather test run by a researcher appears with its evidence on the public sign page", ev > 0);
  const testLink = await page.$eval("a[href*='/api/v1/tests/']", (a) => a.getAttribute("href")).catch(() => null);
  if (testLink) {
    const r = await page.request.get(BASE + testLink);
    const j = await r.json();
    ok("Test data trail is downloadable", r.status() === 200 && JSON.stringify(j).includes("2025-06"), testLink);
  } else ok("Test data trail is downloadable", false, "no link on sign page");
  await page.goto(`${BASE}/en/research/records`, { waitUntil: "networkidle" });
  ok("Research records list opens", (await page.locator("main").textContent())?.includes("17") || (await page.locator("table tr").count()) > 10);

  // 4. Public APIs
  const req = page.request;
  const signs = await (await req.get(`${BASE}/api/v1/signs`)).json();
  ok("API /api/v1/signs lists 17 signs in two languages", Array.isArray(signs.signs) && signs.signs.length === 17 && signs.languages.join() === "en,am");
  const an = await req.post(`${BASE}/api/analyze`, { data: { text: "frogs croaking", lang: "en" } });
  ok("API /api/analyze recognises a sign", an.status() === 200 && /frog/i.test(JSON.stringify(await an.json())));
  const gr = await req.get(`${BASE}/api/climate/grid?year=2025`);
  const gj = await gr.json();
  ok("API /api/climate/grid returns 9 cells", gr.status() === 200 && (gj.cells?.length === 9 || gj.series?.length === 9), Object.keys(gj).join(","));
  const nd = await (await req.get(`${BASE}/api/giai/ndvi`)).json();
  ok("API /api/giai/ndvi reports not configured (no fake data)", nd.configured === false);
  const sm = await (await req.get(`${BASE}/sitemap.xml`)).text();
  ok("Sitemap lists the new pages", ["/en/science", "/am/stories", "/en/environment", "/en/team", "/en/calendar"].every((p) => sm.includes(p)));
  const health = await (await req.get(`${BASE}/api/health`)).json();
  ok("Health check reports database and voice", health.ok === true && health.tts?.addis?.reachable === true);
  const secrets = JSON.stringify(health) + JSON.stringify(signs);
  ok("No secrets in public API output", !/e2e-dummy|e2e-only|postgres:\/\//.test(secrets));

  await ctx.close();
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (SHOTS) fs.writeFileSync(`${SHOTS}/e2e-results.json`, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
