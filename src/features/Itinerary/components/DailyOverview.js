import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import Modal from 'react-modal';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import apiClient from '../../../api/apiClient';
import { AuthContext } from '../../../Contexts/AuthContext';
import { db } from '../../../firebaseConfig';
import { fetchWeather } from '../../../api/weatherApi';
import { openLeoForItinerary } from '../../../utils/itineraryContext';
import { CATEGORIES, CATEGORY_ORDER } from '../../../utils/bookingTheme';
import useMapProvider from '../../../utils/useMapProvider';
import { formatDistance, formatMinutes, geocodeQuery, haversineKm, setSearchBias, travelTimes, walkInfo } from '../../../utils/tripGeo';
import BookingFormModal from './BookingFormModal';
import TripMap from './overview/TripMap';
import DirectionsPanel from './overview/DirectionsPanel';
import { Glyph } from './overview/glyphs';
import {
    DAY_COLORS,
    TYPE_META,
    buildDays,
    dayKey,
    daysBetween,
    formatDay,
    todayKey,
} from './overview/overviewModel';
import './css/DailyOverview.css';
import './css/TripOverview.css';

Modal.setAppElement('#root');

const MAP_LIBRARIES = ['places'];
const EMPTY_DATA = { activities: [], hotels: [], flights: [], restaurants: [], transport: [] };

function Icon({ name, size = 18 }) {
    return <Glyph name={name} size={size} />;
}
const weatherIcon = (url) => (url && url.startsWith('//') ? `https:${url}` : url);

const nextStartAfter = (items, item) => {
    if (item.startMin == null) return null;
    let next = null;
    items.forEach((other) => {
        if (other.id === item.id || other.startMin == null || other.startMin <= item.startMin) return;
        if (next == null || other.startMin < next) next = other.startMin;
    });
    return next;
};

// Past days are finished. Today is in progress from the start time until the
// end time, the next stop, or the end of the day. A tap can finish it sooner.
const bookingState = (day, item, items, manual, now) => {
    if (manual) return 'done';
    const today = todayKey();
    if (!day.key || day.key > today) return null;
    if (day.key < today) return 'done';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (item.startMin == null) return 'live';
    if (nowMin < item.startMin) return null;
    let end = item.endMin;
    if (end == null || end <= item.startMin) {
        const later = nextStartAfter(items, item);
        end = later == null ? 24 * 60 : later;
    }
    return nowMin >= end ? 'done' : 'live';
};

