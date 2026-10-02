import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../../api/apiClient';
import BookingFormModal from '../Itinerary/components/BookingFormModal';
import TimeField, { timeLabel } from '../Itinerary/components/formKit/TimeField';
import { Chips, Field, Grid, TextInput } from '../Itinerary/components/formKit/FormKit';
import { Glyph, transportGlyph } from '../Itinerary/components/overview/glyphs';
import { addDays, dayKey, formatDay } from '../Itinerary/components/overview/overviewModel';
import { CATEGORIES } from '../../utils/bookingTheme';
import { fetchTripBookings, findOnTrip } from '../../utils/tripBookings';
import './AddToTripDialog.css';

const TYPES = ['activity', 'restaurant', 'hotel', 'transport'].map((id) => ({
  value: id,
  label: CATEGORIES[id].label,
  glyph: CATEGORIES[id].glyph,
}));

const guessBookingType = (stop) => {
  const text = `${stop.type || ''} ${stop.place || ''}`.toLowerCase();
  if (/restaurant|food|caf[eé]|bistro|bar\b|brasserie|diner|bakery/.test(text)) return 'restaurant';
  if (/\bstay\b|hotel|hostel|resort|inn\b|b&b/.test(text)) return 'hotel';
  if (/transit|station|train|bus|metro|tram|taxi|airport/.test(text)) return 'transport';
  return 'activity';
};

const WHEN_TIMES = [
  [/breakfast/i, '08:30'],
  [/late\s+morning/i, '11:00'],
  [/morning/i, '09:30'],
  [/lunch/i, '12:30'],
  [/afternoon/i, '14:30'],
  [/dinner/i, '19:30'],
  [/evening/i, '18:30'],
  [/night/i, '21:00'],
];

const defaultTime = (stop) => {
  const clock = /^(\d{1,2}):(\d{2})$/.exec(stop.time || '');
  if (clock) return `${clock[1].padStart(2, '0')}:${clock[2]}`;
  const found = WHEN_TIMES.find(([pattern]) => pattern.test(stop.when || ''));
  return found ? found[1] : '10:00';
};

const transportMethod = (stop) => {
  const glyph = transportGlyph(`${stop.place} ${stop.type}`);
  if (glyph === 'train') return 'Train';
  if (glyph === 'bus') return 'Bus';
  if (glyph === 'taxi') return 'Taxi';
  if (glyph === 'flight') return 'Plane';
  return 'Other';
};

const minutesOf = (clock) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clock || '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const clockOf = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

// The nearest time to what Leo suggested that does not collide with something already planned that day.
const fitTime = (wanted, planned) => {
  const target = minutesOf(wanted);
  if (target == null) return { time: wanted, because: null };
  const taken = planned.map((item) => ({ item, at: minutesOf(item.time) })).filter((entry) => entry.at != null);
  const clash = (minutes) => taken.find((entry) => Math.abs(entry.at - minutes) < 90);
  if (!clash(target)) return { time: wanted, because: null };
  for (let step = 30; step <= 240; step += 30) {
    for (const candidate of [target + step, target - step]) {
      if (candidate >= 7 * 60 && candidate <= 23 * 60 && !clash(candidate)) {
        return { time: clockOf(candidate), because: clash(target).item };
      }
    }
  }
  return { time: wanted, because: null };
};

const bookingUrl = (stop, city, country) => stop.website || stop.url
  || `https://www.google.com/search?q=${encodeURIComponent(`book a table ${stop.place} ${city} ${country}`)}`;

