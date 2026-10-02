import React, { useState } from 'react';
import { localDateFromField, timeValue } from './bookingFields';
import TimeField from './formKit/TimeField';
import {
    DateInput, Field, FormSheet, Grid, More, PlaceInput, TextInput,
    prettyDate, toDateField, useBookingSubmit, useTripDates, outsideTrip,
} from './formKit/FormKit';

const blank = { title: '', date: '', start: '', end: '', location: '', confirmation: '', notes: '' };

const initialFrom = (activity, prefill) => {
    if (activity) {
        return {
            title: activity.title || '',
            date: toDateField(activity.activity_date),
            start: timeValue(activity.start_time),
            end: timeValue(activity.end_time),
            location: activity.location || '',
            confirmation: activity.reservation_number || '',
            notes: activity.description || '',
        };
    }
    if (!prefill) return blank;
    return {
        ...blank,
        title: prefill.title || '',
        date: prefill.date ? toDateField(localDateFromField(prefill.date)) : '',
        start: prefill.time ? timeValue(prefill.time) : '',
        location: prefill.location || '',
        notes: prefill.description || '',
    };
};

function ActivityForm({ itineraryId, startDate, endDate, onClose, onActivityAdded, activityToEdit, prefill }) {
    const [values, setValues] = useState(() => initialFrom(activityToEdit, prefill));
    const [problem, setProblem] = useState('');
    const trip = useTripDates(itineraryId, startDate, endDate);
    const editing = Boolean(activityToEdit);
    const save = useBookingSubmit({
        resource: 'activities',
        mirror: 'activities',
        itineraryId,
        editId: activityToEdit?.activity_id,
        onSaved: onActivityAdded,
    });

    const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

    const handleExtracted = (data) => {
        setValues((current) => ({
            ...current,
            title: data.title || current.title,
            location: data.location || current.location,
            notes: data.description || current.notes,
            confirmation: data.reservationNumber || current.confirmation,
            date: data.activityDate ? (toDateField(localDateFromField(data.activityDate)) || current.date) : current.date,
            start: data.startTime ? timeValue(data.startTime) : current.start,
            end: data.endTime ? timeValue(data.endTime) : current.end,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!values.title.trim() || !values.date) {
            setProblem('Please add a name and a date.');
            return;
        }
        if (values.start && values.end && values.end <= values.start) {
            setProblem('The end time needs to be after the start time.');
            return;
        }
        setProblem('');
        save.submit({
            title: values.title.trim(),
            description: values.notes.trim(),
            location: values.location.trim(),
            activity_date: values.date,
            start_time: values.start || null,
            end_time: values.end || null,
            reservation_number: values.confirmation.trim(),
            itinerary_id: itineraryId,
        }, outsideTrip([values.date], trip.start, trip.end));
    };

    const reset = () => {
        setValues(blank);
        save.again();
    };

    return (
        <FormSheet
            category="activity"
            title={editing ? 'Edit Activity' : 'Add An Activity'}
            subtitle="Tours, tickets, sights and anything fun."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'Save Changes' : 'Add Activity'}
            busy={save.busy}
            error={problem || save.error}
            warning={save.warning ? {
                title: 'This Is Outside Your Trip Dates',
                text: `Your trip runs ${prettyDate(trip.start)} to ${prettyDate(trip.end)}. Add it anyway?`,
                onConfirm: save.confirm,
                onCancel: save.dismissWarning,
            } : null}
            done={save.done ? {
                title: editing ? 'Activity Updated' : 'Activity Added',
                text: `${values.title} is on your trip${values.date ? ` for ${prettyDate(values.date)}` : ''}.`,
            } : null}
            onAnother={reset}
            canAddAnother={!editing}
            upload={editing ? null : { type: 'activity', onData: handleExtracted }}
        >
            <Field label="What Are You Doing?" required htmlFor="act-title">
                <TextInput id="act-title" value={values.title} onChange={(e) => set('title')(e.target.value)} maxLength={100} placeholder="Christ The Redeemer Visit" autoFocus={!prefill} />
            </Field>

            <Grid cols={3}>
                <Field label="Date" required htmlFor="act-date">
                    <DateInput id="act-date" value={values.date} onChange={set('date')} />
                </Field>
                <Field label="Starts">
                    <TimeField value={values.start} onChange={set('start')} />
                </Field>
                <Field label="Ends">
                    <TimeField value={values.end} onChange={set('end')} />
                </Field>
            </Grid>

            <Field label="Where" hint="Add an address so it shows up on the map." htmlFor="act-where">
                <PlaceInput id="act-where" value={values.location} onChange={set('location')} placeholder="Search for a place or address" onPick={(place) => place && setValues((current) => ({ ...current, title: current.title.trim() ? current.title : place.name }))} />
            </Field>

            <More label="Confirmation And Notes" startOpen={Boolean(values.confirmation || values.notes)}>
                <Field label="Confirmation Number" htmlFor="act-conf">
                    <TextInput id="act-conf" value={values.confirmation} onChange={(e) => set('confirmation')(e.target.value)} maxLength={50} />
                </Field>
                <Field label="Notes" htmlFor="act-notes">
                    <textarea id="act-notes" className="bk-input" value={values.notes} onChange={(e) => set('notes')(e.target.value)} rows={3} maxLength={500} placeholder="Meeting point, what to bring, tips" />
                </Field>
            </More>
        </FormSheet>
    );
}

export default ActivityForm;
