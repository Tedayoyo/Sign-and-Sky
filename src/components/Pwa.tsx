"use client";
import { useEffect, useRef, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type T = { install: string; installHelp: string; iosTitle: string; iosSteps: string; ready: string; update: string; close: string };

// Registers the service worker (offline use) and offers to install Sign & Sky as an app.
// Android and desktop Chrome/Edge: one-tap install. iPhone and iPad: short "Add to Home Screen" instructions.
export function Pwa({ t }: { t: T }) {
  const [prompt, setPrompt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const updating = useRef(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BIP);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          const first = !navigator.serviceWorker.controller;
          const track = (w: ServiceWorker | null) =>
            w?.addEventListener("statechange", () => {
              if (w.state === "installed") {
                if (navigator.serviceWorker.controller) setWaiting(w);
                else if (first) {
                  setOfflineReady(true);
                  setTimeout(() => setOfflineReady(false), 6000);
                }
              }
            });
          if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          track(reg.installing);
          reg.addEventListener("updatefound", () => track(reg.installing));
        })
        .catch(() => {});
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded || !updating.current) return;
        reloaded = true;
        location.reload();
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      await prompt.userChoice.catch(() => null);
      setPrompt(null);
    } else if (ios) setShowIos(true);
  };

  return (
    <>
      {!installed && (prompt || ios) && (
        <button type="button" className="install-btn" onClick={install} title={t.installHelp}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.install}
        </button>
      )}
      {showIos && (
        <div className="pwa-sheet" role="dialog" aria-modal="false" aria-labelledby="ios-title">
          <h2 id="ios-title">{t.iosTitle}</h2>
          <p>{t.iosSteps}</p>
          <button type="button" className="btn secondary" onClick={() => setShowIos(false)}>
            {t.close}
          </button>
        </div>
      )}
      {(offlineReady || waiting) && (
        <div className="pwa-toast" role="status">
          {waiting ? (
            <>
              {t.update}{" "}
              <button type="button" className="linklike" onClick={() => ((updating.current = true), waiting.postMessage("skipWaiting"))} aria-label={t.update}>
                ↻
              </button>
            </>
          ) : (
            t.ready
          )}
        </div>
      )}
    </>
  );
}
