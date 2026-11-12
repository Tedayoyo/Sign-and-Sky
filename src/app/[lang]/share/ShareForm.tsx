"use client";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { shareSign } from "./actions";
import type { ShareState } from "@/lib/share-handler";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import {
  addToOutbox,
  clearDraft,
  loadDraft,
  loadOutbox,
  removeFromOutbox,
  saveDraft,
  shrinkPhoto,
  toFormData,
  type StoredSign,
} from "@/lib/share-store";

// The upload limit of the hosting platform is about 4.5 MB per request; stay safely below it.
const MAX_TOTAL = 4 * 1024 * 1024;
const FIELDS = ["indicator", "description", "observation_date", "original_language", "interpretation", "expected_event", "expected_timing", "agricultural_activity", "crop_type", "region", "location_text", "village", "farmer_name", "notes"];

export default function ShareForm({ lang, d }: { lang: string; d: Dict["share"] }) {
  // Without JavaScript the form posts to the server action; with it, the page handles drafts, voice and offline sending.
  const [actionState, action, actionPending] = useActionState<ShareState, FormData>(shareSign, {});
  const [jsState, setJsState] = useState<ShareState | null>(null);
  const state = jsState ?? actionState;
  const [pending, setPending] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; name: string; url: string } | null>(null);
  const [online, setOnline] = useState(true);
  const [note, setNote] = useState("");
  const [restored, setRestored] = useState(false);
  const [outbox, setOutbox] = useState(0);
  const [sentCodes, setSentCodes] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const v = state.values ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const o = d.offline;

  const readFields = useCallback((): Record<string, string> => {
    const f = form.current;
    const out: Record<string, string> = { lang };
    if (!f) return out;
    const fd = new FormData(f);
    for (const k of FIELDS) out[k] = String(fd.get(k) ?? "");
    if (fd.get("consent") === "on") out.consent = "on";
    return out;
  }, [lang]);

  // Send signs waiting on this phone, one by one, whenever we are online.
  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    const list = await loadOutbox();
    setOutbox(list.length);
    if (!list.length) return;
    setSyncing(true);
    for (const item of list) {
      try {
        const r = await fetch("/api/share", { method: "POST", body: toFormData(item) });
        const j = (await r.json()) as ShareState;
        if (j.ok && j.code) {
          await removeFromOutbox(item.id);
          setSentCodes((c) => [...c, j.code!]);
        } else if (r.status === 422) {
          await removeFromOutbox(item.id); // the server refused it (e.g. a missing field); keep it as the draft to fix
          await saveDraft({ ...item, id: "draft" });
          setNote(j.error ?? "");
        }
      } catch {
        break; // still offline in practice; try again later
      }
    }
    setOutbox((await loadOutbox()).length);
    setSyncing(false);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => {
      setOnline(true);
      sync();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    sync();
    (async () => {
      const draft = await loadDraft();
      const f = form.current;
      if (!draft || !f) return;
      for (const [k, val] of Object.entries(draft.fields)) {
        const el = f.elements.namedItem(k) as HTMLInputElement | null;
        if (!el || k === "lang") continue;
        if (el.type === "checkbox") el.checked = val === "on";
        else el.value = val;
      }
      if (draft.voice) setVoice(draft.voice);
      if (draft.photo) setPhoto({ blob: draft.photo, name: draft.photoName || "photo.jpg", url: URL.createObjectURL(draft.photo) });
      setRestored(true);
    })();
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [sync]);

  const scheduleSave = useCallback(
    (nextVoice = voice, nextPhoto = photo) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await saveDraft({ id: "draft", fields: readFields(), voice: nextVoice, photo: nextPhoto?.blob ?? null, photoName: nextPhoto?.name, savedAt: Date.now() });
        setNote(o.draftSaved);
      }, 600);
    },
    [voice, photo, readFields, o.draftSaved],
  );

  const discard = async () => {
    await clearDraft();
    setVoice(null);
    setPhoto(null);
    setRestored(false);
    setNote("");
    setFormKey((k) => k + 1);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = form.current!;
    if (!f.reportValidity()) return;
    const fields = readFields();
    const item: StoredSign = { id: `s${Date.now()}`, fields, voice, photo: photo?.blob ?? null, photoName: photo?.name, savedAt: Date.now() };
    if ((voice?.size ?? 0) + (photo?.blob.size ?? 0) > MAX_TOTAL) return setJsState({ error: o.tooLarge, values: fields });
    setPending(true);
    if (!navigator.onLine) {
      await addToOutbox(item);
      await clearDraft();
      setOutbox((await loadOutbox()).length);
      setPending(false);
      return setJsState({ ok: true, code: "", values: { queued: "1" } });
    }
    try {
      const r = await fetch("/api/share", { method: "POST", body: toFormData(item) });
      const j = (await r.json()) as ShareState;
      if (j.ok) await clearDraft();
      setJsState(j.ok ? j : { error: j.error ?? d.errors.server, values: fields });
    } catch {
      await addToOutbox(item); // the connection dropped: keep it and send it later
      await clearDraft();
      setOutbox((await loadOutbox()).length);
      setJsState({ ok: true, code: "", values: { queued: "1" } });
    }
    setPending(false);
  };

  const status = (
    <div className={`sync-bar${online ? "" : " is-offline"}`} role="status">
      <span className="sync-bar__dot" aria-hidden="true" />
      <span>{online ? o.online : o.offline}</span>
      {outbox > 0 && <span className="sync-bar__wait">{(syncing ? o.sending : o.waiting).replace("{n}", String(outbox))}</span>}
      {online && outbox > 0 && !syncing && (
        <button type="button" className="linklike" onClick={sync}>
          {o.sendNow}
        </button>
      )}
      {sentCodes.map((c) => (
        <span key={c} className="sync-bar__sent">
          {o.sent.replace("{code}", c)}
        </span>
      ))}
    </div>
  );

  if (state.ok && state.values?.queued)
    return (
      <>
        {status}
        <div className="alert ok share-done" role="status">
          <span className="share-done__icon" aria-hidden="true">✓</span>
          <h2 style={{ marginTop: 0 }}>{o.queuedTitle}</h2>
          <p>{o.queued}</p>
          <button type="button" className="btn secondary" onClick={() => { setJsState(null); setVoice(null); setPhoto(null); setFormKey((k) => k + 1); }}>
            {d.another}
          </button>
        </div>
      </>
    );

  if (state.ok)
    return (
      <div className="alert ok share-done" role="status">
        <span className="share-done__icon" aria-hidden="true">✓</span>
        <h2 style={{ marginTop: 0 }}>{d.successTitle}</h2>
        <p>{d.success.replace("{code}", state.code ?? "")}</p>
        <a className="btn secondary" href={`/${lang}/share`} onClick={() => { setJsState(null); setFormKey((k) => k + 1); }}>
          {d.another}
        </a>
      </div>
    );

  return (
    <>
    {status}
    {restored && (
      <p className="notice share-restored">
        {o.draftRestored}{" "}
        <button type="button" className="linklike" onClick={discard}>
          {o.discard}
        </button>
      </p>
    )}
    <form key={formKey} ref={form} action={action} onSubmit={onSubmit} onChange={() => scheduleSave()} encType="multipart/form-data">
      <input type="hidden" name="lang" value={lang} />
      {state.error && (
        <p className="alert error" role="alert">
          {state.error}
        </p>
      )}
      <fieldset>
        <legend>{d.indicator}</legend>
        <div className="form-grid">
          <div className="full">
            <label htmlFor="indicator">{d.indicator} *</label>
            <input id="indicator" name="indicator" type="text" required maxLength={200} defaultValue={v.indicator} />
          </div>
          <div className="full">
            <label htmlFor="description">{d.description} *</label>
            <textarea id="description" name="description" required maxLength={4000} defaultValue={v.description} />
          </div>
          <div>
            <label htmlFor="observation_date">{d.date} *</label>
            <input id="observation_date" name="observation_date" type="date" required max={today} defaultValue={v.observation_date || today} />
          </div>
          <div>
            <label htmlFor="original_language">{d.language}</label>
            <select id="original_language" name="original_language" defaultValue={v.original_language || lang}>
              {Object.entries(d.languages).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div className="full">
            <label htmlFor="interpretation">{d.interpretation}</label>
            <textarea id="interpretation" name="interpretation" maxLength={2000} defaultValue={v.interpretation} style={{ minHeight: 80 }} />
          </div>
          <div>
            <label htmlFor="expected_event">{d.expected}</label>
            <input id="expected_event" name="expected_event" type="text" maxLength={500} defaultValue={v.expected_event} />
          </div>
          <div>
            <label htmlFor="expected_timing">{d.timing}</label>
            <select id="expected_timing" name="expected_timing" defaultValue={v.expected_timing || "other_unknown"}>
              {Object.entries(d.timings).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="agricultural_activity">{d.activity}</label>
            <select id="agricultural_activity" name="agricultural_activity" defaultValue={v.agricultural_activity || "other"}>
              {Object.entries(d.activities).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="crop_type">{d.crop}</label>
            <input id="crop_type" name="crop_type" type="text" maxLength={120} defaultValue={v.crop_type} />
          </div>
          <div className="full">
            <VoiceRecorder
              t={d.voice}
              value={voice}
              onChange={(b) => {
                setVoice(b);
                scheduleSave(b, photo);
              }}
            />
          </div>
          <div className="full">
            <label htmlFor="photo">{d.photo}</label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return setPhoto(null);
                const blob = await shrinkPhoto(file);
                const next = { blob, name: file.name.replace(/\.\w+$/, "") + ".jpg", url: URL.createObjectURL(blob) };
                setPhoto(next);
                scheduleSave(voice, next);
              }}
            />
            {photo && (
              <span className="photo-preview">
                <img src={photo.url} alt="" />
                <button type="button" className="btn secondary small" onClick={() => { setPhoto(null); scheduleSave(voice, null); }}>
                  {d.voice.remove}
                </button>
              </span>
            )}
          </div>
        </div>
      </fieldset>
      <fieldset>
        <legend>{d.location}</legend>
        <p className="field-help">{d.privacy}</p>
        <div className="form-grid">
          <div>
            <label htmlFor="region">{d.region} *</label>
            <input id="region" name="region" type="text" required maxLength={120} defaultValue={v.region} />
          </div>
          <div>
            <label htmlFor="location_text">{d.location} *</label>
            <input id="location_text" name="location_text" type="text" required maxLength={160} defaultValue={v.location_text} />
          </div>
          <div>
            <label htmlFor="village">{d.village}</label>
            <input id="village" name="village" type="text" maxLength={120} defaultValue={v.village} />
          </div>
          <div>
            <label htmlFor="farmer_name">{d.farmerName}</label>
            <input id="farmer_name" name="farmer_name" type="text" maxLength={120} defaultValue={v.farmer_name} autoComplete="name" />
          </div>
          <div className="full">
            <label htmlFor="notes">{d.notes}</label>
            <textarea id="notes" name="notes" maxLength={4000} defaultValue={v.notes} style={{ minHeight: 80 }} />
          </div>
        </div>
      </fieldset>
      <label className="check" style={{ marginBottom: "1rem" }}>
        <input type="checkbox" name="consent" required />
        <span>{d.consent}</span>
      </label>
      <div className="share-submit">
        <button className="btn" type="submit" disabled={pending || actionPending}>
          {pending || actionPending ? <span className="spinner" aria-hidden="true" /> : null}
          {d.submit}
        </button>
        {note && <span className="muted small" role="status">{note}</span>}
      </div>
    </form>
    </>
  );
}