// "Would you like to add this to your trip?" Pick a day and a time and Leo does the rest.
// Activities are added straight away, restaurants can be reserved on the restaurant's own site
// and filled in with the confirmation, and anything bigger opens a form that is already filled in.
function AddToTripDialog({ stop, city, country, scopedItineraryId, initialDay, onClose, onAdded }) {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState(scopedItineraryId ? String(scopedItineraryId) : '');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(() => defaultTime(stop));
  const [timeTouched, setTimeTouched] = useState(false);
  const [type, setType] = useState(() => guessBookingType(stop));
  const [step, setStep] = useState('pick');
  const [bookings, setBookings] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const [fresh, setFresh] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (scopedItineraryId) {
          const response = await apiClient.get(`/itineraries/${scopedItineraryId}`);
          if (!cancelled) setTrips(response.data ? [response.data] : []);
        } else {
          const response = await apiClient.get('/itineraries');
          if (cancelled) return;
          const list = Array.isArray(response.data) ? response.data : [];
          const place = String(city || '').trim().toLowerCase();
          const matched = list.filter((trip) => place && String(trip.destinations || '').toLowerCase().includes(place));
          setTrips(matched);
          if (matched[0]) setTripId(String(matched[0].itinerary_id));
        }
      } catch (error) {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [scopedItineraryId, city]);

  const trip = trips.find((entry) => String(entry.itinerary_id) === String(tripId)) || null;

  // What is already on this trip, so we can say so instead of asking again.
  useEffect(() => {
    if (!trip) return undefined;
    let cancelled = false;
    setBookings(null);
    fetchTripBookings(trip.itinerary_id).then((list) => { if (!cancelled) setBookings(list); });
    return () => { cancelled = true; };
  }, [trip?.itinerary_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const existing = !fresh && bookings ? findOnTrip(bookings, stop.place) : null;

  const options = useMemo(() => {
    const first = dayKey(trip?.start_date);
    const last = dayKey(trip?.end_date) || first;
    if (!first) return [];
    const list = [];
    for (let key = first, count = 0; key <= last && count < 60; key = addDays(key, 1), count += 1) {
      list.push({ key, number: count + 1 });
    }
    return list;
  }, [trip]);

  // Pick a sensible day: the day Leo suggested, the day you are planning, or day one.
  useEffect(() => {
    if (options.length === 0) {
      setDate('');
      return;
    }
    const offset = Math.max(0, (stop.dayNumber || 1) - 1);
    const fromDay = initialDay && options.some((option) => option.key === initialDay) ? addDays(initialDay, offset) : '';
    const wanted = fromDay && options.some((option) => option.key === fromDay)
      ? fromDay
      : (stop.dayNumber && options[stop.dayNumber - 1] ? options[stop.dayNumber - 1].key : '');
    const planning = options.find((option) => option.key === initialDay)?.key || '';
    setDate((current) => (options.some((option) => option.key === current) ? current : (wanted || planning || options[0].key)));
  }, [options, stop.dayNumber, initialDay]);

  // A time that works around what is already planned that day, unless you pick your own.
  const planned = useMemo(
    () => (bookings || []).filter((item) => item.date === date && (item.type === 'activity' || item.type === 'restaurant') && item.time),
    [bookings, date]
  );
  const suggestion = useMemo(() => fitTime(defaultTime(stop), planned), [stop, planned]);
  useEffect(() => {
    if (!timeTouched && bookings) setTime(suggestion.time);
  }, [suggestion, timeTouched, bookings]);

  const place = [stop.place, city, country].filter(Boolean).join(', ');
  const description = [stop.note, stop.cost ? `Estimated cost: ${stop.cost}` : ''].filter(Boolean).join(' · ');
  const category = CATEGORIES[existing && step === 'pick' ? existing.type : type];
  const dayLabel = date ? formatDay(date, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  const finish = (changed) => {
    saved.current = true;
    onAdded(trip, { changed: Boolean(changed) });
  };

  // Add it right now, with no form in the way.
  const addDirect = async (note) => {
    if (!trip || !date) return;
    setSaving(true);
    setProblem('');
    try {
      const base = `/itineraries/${trip.itinerary_id}`;
      if (type === 'activity') {
        await apiClient.post(`${base}/activities`, {
          title: stop.place,
          description,
          location: place,
          activity_date: date,
          start_time: time || null,
          end_time: null,
          reservation_number: '',
          itinerary_id: trip.itinerary_id,
        });
      } else {
        await apiClient.post(`${base}/restaurants`, {
          restaurant_name: stop.place,
          reservation_date: date,
          reservation_time: time || '19:00',
          guest_number: '2',
          address: place,
          booking_confirmation: (note || '').trim(),
          itinerary_id: trip.itinerary_id,
        });
      }
      finish(false);
    } catch (error) {
      console.error('Failed to add to trip:', error);
      setProblem('We could not add that. Please try again.');
      setSaving(false);
    }
  };

  const reserveOnline = () => {
    window.open(bookingUrl(stop, city, country), '_blank', 'noopener,noreferrer');
    setStep('reserve');
  };

  // The booking form (for hotels and transport), or to change something that is already added.
  if ((step === 'form' || step === 'edit') && trip) {
    const editing = step === 'edit' && existing;
    return (
      <BookingFormModal
        type={editing ? existing.type : type}
        edit={editing ? existing.raw : undefined}
        itineraryId={trip.itinerary_id}
        startDate={trip.start_date}
        endDate={trip.end_date}
        prefill={editing ? undefined : {
          title: stop.place,
          location: place,
          description,
          date,
          time,
          method: type === 'transport' ? transportMethod(stop) : '',
          website: type === 'restaurant' ? bookingUrl(stop, city, country) : '',
        }}
        note={editing ? undefined : `Leo filled in what he knows about ${stop.place}. Check the details and save.`}
        onAdded={() => { saved.current = true; }}
        onClose={() => {
          if (saved.current) onAdded(trip, { changed: Boolean(editing) });
          else setStep('pick');
        }}
      />
    );
  }

  const directType = type === 'activity' || type === 'restaurant';

  return createPortal(
    <div className="atd-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div
        className="bk-form atd-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Add To Trip"
        style={{ '--cat': category.color, '--cat-tint': category.tint }}
      >
        <header className="bk-head">
          <span className="bk-head-icon"><Glyph name={category.glyph} size={24} /></span>
          <div>
            <h2>{stop.place}</h2>
            <p>
              {[stop.type, stop.cost ? (/^free$/i.test(stop.cost) ? 'Free' : stop.cost) : ''].filter(Boolean).join(' · ') || `${city}, ${country}`}
            </p>
          </div>
          <button type="button" className="bk-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="bk-body">
          {loading ? <p className="atd-muted">Loading your trips…</p> : null}
          {failed ? <div className="bk-banner is-error">Could not load your trips. Try again in a moment.</div> : null}
          {!loading && !failed && trips.length === 0 ? (
            <p className="atd-muted">You do not have an itinerary yet. Create one first, then come back and add this.</p>
          ) : null}

          {trip && bookings === null ? <p className="atd-muted">Checking your trip…</p> : null}

          {/* Already on the trip: say so, and only ask if you want to change it. */}
          {trip && existing && step === 'pick' ? (
            <>
              <div className="atd-have">
                <span className="atd-have-mark"><Glyph name="check" size={22} /></span>
                <div>
                  <strong>Already On {trip.title || 'Your Trip'}</strong>
                  <span>
                    {CATEGORIES[existing.type].label}
                    {existing.date ? ` · ${formatDay(existing.date, { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}
                    {existing.time ? ` · ${timeLabel(existing.time)}` : ''}
                  </span>
                </div>
              </div>
              <footer className="bk-foot">
                <button type="button" className="bk-btn" onClick={() => setFresh(true)}>Add Another</button>
                <button type="button" className="bk-btn" onClick={() => setStep('edit')}>Change It</button>
                <button type="button" className="bk-btn primary" onClick={onClose}>Keep It</button>
              </footer>
            </>
          ) : null}

          {trip && bookings !== null && !(existing && step === 'pick') && step === 'pick' ? (
            <>
              {!scopedItineraryId && trips.length > 1 ? (
                <Field label="Trip" htmlFor="atd-trip">
                  <select id="atd-trip" className="bk-input" value={tripId} onChange={(event) => setTripId(event.target.value)}>
                    {trips.map((entry) => (
                      <option key={entry.itinerary_id} value={entry.itinerary_id}>
                        {entry.title}{entry.destinations ? ` · ${entry.destinations}` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : <p className="atd-trip">{trip.title}</p>}

              <Field label="Add It As">
                <Chips options={TYPES} value={type} onChange={setType} label="Booking Type" />
              </Field>

              <Grid cols={2}>
                <Field label="Day" htmlFor="atd-day">
                  <select id="atd-day" className="bk-input" value={date} onChange={(event) => setDate(event.target.value)} disabled={options.length === 0}>
                    {options.length === 0 ? <option value="">This trip has no dates</option> : null}
                    {options.map((option) => (
                      <option key={option.key} value={option.key}>
                        {formatDay(option.key, { weekday: 'short', month: 'short', day: 'numeric' })} · Day {option.number}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Time">
                  <TimeField value={time} onChange={(value) => { setTime(value); setTimeTouched(true); }} clearable={false} />
                </Field>
              </Grid>

              {!timeTouched && suggestion.because ? (
                <p className="atd-fit">
                  <Glyph name="sparkle" size={14} />
                  Moved to {timeLabel(suggestion.time)} to fit around {suggestion.because.title} at {timeLabel(suggestion.because.time)}.
                </p>
              ) : null}
              {type === 'activity' ? <p className="atd-fit"><Glyph name="sparkle" size={14} />Leo adds it straight to {dayLabel || 'your trip'}. No form needed.</p> : null}
              {type === 'restaurant' ? (
                <p className="atd-fit"><Glyph name="sparkle" size={14} />Leo cannot check tables for you, so reserve on their site and he will fill in your confirmation.</p>
              ) : null}

              {problem ? <div className="bk-banner is-error" role="alert">{problem}</div> : null}

              <footer className="bk-foot">
                <button type="button" className="bk-btn" onClick={onClose}>Not Now</button>
                {type === 'activity' ? (
                  <>
                    <button type="button" className="bk-btn" disabled={!date || saving} onClick={() => setStep('form')}>Edit Details</button>
                    <button type="button" className="bk-btn primary" disabled={!date || saving} onClick={() => addDirect()}>
                      {saving ? 'Adding…' : 'Add To Trip'}
                    </button>
                  </>
                ) : null}
                {type === 'restaurant' ? (
                  <>
                    <button type="button" className="bk-btn" disabled={!date || saving} onClick={() => addDirect()}>
                      {saving ? 'Adding…' : 'Just Add It'}
                    </button>
                    <button type="button" className="bk-btn primary" disabled={!date || saving} onClick={reserveOnline}>Reserve Online</button>
                  </>
                ) : null}
                {!directType ? (
                  <button type="button" className="bk-btn primary" disabled={!date} onClick={() => setStep('form')}>Continue</button>
                ) : null}
              </footer>
            </>
          ) : null}

          {/* Booked on the restaurant's own website: come back with the confirmation. */}
          {trip && step === 'reserve' ? (
            <>
              <div className="atd-have is-wait">
                <span className="atd-have-mark"><Glyph name="external" size={20} /></span>
                <div>
                  <strong>Finish Booking On Their Website</strong>
                  <span>{stop.place} · {dayLabel} · {timeLabel(time)}</span>
                </div>
              </div>
              <Field label="Confirmation Number" hint="Paste it here once you have booked, and Leo adds it to your trip.">
                <TextInput value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Booking reference" maxLength={80} autoFocus />
              </Field>
              {problem ? <div className="bk-banner is-error" role="alert">{problem}</div> : null}
              <footer className="bk-foot">
                <button type="button" className="bk-btn" onClick={() => setStep('pick')}>Back</button>
                <button type="button" className="bk-btn" onClick={() => window.open(bookingUrl(stop, city, country), '_blank', 'noopener,noreferrer')}>Open Site Again</button>
                <button type="button" className="bk-btn primary" disabled={saving} onClick={() => addDirect(confirmation)}>
                  {saving ? 'Adding…' : (confirmation.trim() ? 'Add With Confirmation' : 'Add Without It')}
                </button>
              </footer>
            </>
          ) : null}

          {!trip && !loading ? (
            <footer className="bk-foot">
              <button type="button" className="bk-btn" onClick={onClose}>Close</button>
            </footer>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AddToTripDialog;
