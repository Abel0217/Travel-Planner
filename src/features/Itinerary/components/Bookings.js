import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/apiClient';
import { CATEGORIES, CATEGORY_ORDER } from '../../../utils/bookingTheme';
import BookingFormModal from './BookingFormModal';
import { Glyph, transportGlyph } from './overview/glyphs';
import { dayKey, daysBetween, formatDay } from './overview/overviewModel';
import { localParts } from './formKit/FormKit';
import { timeLabel } from './formKit/TimeField';
import './css/Bookings.css';

// Each kind of booking: where it lives on the server, which field is its id, and how to show it.
const KINDS = {
    activity: { resource: 'activities', idField: 'activity_id' },
    restaurant: { resource: 'restaurants', idField: 'reservation_id' },
    hotel: { resource: 'hotels', idField: 'hotel_id' },
    flight: { resource: 'flights', idField: 'flight_id' },
    transport: { resource: 'transport', idField: 'transport_id' },
};

const shortDay = (key) => (key ? formatDay(key, { weekday: 'short', month: 'short', day: 'numeric' }) : '');
const clock = (value) => timeLabel(String(value || '').slice(0, 5));

const whenText = (date, time) => [shortDay(date), time ? clock(time) : ''].filter(Boolean).join(' · ');

const normalize = (type, record) => {
    const kind = KINDS[type];
    const id = record[kind.idField];
    const base = { type, id, raw: record, glyph: CATEGORIES[type].glyph, chips: [] };

    if (type === 'activity') {
        const date = dayKey(record.activity_date);
        const end = record.end_time ? ` – ${clock(record.end_time)}` : '';
        return {
            ...base,
            title: record.title || 'Activity',
            sortKey: `${date}T${String(record.start_time || '99:99').slice(0, 5)}`,
            when: [shortDay(date), record.start_time ? `${clock(record.start_time)}${end}` : ''].filter(Boolean).join(' · '),
            where: record.location,
            note: record.description,
            chips: record.reservation_number ? [`Confirmation ${record.reservation_number}`] : [],
        };
    }
    if (type === 'restaurant') {
        const date = dayKey(record.reservation_date);
        return {
            ...base,
            title: record.restaurant_name || 'Restaurant',
            sortKey: `${date}T${String(record.reservation_time || '99:99').slice(0, 5)}`,
            when: whenText(date, record.reservation_time),
            where: record.address,
            chips: [
                record.guest_number ? `Table For ${record.guest_number}` : '',
                record.booking_confirmation ? `Confirmation ${record.booking_confirmation}` : '',
            ].filter(Boolean),
        };
    }
    if (type === 'hotel') {
        const checkIn = dayKey(record.check_in_date);
        const checkOut = dayKey(record.check_out_date);
        const nights = checkIn && checkOut ? Math.max(0, daysBetween(checkIn, checkOut)) : null;
        return {
            ...base,
            title: record.hotel_name || 'Hotel',
            sortKey: `${checkIn}T00:00`,
            when: `${shortDay(checkIn)} → ${shortDay(checkOut)}`,
            where: record.address,
            chips: [
                nights ? `${nights} ${nights === 1 ? 'Night' : 'Nights'}` : '',
                record.booking_confirmation ? `Confirmation ${record.booking_confirmation}` : '',
            ].filter(Boolean),
        };
    }
    if (type === 'flight') {
        const depart = localParts(record.departure_time);
        const arrive = localParts(record.arrival_time);
        return {
            ...base,
            title: `${record.airline || 'Flight'} ${record.flight_number || ''}`.trim(),
            sortKey: `${depart.date}T${depart.time || '99:99'}`,
            when: `Departs ${whenText(depart.date, depart.time)}`,
            where: [record.departure_airport, record.arrival_airport].filter(Boolean).join(' → '),
            note: `Arrives ${whenText(arrive.date, arrive.time)}`,
            chips: [
                record.passenger_name,
                record.seat_number ? `Seat ${record.seat_number}` : '',
                record.booking_reference ? `Confirmation ${record.booking_reference}` : '',
            ].filter(Boolean),
        };
    }
    const pickup = localParts(record.pickup_time);
    const drop = localParts(record.dropoff_time);
    return {
        ...base,
        glyph: transportGlyph(record.type),
        title: record.type || 'Transport',
        sortKey: `${pickup.date}T${pickup.time || '99:99'}`,
        when: `Pick-up ${whenText(pickup.date, pickup.time)}`,
        where: [record.pickup_location, record.dropoff_location].filter(Boolean).join(' → '),
        note: drop.date ? `Arrives ${whenText(drop.date, drop.time)}` : '',
        chips: record.booking_reference ? [`Confirmation ${record.booking_reference}`] : [],
    };
};

