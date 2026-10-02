import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import apiClient from '../../../../api/apiClient';
import { db } from '../../../../firebaseConfig';
import UploadFile from '../../../Upload/UploadFile';
import { CATEGORIES } from '../../../../utils/bookingTheme';
import { setSearchBias, suggestPlaces, geocodeQuery } from '../../../../utils/tripGeo';
import Suggest from './Suggest';
import { Glyph } from '../overview/glyphs';
import { dayKey, formatDay } from '../overview/overviewModel';
import './FormKit.css';

// ---------- small date helpers (plain "YYYY-MM-DD" and "HH:mm" strings, no time-zone surprises) ----------

export const toDateField = (value) => dayKey(value);

export const localParts = (value) => {
  if (!value) return { date: '', time: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  return {
    date: dayKey(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
};

export const joinLocal = (date, time) => (date ? `${date}T${time || '00:00'}:00` : null);

export const prettyDate = (key) => (key ? formatDay(key, { weekday: 'short', month: 'short', day: 'numeric' }) : '');

export const outsideTrip = (keys, start, end) => {
  if (!start || !end) return false;
  return keys.filter(Boolean).some((key) => key < start || key > end);
};

// Trip dates come from the page when it knows them, otherwise we ask for them once.
export function useTripDates(itineraryId, startDate, endDate) {
  const [dates, setDates] = useState({ start: dayKey(startDate), end: dayKey(endDate) });
  useEffect(() => {
    if (!itineraryId) return undefined;
    let cancelled = false;
    apiClient.get(`/itineraries/${itineraryId}`)
      .then((response) => {
        if (cancelled || !response.data) return;
        if (!(dates.start && dates.end)) setDates({ start: dayKey(response.data.start_date), end: dayKey(response.data.end_date) });
        // searches favour places near where the trip is
        const place = response.data.destinations || response.data.title;
        if (place) geocodeQuery(place).then((position) => setSearchBias(position)).catch(() => {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itineraryId]);  return dates;
}

// ---------- saving ----------

export function useBookingSubmit({ resource, mirror, itineraryId, editId, onSaved }) {
  const [state, setState] = useState({ busy: false, error: '', done: false, warning: false });
  const pending = useRef(null);

  const run = async (payload) => {
    setState({ busy: true, error: '', done: false, warning: false });
    try {
      const url = `/itineraries/${itineraryId}/${resource}`;
      const response = editId ? await apiClient.put(`${url}/${editId}`, payload) : await apiClient.post(url, payload);
      if (!editId && mirror) {
        // a copy for live updates; it must never hold up or break the save
        try {
          setDoc(doc(collection(db, mirror)), { ...payload, itineraryId: String(itineraryId) }).catch(() => {});
        } catch (error) {
          // ignore
        }
      }
      if (onSaved) onSaved(response.data);
      setState({ busy: false, error: '', done: true, warning: false });
    } catch (error) {
      console.error(`Failed to save ${resource}:`, error);
      setState({ busy: false, error: error.response?.data?.error || 'We could not save that. Please try again.', done: false, warning: false });
    }
  };

  return {
    ...state,
    submit: (payload, outside) => {
      pending.current = payload;
      if (outside) setState({ busy: false, error: '', done: false, warning: true });
      else run(payload);
    },
    confirm: () => run(pending.current),
    dismissWarning: () => setState((current) => ({ ...current, warning: false })),
    again: () => setState({ busy: false, error: '', done: false, warning: false }),
  };
}

// ---------- building blocks ----------

export function Field({ label, hint, required = false, span = 1, children, htmlFor }) {
  return (
    <div className={`bk-field span-${span}`}>
      {label ? (
        <label className="bk-label" htmlFor={htmlFor}>
          {label}{required ? <i aria-hidden="true">*</i> : null}
        </label>
      ) : null}
      {children}
      {hint ? <small className="bk-hint">{hint}</small> : null}
    </div>
  );
}

export function Grid({ cols = 2, children }) {
  return <div className={`bk-grid cols-${cols}`}>{children}</div>;
}

export function TextInput(props) {
  return <input className="bk-input" type="text" autoComplete="off" {...props} />;
}

export function DateInput({ value, onChange, min, max, required, id }) {
  return (
    <input
      id={id}
      className="bk-input bk-date"
      type="date"
      value={value || ''}
      min={min || undefined}
      max={max || undefined}
      required={required}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

// A place box. It suggests real places (restaurants, hotels, addresses) as you type, using Google
// when it works and OpenStreetMap otherwise. `kind` is 'restaurant', 'hotel' or 'any'.
// `onPick` receives { name, address, position, website } when a suggestion is chosen.
export function PlaceInput({ value, onChange, placeholder, id, required, kind = 'any', onPick, fill = 'address' }) {
  const search = async (text) => (await suggestPlaces(text, { kind })).map((place) => ({
    key: place.key,
    title: place.name,
    detail: place.detail,
    value: fill === 'name' ? place.name : place.address,
    data: place,
  }));
  return (
    <Suggest
      id={id}
      value={value}
      onChange={onChange}
      onPick={onPick}
      search={search}
      placeholder={placeholder}
      required={required}
      minChars={3}
      delay={380}
    />
  );
}
export function Stepper({ value, onChange, min = 1, max = 99, label }) {
  const number = Number(value) || min;
  return (
    <div className="bk-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, number - 1))} disabled={number <= min} aria-label="Fewer">−</button>
      <strong>{number}</strong>
      <button type="button" onClick={() => onChange(Math.min(max, number + 1))} disabled={number >= max} aria-label="More">+</button>
    </div>
  );
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div className="bk-chips" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          className={`bk-chip${value === option.value ? ' is-on' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.glyph ? <Glyph name={option.glyph} size={18} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Optional extras are tucked away so the form stays short.
export function More({ label = 'More Details', children, startOpen = false }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className={`bk-more${open ? ' is-open' : ''}`}>
      <button type="button" className="bk-more-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <Glyph name="chevron" size={16} />
        {label}
        <em>Optional</em>
      </button>
      {open ? <div className="bk-more-body">{children}</div> : null}
    </div>
  );
}

// The whole sheet: coloured header, optional "read my confirmation" strip, body, footer.
export function FormSheet({
  category,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitLabel,
  busy,
  error,
  warning,
  done,
  onAnother,
  upload,
  children,
  canAddAnother = true,
}) {
  const meta = CATEGORIES[category];
  return (
    <div className="bk-form" style={{ '--cat': meta.color, '--cat-tint': meta.tint }}>
      <header className="bk-head">
        <span className="bk-head-icon"><Glyph name={meta.glyph} size={24} /></span>
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button type="button" className="bk-x" onClick={onClose} aria-label="Close">×</button>
      </header>

      {done ? (
        <div className="bk-done">
          <span className="bk-done-mark"><Glyph name="check" size={30} /></span>
          <h3>{done.title}</h3>
          {done.text ? <p>{done.text}</p> : null}
          <div className="bk-done-actions">
            <button type="button" className="bk-btn primary" onClick={onClose}>Done</button>
            {canAddAnother && onAnother ? <button type="button" className="bk-btn" onClick={onAnother}>Add Another</button> : null}
          </div>
        </div>
      ) : (
        <form className="bk-body" onSubmit={onSubmit} noValidate={false}>
          {upload ? (
            <div className="bk-upload">
              <div>
                <strong>Have A Confirmation?</strong>
                <span>Upload it and we will fill this in for you.</span>
              </div>
              <UploadFile compact buttonLabel="Upload Confirmation" bookingType={upload.type} onExtractedData={upload.onData} />
            </div>
          ) : null}

          {children}

          {warning ? (
            <div className="bk-banner is-warn" role="alert">
              <strong>{warning.title}</strong>
              <span>{warning.text}</span>
              <div>
                <button type="button" className="bk-btn small" onClick={warning.onCancel}>Change It</button>
                <button type="button" className="bk-btn small primary" onClick={warning.onConfirm}>Add Anyway</button>
              </div>
            </div>
          ) : null}
          {error ? <div className="bk-banner is-error" role="alert">{error}</div> : null}

          <footer className="bk-foot">
            <button type="button" className="bk-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="bk-btn primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
          </footer>
        </form>
      )}
    </div>
  );
}