const DailyOverview = ({ itineraryId, destination, startDate, endDate, center, preloaded }) => {
    const navigate = useNavigate();
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
        libraries: MAP_LIBRARIES,
    });
    const provider = useMapProvider(loadError);
    const geoReady = isLoaded || Boolean(loadError) || provider === 'osm';

    const [data, setData] = useState(preloaded || EMPTY_DATA);
    const [loaded, setLoaded] = useState(Boolean(preloaded));
    const [geo, setGeo] = useState({});
    const [destCenter, setDestCenter] = useState(null);
    const [weather, setWeather] = useState({});
    const [isCelsius, setIsCelsius] = useState(true);
    const [focusDay, setFocusDay] = useState('all');
    const [openDay, setOpenDay] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [picker, setPicker] = useState({ open: false, date: '' });
    const { currentUser } = useContext(AuthContext);
    const [spend, setSpend] = useState(null);
    const [dir, setDir] = useState({ open: false, from: null, to: null });
    const [trace, setTrace] = useState(null);
    const [form, setForm] = useState({ type: null, date: '' });
    const [nowTick, setNowTick] = useState(() => Date.now());
    const [doneIds, setDoneIds] = useState(() => new Set());
    const chipsRef = useRef(null);
    const geoRef = useRef({});
    const didAutoOpen = useRef(false);

    useEffect(() => {
        const timer = setInterval(() => setNowTick(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(`tp-done-${itineraryId}`) || '[]');
            setDoneIds(new Set(Array.isArray(saved) ? saved : []));
        } catch (error) {
            setDoneIds(new Set());
        }
    }, [itineraryId]);

    const markDone = (itemId) => {
        setDoneIds((current) => {
            const next = new Set(current);
            next.add(itemId);
            localStorage.setItem(`tp-done-${itineraryId}`, JSON.stringify([...next]));
            return next;
        });
    };

    const baseCenter = center || destCenter;
    useEffect(() => { setSearchBias(baseCenter); }, [baseCenter]);

    const fetchAllData = useCallback(async () => {
        if (preloaded || !itineraryId) return;
        const get = (path) => apiClient.get(`/itineraries/${itineraryId}/${path}`).then((response) => response.data || []).catch(() => []);
        const [activities, hotels, flights, restaurants, transport] = await Promise.all([
            get('activities'), get('hotels'), get('flights'), get('restaurants'), get('transport'),
        ]);
        setData({ activities, hotels, flights, restaurants, transport });
        setLoaded(true);
    }, [itineraryId, preloaded]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Live updates: when someone adds a booking, fetch the fresh list.
    useEffect(() => {
        if (preloaded || !itineraryId) return undefined;
        let timer = null;
        const refresh = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(fetchAllData, 400);
        };
        const unsubscribers = ['activities', 'hotels', 'flights', 'restaurants', 'transport'].map((name) => {
            let first = true;
            try {
                return onSnapshot(
                    query(collection(db, name), where('itineraryId', '==', itineraryId)),
                    () => {
                        if (first) {
                            first = false;
                            return;
                        }
                        refresh();
                    },
                    () => {}
                );
            } catch (error) {
                return () => {};
            }
        });
        return () => {
            window.clearTimeout(timer);
            unsubscribers.forEach((stop) => stop());
        };
    }, [itineraryId, preloaded, fetchAllData]);

    const { days } = useMemo(
        () => buildDays({ startDate, endDate, destination, data }),
        [startDate, endDate, destination, data]
    );

    // What the trip has cost so far, and the part that is yours.
    const loadSpend = useCallback(async () => {
        if (preloaded || !itineraryId) return;
        try {
            const response = await apiClient.get(`/expenses/itinerary/${itineraryId}`);
            const board = response.data || {};
            const mine = (board.balances || []).find((person) => person.uid === currentUser?.uid);
            setSpend({ total: Number(board.tripTotal || 0), share: Number(mine?.owed || 0), count: (board.expenses || []).length });
        } catch (error) {
            setSpend({ total: 0, share: 0, count: 0, failed: true });
        }
    }, [itineraryId, preloaded, currentUser?.uid]);

    useEffect(() => {
        loadSpend();
        const again = () => { if (document.visibilityState === 'visible') loadSpend(); };
        document.addEventListener('visibilitychange', again);
        return () => document.removeEventListener('visibilitychange', again);
    }, [loadSpend]);

    // Where the trip is, so the forecast and the map know where to look.
    useEffect(() => {
        if (center || !destination || !geoReady) return undefined;
        let cancelled = false;
        geocodeQuery(destination).then((position) => {
            if (!cancelled && position) setDestCenter(position);
        });
        return () => { cancelled = true; };
    }, [center, destination, geoReady]);

    // Weather for each day of the trip.
    useEffect(() => {
        if (preloaded || !baseCenter) return undefined;
        let cancelled = false;
        const tripDays = days.filter((day) => day.inTrip).slice(0, 16);
        Promise.all(tripDays.map((day) => fetchWeather(baseCenter.lat, baseCenter.lng, day.key).then((result) => [day.key, result]).catch(() => null)))
            .then((rows) => {
                if (cancelled) return;
                const next = {};
                rows.filter(Boolean).forEach(([key, result]) => { if (result) next[key] = result; });
                setWeather(next);
            });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseCenter?.lat, baseCenter?.lng, days.length, preloaded]);

    // Put every address on the map (cached, so it is quick the second time).
    const queries = useMemo(
        () => [...new Set(days.flatMap((day) => [...day.items.map((item) => item.query), day.staying?.query]).filter(Boolean))],
        [days]
    );
    const queriesKey = queries.join('||');

    useEffect(() => {
        if (!geoReady) return undefined;
        let cancelled = false;
        const need = queries.filter((place) => !(place in geoRef.current));
        if (need.length === 0) return undefined;
        (async () => {
            for (let i = 0; i < need.length; i += 4) {
                const chunk = need.slice(i, i + 4);
                // eslint-disable-next-line no-await-in-loop
                const found = await Promise.all(chunk.map((place) => geocodeQuery(place, baseCenter)));
                if (cancelled) return;
                chunk.forEach((place, index) => { geoRef.current[place] = found[index]; });
                setGeo({ ...geoRef.current });
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geoReady, queriesKey, provider]);

    // Open today (or the first day that has plans) once the data is in.
    useEffect(() => {
        if (didAutoOpen.current || !loaded || days.length === 0) return;
        didAutoOpen.current = true;
        const today = todayKey();
        const planned = days.filter((day) => day.inTrip);
        const pool = planned.length ? planned : days;
        const pick = pool.find((day) => day.key === today)
            || pool.find((day) => day.items.length > 0 && day.key >= today)
            || pool.find((day) => day.items.length > 0)
            || pool[0];
        setOpenDay(pick.key);
    }, [loaded, days]);

    const today = todayKey();
    const tripStart = dayKey(startDate);
    const tripEnd = dayKey(endDate);
    const tripDays = days.filter((day) => day.inTrip);

    // Distances for one day, using only the stops that made it onto the map.
    const dayFacts = (day) => {
        const stops = day.items.filter((item) => (item.type === 'activity' || item.type === 'food') && geo[item.query]);
        const hops = {};
        let km = 0;
        let minutes = 0;
        for (let i = 1; i < stops.length; i += 1) {
            const hop = walkInfo(geo[stops[i - 1].query], geo[stops[i].query]);
            if (hop) {
                hops[stops[i].id] = { ...hop, from: stops[i - 1].title, fromItem: stops[i - 1], toItem: stops[i], times: travelTimes(hop) };
                km += hop.km;
                minutes += hop.minutes;
            }
        }
        const base = day.staying ? geo[day.staying.query] : null;
        let farthest = null;
        if (base) {
            stops.forEach((item) => {
                const away = haversineKm(base, geo[item.query]);
                if (away != null && (!farthest || away > farthest.km)) farthest = { km: away, item };
            });
        }
        return { stops, hops, km, minutes, base, farthest };
    };

    // Everything the tracker needs, worked out once.
    const stats = useMemo(() => {
        const all = days.flatMap((day) => day.items);
        const real = (day) => day.items.filter((item) => item.type !== 'stay');
        let busiest = null;
        tripDays.forEach((day) => {
            const count = real(day).length;
            if (count > 0 && (!busiest || count > busiest.count)) busiest = { day, count };
        });
        let walkKm = 0;
        let walkLegs = 0;
        days.forEach((day) => {
            const stops = day.items.filter((item) => (item.type === 'activity' || item.type === 'food') && geo[item.query]);
            for (let i = 1; i < stops.length; i += 1) {
                const hop = walkInfo(geo[stops[i - 1].query], geo[stops[i].query]);
                if (hop) {
                    walkKm += hop.km;
                    walkLegs += 1;
                }
            }
        });
        return {
            total: tripDays.length,
            activities: all.filter((item) => item.type === 'activity').length,
            reservations: all.filter((item) => item.type === 'food').length,
            activityDays: tripDays.filter((day) => day.items.some((item) => item.type === 'activity')).length,
            mealDays: tripDays.filter((day) => day.items.some((item) => item.type === 'food')).length,
            plannedDays: tripDays.filter((day) => real(day).length > 0).length,
            freeDays: tripDays.filter((day) => real(day).length === 0),
            busiest,
            walkKm,
            walkLegs,
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days, tripDays.length, geo]);

    const weatherSummary = useMemo(() => {
        const list = Object.values(weather);
        if (list.length === 0) return null;
        return {
            low: Math.min(...list.map((item) => item.min_temp)),
            high: Math.max(...list.map((item) => item.max_temp)),
            wet: list.filter((item) => /rain|drizzle|shower|storm|snow|sleet/i.test(item.condition || '')).length,
            icon: list[0].icon,
            condition: list[0].condition,
        };
    }, [weather]);

    // The next thing on the calendar, so you always know what is coming up.
    const nextUp = useMemo(() => {
        const now = new Date();
        const nowKey = todayKey();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        for (const day of days) {
            if (day.key >= nowKey) {
                const item = day.items.find((entry) => {
                    if (entry.type === 'stay' && entry.tag === 'Check-Out') return false;
                    return day.key > nowKey || entry.sortMin > 24 * 60 || entry.sortMin >= nowMin;
                });
                if (item) return { item, day };
            }
        }
        return null;
    }, [days]);

    let status = { label: 'Trip Dates Not Set', note: '' };
    if (tripStart && tripEnd) {
        if (today < tripStart) {
            const away = daysBetween(today, tripStart);
            status = { label: away === 1 ? 'Starts Tomorrow' : `Starts In ${away} Days`, note: 'Countdown' };
        } else if (today <= tripEnd) {
            status = { label: `Day ${daysBetween(tripStart, today) + 1} Of ${daysBetween(tripStart, tripEnd) + 1}`, note: 'Happening Now' };
        } else {
            status = { label: 'Trip Completed', note: 'Welcome Home' };
        }
    }
    const progress = tripStart && tripEnd
        ? Math.min(100, Math.max(0, ((daysBetween(tripStart, today) + 1) / (daysBetween(tripStart, tripEnd) + 1)) * 100))
        : 0;

    const temp = (celsius) => `${Math.round(isCelsius ? celsius : (celsius * 9) / 5 + 32)}°${isCelsius ? 'C' : 'F'}`;

    const selectDay = (key) => {
        setOpenDay((current) => (current === key ? null : key));
        setFocusDay(key);
        setSelectedId(null);
    };

    const askLeo = async (dayToPlan, prompt) => {
        try {
            await openLeoForItinerary(
                apiClient,
                navigate,
                { itinerary_id: itineraryId, destinations: destination },
                {
                    day: typeof dayToPlan === 'string' ? dayToPlan : '',
                    prompt: prompt || '',
                }
            );
        } catch (error) {
            navigate('/travel-guide');
        }
    };

    const latestBooking = (day) => {
        const booked = day.items.filter((item) => item.type !== 'stay' && item.title);
        const timed = booked.filter((item) => item.startMin != null);
        const pool = timed.length ? timed : booked;
        if (!pool.length) return null;
        return pool.reduce((latest, item) => (item.startMin >= (latest.startMin ?? -1) ? item : latest));
    };

    const suggestNearby = (day, kind) => {
        const spot = latestBooking(day);
        if (!spot) return;
        const when = formatDay(day.key, { weekday: 'long', month: 'long', day: 'numeric' });
        const time = spot.timeLabel && spot.timeLabel !== 'Anytime' ? spot.timeLabel : '';
        const place = spot.address ? `${spot.title} (${spot.address})` : spot.title;
        const earlier = day.items
            .filter((item) => item.type !== 'stay' && item.id !== spot.id && item.startMin != null && (spot.startMin == null || item.startMin < spot.startMin))
            .sort((a, b) => a.startMin - b.startMin);
        const previous = earlier.length ? earlier[earlier.length - 1] : null;
        const gapFrom = previous?.startMin;
        const gapMin = gapFrom != null && spot.startMin != null ? spot.startMin - gapFrom : null;
        const gapLabel = gapMin >= 90
            ? (gapMin >= 120 ? `${Math.round(gapMin / 60)}-hour` : `${gapMin}-minute`)
            : '';
        const previousTime = previous && previous.timeLabel && previous.timeLabel !== 'Anytime' ? previous.timeLabel : '';
        const already = earlier
            .map((item) => [item.timeLabel && item.timeLabel !== 'Anytime' ? item.timeLabel : '', item.title].filter(Boolean).join(' '))
            .join(', ');
        const late = spot.startMin != null && spot.startMin >= 20 * 60;
        const lookingFor = kind === 'food' ? 'restaurants' : 'activities';
        let request;
        if (late && kind === 'activity') {
            request = gapLabel
                ? `Suggest activities near ${spot.title}: pre-dinner spots in that gap (sunset viewpoints, walks, or cocktail lounges between 5:00 PM and ${time || 'dinner'}) and late-night spots open past 11:00 PM (live music, a lounge, or a speakeasy).`
                : `Suggest activities near ${spot.title}: pre-dinner spots between 5:00 PM and ${time || 'the last stop'} (sunset viewpoints or cocktail lounges) and late-night spots open past 11:00 PM.`;
        } else if (late) {
            request = `Suggest places to eat or drink near ${spot.title}. Use the open time before ${time || 'that booking'} for an earlier bite or drinks, and after it for late-night spots such as dessert, a bar, a speakeasy, or a rooftop lounge. Do not replace the ${time || 'existing'} booking with another dinner.`;
        } else {
            request = `Suggest ${lookingFor} near ${spot.title} for the open afternoon or evening around this stop. Give each one a time that does not overlap ${time || 'the booking'}.`;
        }
        const gapSentence = gapLabel && previous
            ? ` There is a ${gapLabel} gap between ${previousTime ? `${previousTime} ` : ''}${previous.title} and ${time || spot.title}.`
            : (spot.startMin != null ? ` The day is open before ${time || 'that stop'}.` : '');
        askLeo(
            day.key,
            `Looking at ${when}, the last stop is ${place}${time ? ` at ${time}` : ''}.${gapSentence} Search only around that place, not another part of the city. ${request}${already ? ` Already booked: ${already}.` : ''} Do not suggest ${spot.title} again.`
        );
    };

    const openPicker = (date) => setPicker({ open: true, date });
    const startForm = (type, date) => {
        setForm({ type, date: date || picker.date });
        setPicker({ open: false, date: '' });
    };
    const closeForm = () => setForm({ type: null, date: '' });

    // The chosen date slides into view without moving the page.
    useEffect(() => {
        const strip = chipsRef.current;
        if (!strip) return;
        const chip = strip.querySelector(`[data-chip="${focusDay}"]`);
        if (!chip) return;
        strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
    }, [focusDay]);

    const insightsFor = (day, facts) => {
        const list = [];
        const real = day.items.filter((item) => item.type !== 'stay');
        if (real.length === 0) return list;
        const meals = day.items.filter((item) => item.type === 'food').length;
        const things = day.items.filter((item) => item.type === 'activity').length;
        if (things > 0 && meals === 0) list.push('No Restaurant Planned Yet');
        if (things + meals >= 6) list.push('Packed Day');
        if (Object.values(facts.hops).some((hop) => hop.level === 'far')) list.push('Long Hop Between Stops');
        if (facts.farthest && facts.farthest.km > 6) list.push('Stops Are Spread Out');
        return list;
    };

    const renderItem = (day, item, hop, facts) => {
        const meta = TYPE_META[item.type];
        const selected = selectedId === item.id;
        const state = bookingState(day, item, day.items, doneIds.has(item.id), new Date(nowTick));
        const placed = item.query ? geo[item.query] : undefined;
        const fromBase = facts.base && placed && item.type !== 'stay' && item.type !== 'flight'
            ? haversineKm(facts.base, placed)
            : null;
        return (
            <React.Fragment key={item.id}>
                {hop ? (
                    <li className={`ov-hop is-${hop.level}`} aria-label="Distance From The Previous Stop">
                        <span className="ov-hop-dist"><Icon name="route" size={14} />{formatDistance(hop.km)}</span>
                        <span className="ov-hop-modes">
                            <span title="Walking"><Icon name="walk" size={13} />{formatMinutes(hop.times.walk)}</span>
                            <span title="Public Transit (estimate)"><Icon name="bus" size={13} />{formatMinutes(hop.times.transit)}</span>
                            <span title="Driving (estimate)"><Icon name="car" size={13} />{formatMinutes(hop.times.drive)}</span>
                        </span>
                        {hop.level === 'far' ? <b>Consider A Ride</b> : null}
                        <button type="button" className="ov-hop-go" onClick={() => openDirections(hop.toItem, hop.fromItem)} title="See This Route">
                            <em>from {hop.from}</em>
                            <Icon name="chevron" size={13} />
                        </button>
                    </li>
                ) : null}                <li
                    className={`ov-item${selected ? ' is-selected' : ''}`}
                    style={{ '--pin': meta.color, '--tint': meta.tint }}
                >
                    <button
                        type="button"
                        className="ov-item-main"
                        onClick={() => {
                            setFocusDay(day.key);
                            setSelectedId(selected ? null : item.id);
                        }}
                    >
                        <span className="ov-item-time">{item.timeLabel || 'Anytime'}</span>
                        <span className="ov-item-badge" title={meta.label}>
                            <Icon name={item.icon || item.type} size={16} />
                        </span>
                        <span className="ov-item-body">
                            <span className="ov-item-title">
                                {item.title}
                                <em>{item.tag || meta.label}</em>
                                {state === 'done' ? <b className="ov-state is-done">Completed</b> : null}
                                {state === 'live' ? <b className="ov-state is-live">In Progress</b> : null}
                                {state === 'live' && item.endMin == null ? (
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        className="ov-done"
                                        title="Mark Completed"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            event.preventDefault();
                                            markDone(item.id);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return;
                                            event.stopPropagation();
                                            event.preventDefault();
                                            markDone(item.id);
                                        }}
                                    >
                                        ✓
                                    </span>
                                ) : null}
                            </span>
                            {item.subtitle ? <span className="ov-item-sub">{item.subtitle}</span> : null}
                            {item.address ? (
                                <span className="ov-item-addr"><Icon name="pin" size={13} />{item.address}</span>
                            ) : null}
                            <span className="ov-chips">
                                {fromBase != null ? <span className="ov-chip is-soft">{formatDistance(fromBase)} From Hotel</span> : null}
                                {item.approx && placed ? <span className="ov-chip is-warn">Approximate Pin</span> : null}
                                {item.query && placed === undefined && geoReady ? <span className="ov-chip is-soft">Placing On Map…</span> : null}
                                {item.query && placed === null ? <span className="ov-chip is-warn">Not Found On Map</span> : null}
                                {item.details.map(([label, value]) => (
                                    <span className="ov-chip" key={label}>{label}: {value}</span>
                                ))}
                            </span>
                        </span>
                    </button>
                    {item.query ? (
                        <button
                            type="button"
                            className="ov-item-go"
                            onClick={() => openDirections(item, null, day)}
                            aria-label={`Directions To ${item.title}`}
                            title="Directions"
                        >
                            <Icon name="route" size={16} />
                        </button>
                    ) : null}                </li>
            </React.Fragment>
        );
    };

    const renderDay = (day) => {
        const open = openDay === day.key;
        const isToday = day.key === today;
        const isPast = day.key < today;
        const color = DAY_COLORS[day.index % DAY_COLORS.length];
        const facts = dayFacts(day);
        facts.stayQuery = day.staying?.query || '';
        const insights = insightsFor(day, facts);
        const forecast = weather[day.key];
        const real = day.items.filter((item) => item.type !== 'stay');

        return (
            <section
                key={day.key}
                className={`ov-day${open ? ' is-open' : ''}${isPast ? ' is-past' : ''}${isToday ? ' is-today' : ''}${focusDay === day.key ? ' is-focus' : ''}`}
                style={{ '--day': color }}
            >
                <button type="button" className="ov-day-head" onClick={() => selectDay(day.key)} aria-expanded={open}>
                    <span className="ov-day-num">
                        <small>{formatDay(day.key, { month: 'short' })}</small>
                        {Number(day.key.slice(8))}
                    </span>
                    <span className="ov-day-title">
                        <strong>{formatDay(day.key)}</strong>
                        <span>
                            <b className="ov-daytag">{day.inTrip ? `Day ${day.num} Of ${tripDays.length}` : 'Extra Day'}</b>
                            {isToday ? <b className="ov-today">Today</b> : null}
                            {isPast ? <b className="ov-done">Completed</b> : null}
                            {real.length === 0 ? 'Nothing Booked Yet' : `${real.length} ${real.length === 1 ? 'Booking' : 'Bookings'}`}
                            {day.staying ? ` · ${day.staying.name}` : ''}
                        </span>
                    </span>
                    {forecast ? (
                        <span className="ov-weather" title={forecast.condition}>
                            <img src={weatherIcon(forecast.icon)} alt={forecast.condition} />
                            <span className="ov-weather-text">
                                <b>{temp(forecast.max_temp)}</b>
                                <em>{forecast.condition}</em>
                            </span>
                        </span>
                    ) : null}
                    <span className="ov-chevron"><Icon name="chevron" size={20} /></span>
                </button>

                {open ? (
                    <div className="ov-day-body">
                        {day.staying ? (
                            <div className="ov-stay">
                                <Icon name="stay" size={16} />
                                <span>
                                    {day.night ? `Night ${day.night} Of ${day.nights} At ` : 'Check-Out From '}
                                    <strong>{day.staying.name}</strong>
                                </span>
                            </div>
                        ) : null}

                        {(facts.stops.length > 1 || facts.farthest) ? (
                            <div className="ov-summary">
                                {facts.stops.length > 1 ? (
                                    <span><Icon name="route" size={15} /> About {formatDistance(facts.km)} between stops · {formatMinutes(facts.minutes)} walking</span>
                                ) : null}
                                {facts.farthest ? (
                                    <span><Icon name="pin" size={15} /> Farthest: {formatDistance(facts.farthest.km)} from your hotel</span>
                                ) : null}
                            </div>
                        ) : null}

                        {insights.length ? (
                            <div className="ov-insights">
                                {insights.map((note) => <span key={note}>{note}</span>)}
                            </div>
                        ) : null}

                        {day.items.length === 0 ? (
                            <div className="ov-empty">
                                <Icon name="sparkle" size={22} />
                                <div>
                                    <strong>A Free Day</strong>
                                    <span>Add a booking, or ask Leo what to do nearby.</span>
                                </div>
                            </div>
                        ) : (
                            <ol className="ov-items">
                                {day.items.map((item) => renderItem(day, item, facts.hops[item.id], facts))}
                            </ol>
                        )}

                        <div className="ov-day-actions">
                            <button type="button" className="ov-btn is-primary" onClick={() => openPicker(day.key)}>
                                <Icon name="plus" size={16} /> Add To This Day
                            </button>
                            <button type="button" className="ov-btn" onClick={() => askLeo(day.key)}>
                                <Icon name="sparkle" size={16} /> Ask Leo For Ideas
                            </button>
                            {real.length > 0 ? (
                                <>
                                    <button type="button" className="ov-btn is-nearby" onClick={() => suggestNearby(day, 'food')}>
                                        🍽️ Nearby Eats
                                    </button>
                                    <button type="button" className="ov-btn is-nearby" onClick={() => suggestNearby(day, 'activity')}>
                                        📷 Nearby Activities
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </section>
        );
    };

    // ----- Tracker tiles and "next up" -----
    const tiles = [
        {
            key: 'days',
            label: 'Days',
            value: stats.total,
            hint: stats.total ? `${stats.plannedDays} Planned` : 'Set Your Dates',
            icon: 'calendar',
            color: '#f3ab03',
            ink: '#222946',
        },
        {
            key: 'activities',
            label: 'Activities',
            value: stats.activities,
            hint: stats.activities ? `On ${stats.activityDays} Of ${stats.total} Days` : 'Nothing Yet',
            icon: 'activity',
            color: TYPE_META.activity.color,
        },
        {
            key: 'reservations',
            label: 'Restaurants',
            value: stats.reservations,
            hint: stats.reservations ? `${stats.mealDays} Of ${stats.total} Days Covered` : 'Nothing Yet',
            icon: 'food',
            color: TYPE_META.food.color,
        },
        {
            key: 'free',
            label: 'Free Days',
            value: stats.freeDays.length,
            hint: stats.freeDays.length ? 'Open For Plans' : 'Fully Planned',
            icon: 'sparkle',
            color: '#f3ab03',
            ink: '#222946',
            alert: stats.freeDays.length > 0,
        },
    ];

    const money = (amount) => `$${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Every booking that has made it onto the map, so Directions can offer them as starting points and destinations.
    const places = useMemo(() => {
        const seen = new Set();
        const list = [];
        days.forEach((day) => {
            day.items.forEach((item) => {
                const position = geo[item.query];
                if (!position) return;
                if (item.type === 'stay') {
                    if (seen.has(item.stayId)) return;
                    seen.add(item.stayId);
                }
                list.push({
                    id: item.id,
                    title: item.title,
                    type: item.type,
                    icon: item.icon,
                    position,
                    query: item.query,
                    sub: `${formatDay(day.key, { month: 'short', day: 'numeric' })}${item.timeLabel ? ` · ${item.timeLabel}` : ''}`,
                });
            });
        });
        return list;
    }, [days, geo]);

    const asPlace = (item) => places.find((place) => place.id === item.id) || null;

    // Opens the in-app directions: "to" is the booking, "from" is the stop before it (or the hotel).
    const openDirections = (toItem, fromItem, day) => {
        let from = fromItem ? asPlace(fromItem) : null;
        if (!from && day) {
            const index = day.items.findIndex((entry) => entry.id === toItem.id);
            const before = day.items.slice(0, Math.max(index, 0)).reverse().find((entry) => entry.type !== 'stay' && geo[entry.query]);
            if (before) from = asPlace(before);
            else if (day.staying && geo[day.staying.query]) {
                from = {
                    id: `${day.staying.id}-base`,
                    title: day.staying.name,
                    type: 'stay',
                    position: geo[day.staying.query],
                    query: day.staying.query,
                    sub: 'Where You Are Staying',
                };
            }
        }
        const to = asPlace(toItem);
        if (to && from && to.id === from.id) from = null;
        setDir({ open: true, from, to });
    };
    const openBlankDirections = () => setDir({ open: true, from: null, to: null });
    const closeDirections = () => { setDir({ open: false, from: null, to: null }); setTrace(null); };
    const nextWhen = (entry) => {
        const away = daysBetween(today, entry.day.key);
        const relative = away <= 0 ? 'Today' : (away === 1 ? 'Tomorrow' : `In ${away} Days`);
        const date = formatDay(entry.day.key, { weekday: 'short', month: 'short', day: 'numeric' });
        return `${relative} · ${date}${entry.item.timeLabel ? ` · ${entry.item.timeLabel}` : ''}`;
    };

    const showNextUp = () => {
        if (!nextUp) return;
        setFocusDay(nextUp.day.key);
        setOpenDay(nextUp.day.key);
        setSelectedId(nextUp.item.id);
    };

    return (
        <div className="trip-overview">
            <header className="ov-hero">
                <div className="ov-hero-main">
                    <span className="ov-eyebrow">{status.note || 'Trip Hub'}</span>
                    <h2>{status.label}</h2>
                    <p>
                        {tripStart && tripEnd
                            ? `${formatDay(tripStart, { month: 'short', day: 'numeric' })} to ${formatDay(tripEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'Add dates to see your countdown'}
                        {destination ? ` · ${destination}` : ''}
                    </p>
                    <div className="ov-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
                    {weatherSummary ? (
                        <p className="ov-hero-weather">
                            <img src={weatherIcon(weatherSummary.icon)} alt="" />
                            <span>
                                {temp(weatherSummary.low)} to {temp(weatherSummary.high)}
                                {weatherSummary.wet ? ` · Rain On ${weatherSummary.wet} ${weatherSummary.wet === 1 ? 'Day' : 'Days'}, Pack An Umbrella` : ' · No Rain Expected'}
                            </span>
                        </p>
                    ) : null}
                    <div className="ov-hero-actions">
                        <button type="button" className="ov-btn is-primary" onClick={() => askLeo()}>
                            <Icon name="sparkle" size={16} /> Ask Leo To Plan
                        </button>
                        <button type="button" className="ov-btn is-ghost" onClick={() => setIsCelsius((current) => !current)}>
                            Show {isCelsius ? '°F' : '°C'}
                        </button>
                    </div>
                </div>
                <ul className="ov-stats" aria-label="Trip Tracker">
                    {tiles.map((tile) => (
                        <li
                            key={tile.key}
                            className={`ov-stat${tile.alert ? ' is-alert' : ''}`}
                            style={{ '--pin': tile.color, '--on': tile.ink || '#ffffff' }}
                        >
                            <div className="ov-stat-top">
                                <span className="ov-stat-icon"><Icon name={tile.icon} size={15} /></span>
                                <span className="ov-stat-label">{tile.label}</span>
                            </div>
                            <strong>{tile.value}</strong>
                            <em>{tile.hint}</em>
                        </li>
                    ))}
                    <li className="ov-stat is-wide" style={{ '--pin': '#2f9e6b', '--on': '#ffffff' }}>
                        <div className="ov-stat-top">
                            <span className="ov-stat-icon"><Icon name="wallet" size={15} /></span>
                            <span className="ov-stat-label">Trip Expenses</span>
                        </div>
                        <div className="ov-split">
                            <div>
                                <strong>{spend ? money(spend.share) : '—'}</strong>
                                <em>You Spent</em>
                            </div>
                            <div>
                                <strong>{spend ? money(spend.total) : '—'}</strong>
                                <em>Total Spent</em>
                            </div>
                        </div>
                    </li>
                </ul>
            </header>

            {loaded && days.length > 0 && nextUp ? (
                <section
                    className="ov-next"
                    style={{ '--pin': TYPE_META[nextUp.item.type].color, '--tint': TYPE_META[nextUp.item.type].tint }}
                    aria-label="Next Up"
                >
                    <span className="ov-next-icon"><Icon name={nextUp.item.icon || nextUp.item.type} size={22} /></span>
                    <div className="ov-next-text">
                        <span className="ov-card-eyebrow">Next Up</span>
                        <strong>
                            <span className="ov-next-title">{nextUp.item.title}</span>
                            <em>{nextUp.item.tag || TYPE_META[nextUp.item.type].label}</em>
                        </strong>
                    </div>
                    <div className="ov-next-meta">
                        <span className="ov-next-when"><Icon name="clock" size={14} />{nextWhen(nextUp)}</span>
                        {nextUp.item.address ? <span className="ov-next-addr"><Icon name="pin" size={14} />{nextUp.item.address}</span> : null}
                    </div>
                    <div className="ov-next-actions">
                        <button type="button" className="ov-btn is-small" onClick={showNextUp}>
                            <Icon name="pin" size={14} /> Show On Map
                        </button>
                        {nextUp.item.query ? (
                            <button type="button" className="ov-btn is-small is-primary" onClick={() => openDirections(nextUp.item, null, nextUp.day)}>
                                <Icon name="route" size={14} /> Directions
                            </button>
                        ) : null}
                    </div>                </section>
            ) : null}

            {!loaded ? (
                <div className="ov-loading">Loading Your Trip…</div>
            ) : days.length === 0 ? (
                <div className="ov-empty is-large">
                    <Icon name="sparkle" size={26} />
                    <div>
                        <strong>No Dates Yet</strong>
                        <span>Set the start and end dates of this itinerary to see each day here.</span>
                    </div>
                </div>
            ) : (
                <div className="ov-grid">
                    <div className="ov-timeline">
                        <div className="ov-chipbar">
                            <div className="ov-day-chips" ref={chipsRef} role="tablist" aria-label="Map Days">
                                <button
                                    type="button"
                                    data-chip="all"
                                    className={`ov-day-chip${focusDay === 'all' ? ' is-on' : ''}`}
                                    onClick={() => { setFocusDay('all'); setSelectedId(null); }}
                                >
                                    All Days
                                </button>
                                {days.map((day) => {
                                    const booked = day.items.filter((item) => item.type !== 'stay').length;
                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            data-chip={day.key}
                                            className={`ov-day-chip${focusDay === day.key ? ' is-on' : ''}`}
                                            style={{ '--day': DAY_COLORS[day.index % DAY_COLORS.length] }}
                                            title={`${formatDay(day.key)} · ${day.inTrip ? `Day ${day.num}` : 'Extra Day'}`}
                                            onClick={() => { setFocusDay(day.key); setOpenDay(day.key); setSelectedId(null); }}
                                        >
                                            {formatDay(day.key, { month: 'short', day: 'numeric' })}
                                            {booked > 0 ? (
                                                <span className={`ov-chip-dot${booked > 1 ? ' is-many' : ''}`} aria-label={`${booked} booked`}>
                                                    {booked > 1 ? booked : null}
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        {days.map(renderDay)}
                    </div>

                    <aside className="ov-map-panel">
                        {provider === 'osm' || isLoaded ? (
                            <TripMap
                                days={days}
                                focusDay={focusDay}
                                selectedId={selectedId}
                                onSelect={setSelectedId}
                                geo={geo}
                                center={baseCenter}
                                engine={provider}
                                trace={trace}
                                onDirections={(item, day) => openDirections(item, null, day)}
                            />
                        ) : (
                            <div className="ov-map ov-map-loading">Loading Map…</div>
                        )}
                        {dir.open ? (
                            <DirectionsPanel
                                places={places}
                                initialFrom={dir.from}
                                initialTo={dir.to}
                                onClose={closeDirections}
                                onTrace={setTrace}
                            />
                        ) : (
                            <button type="button" className="ov-dir-open" onClick={openBlankDirections}>
                                <Icon name="route" size={15} /> Directions
                            </button>
                        )}
                    </aside>
                </div>
            )}

            {picker.open ? (
                <div className="ov-overlay" onClick={() => setPicker({ open: false, date: '' })}>
                    <div className="ov-dialog" role="dialog" aria-label="Add To This Day" onClick={(event) => event.stopPropagation()}>
                        <h3>Add To {formatDay(picker.date, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                        <p>What are you booking?</p>
                        <div className="ov-dialog-grid">
                            {CATEGORY_ORDER.map((type) => {
                                const category = CATEGORIES[type];
                                return (
                                    <button
                                        type="button"
                                        key={type}
                                        className="ov-dialog-option"
                                        style={{ '--pin': category.color, '--tint': category.tint }}
                                        onClick={() => startForm(type)}
                                    >
                                        <span><Icon name={category.glyph} size={22} /></span>
                                        {category.label}
                                    </button>
                                );
                            })}
                        </div>
                        <button type="button" className="ov-dialog-close" onClick={() => setPicker({ open: false, date: '' })}>Cancel</button>
                    </div>
                </div>
            ) : null}

            {form.type ? (
                <BookingFormModal
                    type={form.type}
                    itineraryId={itineraryId}
                    startDate={startDate}
                    endDate={endDate}
                    prefill={{ date: form.date }}
                    onClose={closeForm}
                    onAdded={fetchAllData}
                />
            ) : null}
        </div>
    );
};

export default DailyOverview;
