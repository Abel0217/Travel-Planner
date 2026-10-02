const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function titleCase(value) {
    return String(value || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function clockLabel(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function dateParts(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return { year: value.getUTCFullYear(), month: value.getUTCMonth(), day: value.getUTCDate() };
    }
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return null;
    return { year, month: month - 1, day };
}

function timeParts(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return { hours: value.getHours(), minutes: value.getMinutes() };
    }
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function eventMoment(dateValue, timeValue, fallbackHour) {
    if (timeValue === undefined && fallbackHour === undefined) {
        if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) return dateValue;
        if (typeof dateValue === 'string' && dateValue.includes(':')) {
            const parsed = new Date(dateValue.includes('T') ? dateValue : dateValue.replace(' ', 'T'));
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
    }
    const date = dateParts(dateValue);
    if (!date) return null;
    const time = timeParts(timeValue);
    const hours = time ? time.hours : fallbackHour;
    if (hours == null) return null;
    return new Date(date.year, date.month, date.day, hours, time ? time.minutes : 0, 0, 0);
}

function reminderCopy(kind, name, when, windowHours) {
    const label = titleCase(name);
    const timeLabel = clockLabel(when);
    if (windowHours === 3) {
        if (kind === 'restaurant') {
            return {
                title: 'Reservation in 3 hours',
                body: `Your dinner reservation at ${label || 'the restaurant'} is coming up in 3 hours at ${timeLabel}.`,
            };
        }
        if (kind === 'activity') {
            return {
                title: 'Activity in 3 hours',
                body: `Your activity ${label || 'on your trip'} is coming up in 3 hours at ${timeLabel}.`,
            };
        }
        if (kind === 'flight') {
            return {
                title: 'Flight in 3 hours',
                body: `Your flight${label ? ` ${label}` : ''} is coming up in 3 hours at ${timeLabel}.`,
            };
        }
        if (kind === 'arrival') {
            return {
                title: 'Landing soon',
                body: `Your flight${label ? ` ${label}` : ''} lands in 3 hours at ${timeLabel}.`,
            };
        }
        if (kind === 'checkout') {
            return {
                title: 'Checkout in 3 hours',
                body: `Your checkout${label ? ` at ${label}` : ''} is coming up in 3 hours at ${timeLabel}.`,
            };
        }
        return {
            title: 'Check-in in 3 hours',
            body: `Your hotel check-in${label ? ` at ${label}` : ''} is coming up in 3 hours at ${timeLabel}.`,
        };
    }
    if (kind === 'activity') {
        return { title: 'Activity tomorrow', body: `Your activity ${label || 'on your trip'} is tomorrow.` };
    }
    if (kind === 'restaurant') {
        return { title: 'Reservation tomorrow', body: `Your reservation${label ? ` at ${label}` : ''} is tomorrow.` };
    }
    if (kind === 'flight' || kind === 'arrival') {
        return kind === 'arrival' ? null : { title: 'Flight tomorrow', body: `Your flight${label ? ` ${label}` : ''} is tomorrow.` };
    }
    if (kind === 'checkout') {
        return { title: 'Checkout tomorrow', body: `Your checkout${label ? ` at ${label}` : ''} is tomorrow.` };
    }
    return { title: 'Check-in tomorrow', body: `Your hotel check-in${label ? ` at ${label}` : ''} is tomorrow.` };
}

function buildReminder({ kind, name, when, recordId, itineraryId, now = new Date(), maxHours = 24 }) {
    if (!when || Number.isNaN(when.getTime()) || !recordId) return null;
    const until = when.getTime() - now.getTime();
    if (until <= 0 || until > maxHours * HOUR) return null;
    const windowHours = until <= 3 * HOUR ? 3 : 24;
    const copy = reminderCopy(kind, name, when, windowHours);
    if (!copy) return null;
    const eventType = kind === 'checkout' ? 'hotel' : kind === 'arrival' ? 'flight' : kind;
    return {
        category: kind === 'activity' ? 'itinerary' : 'booking',
        event_type: eventType,
        title: copy.title,
        body: copy.body,
        itinerary_id: itineraryId,
        source_key: `reminder-${windowHours}:${kind}:${recordId}`,
        created_at: now,
    };
}

function buildTripCountdown({ title, startDate, itineraryId, now = new Date() }) {
    const parts = dateParts(startDate);
    if (!parts || !itineraryId) return null;
    const start = new Date(parts.year, parts.month, parts.day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((start.getTime() - today.getTime()) / DAY);
    const name = titleCase(title);
    const trip = name ? `${name} Trip` : 'Your Trip';
    if (days >= 2 && days <= 7) {
        return countdown(itineraryId, now, days <= 3 ? 'soon' : 'week', `Your Trip Starts In ${days} Days`, `${trip} Is In ${days} Days.`);
    }
    if (days === 1) {
        return countdown(itineraryId, now, 'tomorrow', 'Your Trip Starts Tomorrow', `${trip} Is Tomorrow.`);
    }
    if (days === 0) {
        return countdown(itineraryId, now, 'today', 'Your Trip Starts Today', `${trip} Is Today.`);
    }
    return null;
}

function countdown(itineraryId, now, milestone, title, body) {
    return {
        category: 'itinerary',
        event_type: 'itinerary',
        title,
        body,
        itinerary_id: itineraryId,
        source_key: `trip-countdown:${itineraryId}:${milestone}`,
        created_at: now,
        refresh: 'title',
    };
}

module.exports = { eventMoment, buildReminder, buildTripCountdown };
