"use client";
import { useActionState, useState } from "react";
import type { Dict } from "@/lib/i18n";
import { shareSign, type ShareState } from "./actions";

export default function ShareForm({ lang, d }: { lang: string; d: Dict["share"] }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(shareSign, {});
  const [formKey, setFormKey] = useState(0);
  const v = state.values ?? {};
  const today = new Date().toISOString().slice(0, 10);

  if (state.ok)
    return (
      <div className="alert ok" role="status">
        <h2 style={{ marginTop: 0 }}>{d.successTitle}</h2>
        <p>{d.success.replace("{code}", state.code ?? "")}</p>
        <a className="btn secondary" href={`/${lang}/share`} onClick={() => setFormKey((k) => k + 1)}>
          {d.another}
        </a>
      </div>
    );

  return (
    <form key={formKey} action={action} encType="multipart/form-data">
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
            <label htmlFor="photo">{d.photo}</label>
            <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
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
      <button className="btn" type="submit" disabled={pending}>
        {d.submit}
      </button>
    </form>
  );
}
