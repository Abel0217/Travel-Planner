import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Glyph } from './glyphs';
import { TYPE_META } from './overviewModel';
import {
  formatDistance, formatMinutes, geocodeQuery, haversineKm, routeBetween, suggestPlaces, transitUrl,
} from '../../../../utils/tripGeo';

const MODES = [
  { key: 'walk', label: 'Walk', glyph: 'walk' },
  { key: 'transit', label: 'Transit', glyph: 'bus' },
  { key: 'drive', label: 'Drive', glyph: 'car' },
];

// One end of the trip: pick something already booked, search for any place, or use where you are.
function Endpoint({ label, value, onChange, places, placeholder }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 3) {
      setFound([]);
      setBusy(false);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    const handle = window.setTimeout(async () => {
      const results = await suggestPlaces(query, {});
      if (cancelled) return;
      setFound(results);
      setBusy(false);
    }, 420);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [text]);

  useEffect(() => {
    const onPointer = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  const pick = (next) => {
    onChange(next);
    setText('');
    setFound([]);
    setOpen(false);
  };

  const pickFound = async (place) => {
    const position = place.position || await geocodeQuery(place.address);
    if (!position) return;
    pick({ title: place.name, sub: place.detail, position, type: 'pin', query: place.address });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (result) => pick({
        title: 'Current Location', sub: 'Where you are now', type: 'pin', query: '',
        position: { lat: result.coords.latitude, lng: result.coords.longitude },
      }),
      () => {},
      { timeout: 8000 }
    );
  };

  const needle = text.trim().toLowerCase();
  const booked = places.filter((place) => !needle || place.title.toLowerCase().includes(needle) || (place.sub || '').toLowerCase().includes(needle));

  if (value) {
    const meta = TYPE_META[value.type];
    return (
      <div className="dir-endpoint is-set">
        <span className="dir-label">{label}</span>
        <button
          type="button"
          className="dir-chosen"
          style={{ '--pin': meta ? meta.color : '#222946' }}
          onClick={() => { onChange(null); window.setTimeout(() => inputRef.current && inputRef.current.focus(), 30); }}
          title="Change"
        >
          <span className="dir-chosen-icon"><Glyph name={meta ? (value.icon || value.type) : 'pin'} size={15} /></span>
          <span className="dir-chosen-text">
            <strong>{value.title}</strong>
            {value.sub ? <em>{value.sub}</em> : null}
          </span>
          <span className="dir-chosen-x" aria-hidden="true">×</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dir-endpoint" ref={boxRef}>
      <span className="dir-label">{label}</span>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        onChange={(event) => { setText(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
      />
      {busy ? <span className="dir-busy" aria-hidden="true" /> : null}
      {open ? (
        <div className="dir-menu" role="listbox">
          {!needle ? (
            <button type="button" className="dir-option" style={{ '--pin': '#222946' }} onClick={useMyLocation}>
              <span className="dir-chosen-icon"><Glyph name="pin" size={15} /></span>
              <span className="dir-chosen-text"><strong>Current Location</strong><em>Use where you are right now</em></span>
            </button>
          ) : null}
          {booked.length > 0 ? <p className="dir-menu-title">Your Trip</p> : null}
          {booked.map((place) => {
            const meta = TYPE_META[place.type];
            return (
              <button type="button" key={place.id} className="dir-option" style={{ '--pin': meta.color }} onClick={() => pick(place)}>
                <span className="dir-chosen-icon"><Glyph name={place.icon || place.type} size={15} /></span>
                <span className="dir-chosen-text">
                  <strong>{place.title}</strong>
                  <em>{place.sub}</em>
                </span>
              </button>
            );
          })}
          {found.length > 0 ? <p className="dir-menu-title">Other Places</p> : null}
          {found.map((place) => (
            <button type="button" key={place.key} className="dir-option" style={{ '--pin': '#5c6b8a' }} onClick={() => pickFound(place)}>
              <span className="dir-chosen-icon"><Glyph name="pin" size={15} /></span>
              <span className="dir-chosen-text"><strong>{place.name}</strong><em>{place.detail}</em></span>
            </button>
          ))}
          {booked.length === 0 && found.length === 0 && needle.length >= 3 && !busy ? (
            <p className="dir-menu-empty">Nothing found. Try the name and the city.</p>
          ) : null}
          {needle.length > 0 && needle.length < 3 && booked.length === 0 ? (
            <p className="dir-menu-empty">Keep typing…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Directions inside the app. Pick two places (from your bookings or anywhere) and see the route.
function DirectionsPanel({ places, initialFrom, initialTo, onClose, onTrace }) {
  const [from, setFrom] = useState(initialFrom || null);
  const [to, setTo] = useState(initialTo || null);
  const [mode, setMode] = useState('walk');
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setFrom(initialFrom || null); }, [initialFrom]);
  useEffect(() => { setTo(initialTo || null); }, [initialTo]);

  const ready = Boolean(from && to);
  const fromKey = from ? `${from.position.lat},${from.position.lng}` : '';
  const toKey = to ? `${to.position.lat},${to.position.lng}` : '';

  useEffect(() => {
    if (!ready) {
      setRoutes(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [foot, car] = await Promise.all([
        routeBetween(from.position, to.position, 'foot'),
        routeBetween(from.position, to.position, 'car'),
      ]);
      if (cancelled) return;
      const straight = haversineKm(from.position, to.position) || 0;
      const line = [from.position, to.position];
      const walk = foot || { km: straight * 1.25, minutes: Math.max(1, Math.round(((straight * 1.25) / 4.8) * 60)), path: line, rough: true };
      const drive = car || { km: straight * 1.3, minutes: Math.max(2, Math.round(((straight * 1.3) / 28) * 60 + 3)), path: line, rough: true };
      const transit = {
        km: drive.km,
        minutes: Math.max(5, Math.round((drive.km / 17) * 60 + 8)),
        path: drive.path,
        rough: true,
      };
      setRoutes({ walk, transit, drive });
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey]);

  useEffect(() => {
    if (!ready || !routes) {
      onTrace(null);
      return;
    }
    onTrace({ path: routes[mode].path, from, to, mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, mode, fromKey, toKey]);

  useEffect(() => () => onTrace(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const swap = () => { setFrom(to); setTo(from); };

  const externalUrl = useMemo(() => {
    if (!ready) return '';
    const point = (end) => (end.query || `${end.position.lat},${end.position.lng}`);
    const base = transitUrl(point(from), point(to));
    return mode === 'transit' ? base : base.replace('travelmode=transit', `travelmode=${mode === 'walk' ? 'walking' : 'driving'}`);
  }, [ready, from, to, mode]);

  const sorted = useMemo(() => places, [places]);

  return (
    <div className="dir-panel" role="dialog" aria-label="Directions">
      <header className="dir-head">
        <strong><Glyph name="route" size={17} /> Directions</strong>
        <button type="button" className="dir-close" onClick={onClose} aria-label="Close Directions">×</button>
      </header>

      <div className="dir-fields">
        <Endpoint label="From" value={from} onChange={setFrom} places={sorted.filter((place) => !to || place.id !== to.id)} placeholder="Choose a booking or search a place" />
        <button type="button" className="dir-swap" onClick={swap} aria-label="Swap From And To" title="Swap">⇅ Swap</button>
        <Endpoint label="To" value={to} onChange={setTo} places={sorted.filter((place) => !from || place.id !== from.id)} placeholder="Where to?" />
      </div>

      {ready ? (
        <>
          <div className="dir-modes" role="tablist" aria-label="How You Are Getting There">
            {MODES.map((item) => (
              <button
                type="button"
                role="tab"
                key={item.key}
                aria-selected={mode === item.key}
                className={`dir-mode${mode === item.key ? ' is-on' : ''}`}
                onClick={() => setMode(item.key)}
              >
                <Glyph name={item.glyph} size={17} />
                <b>{routes ? formatMinutes(routes[item.key].minutes) : '…'}</b>
                <em>{routes ? formatDistance(routes[item.key].km) : item.label}</em>
              </button>
            ))}
          </div>
          <p className="dir-note">
            {loading ? 'Finding the route…' : (
              <>
                {MODES.find((item) => item.key === mode).label} · {routes ? formatDistance(routes[mode].km) : ''}
                {mode === 'transit' ? ' · Estimate, check live times in Google Maps' : (routes && routes[mode].rough ? ' · Approximate' : '')}
              </>
            )}
          </p>
          <a className="dir-external" href={externalUrl} target="_blank" rel="noopener noreferrer">
            <Glyph name="external" size={14} /> Open In Google Maps
          </a>
        </>
      ) : (
        <p className="dir-hint">Pick where you are starting and where you are going. Anything you have already booked is one tap away.</p>
      )}
    </div>
  );
}

export default DirectionsPanel;