const Bookings = ({ itineraryId, onChange }) => {
    const [bookings, setBookings] = useState({ activity: [], restaurant: [], hotel: [], flight: [], transport: [] });
    const [loaded, setLoaded] = useState(false);
    const [filter, setFilter] = useState('all');
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [removeError, setRemoveError] = useState('');
    const [trip, setTrip] = useState({ start: '', end: '' });

    const load = useCallback(async () => {
        const entries = await Promise.all(CATEGORY_ORDER.map(async (type) => {
            try {
                const response = await apiClient.get(`/itineraries/${itineraryId}/${KINDS[type].resource}`);
                return [type, response.data || []];
            } catch (error) {
                console.error(`Failed to fetch ${type}:`, error);
                return [type, []];
            }
        }));
        setBookings(Object.fromEntries(entries));
        setLoaded(true);
    }, [itineraryId]);

    useEffect(() => {
        load();
        apiClient.get(`/itineraries/${itineraryId}`)
            .then((response) => setTrip({ start: response.data?.start_date, end: response.data?.end_date }))
            .catch(() => {});
    }, [itineraryId, load]);

    const items = useMemo(() => Object.fromEntries(CATEGORY_ORDER.map((type) => [
        type,
        bookings[type].map((record) => normalize(type, record)).sort((a, b) => a.sortKey.localeCompare(b.sortKey)),
    ])), [bookings]);

    const total = CATEGORY_ORDER.reduce((sum, type) => sum + items[type].length, 0);
    const visible = filter === 'all' ? CATEGORY_ORDER : [filter];

    const afterSave = async () => {
        await load();
        if (onChange) onChange();
    };

    const confirmRemove = async () => {
        if (!removing) return;
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/${KINDS[removing.type].resource}/${removing.id}`);
            setRemoving(null);
            setRemoveError('');
            await afterSave();
        } catch (error) {
            console.error('Failed to delete booking:', error);
            setRemoveError('We could not delete that. Please try again.');
        }
    };

    return (
        <div className="bookings">
            <header className="mb-head">
                <div>
                    <h2>My Bookings</h2>
                    <p>{loaded ? `${total} ${total === 1 ? 'booking' : 'bookings'} saved for this trip.` : 'Loading your bookings…'}</p>
                </div>
            </header>

            <div className="mb-filters" role="tablist" aria-label="Booking Types">
                <button type="button" role="tab" aria-selected={filter === 'all'} className={`mb-filter${filter === 'all' ? ' is-on' : ''}`} onClick={() => setFilter('all')}>
                    All <em>{total}</em>
                </button>
                {CATEGORY_ORDER.map((type) => {
                    const category = CATEGORIES[type];
                    return (
                        <button
                            type="button"
                            role="tab"
                            key={type}
                            aria-selected={filter === type}
                            className={`mb-filter${filter === type ? ' is-on' : ''}`}
                            style={{ '--cat': category.color, '--cat-tint': category.tint }}
                            onClick={() => setFilter(type)}
                        >
                            <Glyph name={category.glyph} size={16} />
                            {category.plural}
                            <em>{items[type].length}</em>
                        </button>
                    );
                })}
            </div>

            {visible.map((type) => {
                const category = CATEGORIES[type];
                const list = items[type];
                if (filter === 'all' && list.length === 0) return null;
                return (
                    <section className="mb-section" key={type} style={{ '--cat': category.color, '--cat-tint': category.tint }}>
                        <h3>
                            <span className="mb-section-icon"><Glyph name={category.glyph} size={18} /></span>
                            {category.plural}
                            <em>{list.length}</em>
                        </h3>
                        {list.length === 0 ? (
                            <p className="mb-empty">Nothing saved here yet. Add one from the Bookings tab.</p>
                        ) : (
                            <div className="mb-list">
                                {list.map((item) => (
                                    <article className="mb-card" key={`${item.type}-${item.id}`}>
                                        <span className="mb-card-icon"><Glyph name={item.glyph} size={22} /></span>
                                        <div className="mb-card-body">
                                            <h4>{item.title}</h4>
                                            {item.when ? <p className="mb-when"><Glyph name="calendar" size={14} />{item.when}</p> : null}
                                            {item.where ? <p className="mb-where"><Glyph name="pin" size={14} />{item.where}</p> : null}
                                            {item.note ? <p className="mb-note">{item.note}</p> : null}
                                            {item.chips.length ? (
                                                <div className="mb-chips">
                                                    {item.chips.map((chip) => <span key={chip}>{chip}</span>)}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="mb-actions">
                                            <button type="button" className="mb-icon-btn" onClick={() => setEditing({ type: item.type, record: item.raw })} aria-label={`Edit ${item.title}`} title="Edit">
                                                <Glyph name="edit" size={16} />
                                            </button>
                                            <button type="button" className="mb-icon-btn is-danger" onClick={() => { setRemoveError(''); setRemoving(item); }} aria-label={`Delete ${item.title}`} title="Delete">
                                                <Glyph name="trash" size={16} />
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}

            {loaded && total === 0 && filter === 'all' ? (
                <div className="mb-blank">
                    <strong>Nothing Saved Yet</strong>
                    <span>Head to the Bookings tab to add your first flight, stay, activity or table.</span>
                </div>
            ) : null}

            {removing ? (
                <div className="mb-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRemoving(null); }}>
                    <div className="mb-confirm" role="alertdialog" aria-label="Delete Booking">
                        <span className="mb-confirm-icon"><Glyph name="trash" size={24} /></span>
                        <h3>Delete This Booking?</h3>
                        <p><strong>{removing.title}</strong> will be removed from your trip and from the map.</p>
                        {removeError ? <p className="mb-confirm-error">{removeError}</p> : null}
                        <div>
                            <button type="button" className="mb-btn" onClick={() => setRemoving(null)}>Keep It</button>
                            <button type="button" className="mb-btn is-danger" onClick={confirmRemove}>Delete</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {editing ? (
                <BookingFormModal
                    type={editing.type}
                    edit={editing.record}
                    itineraryId={itineraryId}
                    startDate={trip.start}
                    endDate={trip.end}
                    onClose={() => setEditing(null)}
                    onAdded={afterSave}
                />
            ) : null}
        </div>
    );
};

export default Bookings;
