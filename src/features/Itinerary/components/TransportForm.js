import React, { useState } from 'react';
import { localDateFromField, timeValue } from './bookingFields';
import TimeField from './formKit/TimeField';
import AirportSuggest from './AirportSuggest';
import { Glyph, transportGlyph } from './overview/glyphs';
import {
    Chips, DateInput, Field, FormSheet, Grid, More, PlaceInput, TextInput,
    joinLocal, localParts, outsideTrip, prettyDate, toDateField, useBookingSubmit, useTripDates,
} from './formKit/FormKit';

const METHODS = ['Train', 'Bus', 'Taxi', 'Plane', 'Other'].map((label) => ({
    value: label,
    label,
    glyph: label === 'Plane' ? 'flight' : transportGlyph(label),
}));

const blank = {
    type: '', pickupDate: '', pickupTime: '', dropDate: '', dropTime: '',
    from: '', to: '', reference: '',
};

const methodFrom = (value) => {
    const found = METHODS.find((item) => item.value.toLowerCase() === String(value || '').toLowerCase());
    if (found) return found.value;
    return value ? 'Other' : '';
};

const initialFrom = (ride, prefill) => {
    if (ride) {
        const pickup = localParts(ride.pickup_time);
        const drop = localParts(ride.dropoff_time);
        return {
            type: methodFrom(ride.type),
            pickupDate: pickup.date,
            pickupTime: pickup.time,
            dropDate: drop.date,
            dropTime: drop.time,
            from: ride.pickup_location || '',
            to: ride.dropoff_location || '',
            reference: ride.booking_reference || '',
        };
    }
    if (!prefill) return blank;
    const day = prefill.date ? toDateField(localDateFromField(prefill.date)) : '';
    return {
        ...blank,
        type: methodFrom(prefill.method),
        pickupDate: day,
        pickupTime: prefill.time ? timeValue(prefill.time) : '',
        from: prefill.location || '',
    };
};

function TransportForm({ itineraryId, startDate, endDate, onClose, onTransportAdded, transportToEdit, prefill, onSwitch }) {
    const [values, setValues] = useState(() => initialFrom(transportToEdit, prefill));
    const [problem, setProblem] = useState('');
    const trip = useTripDates(itineraryId, startDate, endDate);
    const editing = Boolean(transportToEdit);
    const save = useBookingSubmit({
        resource: 'transport',
        mirror: 'transports',
        itineraryId,
        editId: transportToEdit?.transport_id,
        onSaved: onTransportAdded,
    });

    const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

    const isPlane = values.type === 'Plane';
    const hint = {
        Train: 'Station or city',
        Bus: 'Bus station, stop or city',
        Taxi: 'Address or place',
    }[values.type] || 'Station, stop or address';
    const where = (id, key, required) => (isPlane ? (
        <AirportSuggest id={id} required={required} value={values[key]} onChange={set(key)} placeholder="Airport code or city (YYZ, Toronto)" />
    ) : (
        <PlaceInput id={id} value={values[key]} onChange={set(key)} placeholder={hint} />
    ));

    const changePickupDate = (value) => {
        setValues((current) => ({
            ...current,
            pickupDate: value,
            dropDate: !current.dropDate || current.dropDate === current.pickupDate ? value : current.dropDate,
        }));
    };

    const handleExtracted = (data) => {
        const pickup = data.pickupTime ? localParts(data.pickupTime) : null;
        const drop = data.dropoffTime ? localParts(data.dropoffTime) : null;
        setValues((current) => ({
            ...current,
            type: data.type ? methodFrom(data.type) : current.type,
            from: data.pickupLocation || current.from,
            to: data.dropoffLocation || current.to,
            reference: data.bookingReference || current.reference,
            pickupDate: pickup?.date || current.pickupDate,
            pickupTime: pickup?.time || current.pickupTime,
            dropDate: drop?.date || current.dropDate,
            dropTime: drop?.time || current.dropTime,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!values.type) {
            setProblem('Please choose how you are travelling.');
            return;
        }
        if (!values.pickupDate || !values.pickupTime || !values.from.trim()) {
            setProblem('Please add where and when you are being picked up.');
            return;
        }
        if (values.dropDate && values.dropTime
            && joinLocal(values.dropDate, values.dropTime) < joinLocal(values.pickupDate, values.pickupTime)) {
            setProblem('The arrival needs to be after the pick-up.');
            return;
        }
        setProblem('');
        save.submit({
            type: values.type,
            pickup_time: joinLocal(values.pickupDate, values.pickupTime),
            dropoff_time: values.dropDate ? joinLocal(values.dropDate, values.dropTime || values.pickupTime) : null,
            pickup_location: values.from.trim(),
            dropoff_location: values.to.trim(),
            booking_reference: values.reference.trim(),
            itinerary_id: itineraryId,
        }, outsideTrip([values.pickupDate, values.dropDate], trip.start, trip.end));
    };

    const reset = () => {
        setValues(blank);
        save.again();
    };

    return (
        <FormSheet
            category="transport"
            title={editing ? 'Edit Transport' : 'Add Transport'}
            subtitle="Trains, buses, taxis and transfers."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'Save Changes' : 'Add Transport'}
            busy={save.busy}
            error={problem || save.error}
            warning={save.warning ? {
                title: 'This Is Outside Your Trip Dates',
                text: `Your trip runs ${prettyDate(trip.start)} to ${prettyDate(trip.end)}. Add it anyway?`,
                onConfirm: save.confirm,
                onCancel: save.dismissWarning,
            } : null}
            done={save.done ? {
                title: editing ? 'Transport Updated' : 'Transport Added',
                text: `${values.type} on ${prettyDate(values.pickupDate)}${values.from ? `, from ${values.from}` : ''}.`,
            } : null}
            onAnother={reset}
            canAddAnother={!editing}
            upload={editing ? null : { type: 'transport', onData: handleExtracted }}
        >
            <Field label="How Are You Travelling?" required>
                <Chips options={METHODS} value={values.type} onChange={set('type')} label="Method Of Transport" />
            </Field>

            {isPlane && onSwitch ? (
                <div className="bk-banner is-info">
                    <span>Flying? The flight form also keeps your airline, flight number and seat.</span>
                    <div><button type="button" className="bk-btn small" onClick={() => onSwitch('flight')}>Use Flight Form</button></div>
                </div>
            ) : null}

            <div className="bk-when">
                <strong><Glyph name="clock" size={16} /> Pick-Up</strong>
                <Grid cols={2}>
                    <Field label="Date" required htmlFor="tr-pd">
                        <DateInput id="tr-pd" value={values.pickupDate} onChange={changePickupDate} />
                    </Field>
                    <Field label="Time" required>
                        <TimeField value={values.pickupTime} onChange={set('pickupTime')} clearable={false} />
                    </Field>
                </Grid>
                <Field label={isPlane ? 'Departure Airport' : 'From'} required htmlFor="tr-from">
                    {where('tr-from', 'from', true)}
                </Field>
            </div>

            <div className="bk-when">
                <strong><Glyph name="pin" size={16} /> Arrival</strong>
                <Grid cols={2}>
                    <Field label="Date" htmlFor="tr-dd">
                        <DateInput id="tr-dd" value={values.dropDate} onChange={set('dropDate')} min={values.pickupDate} />
                    </Field>
                    <Field label="Time">
                        <TimeField value={values.dropTime} onChange={set('dropTime')} />
                    </Field>
                </Grid>
                <Field label={isPlane ? 'Arrival Airport' : 'To'} htmlFor="tr-to">
                    {where('tr-to', 'to', false)}
                </Field>
            </div>

            <More label="Booking Reference" startOpen={Boolean(values.reference)}>
                <Field label="Booking Reference" htmlFor="tr-ref">
                    <TextInput id="tr-ref" value={values.reference} onChange={(e) => set('reference')(e.target.value)} maxLength={80} />
                </Field>
            </More>
        </FormSheet>
    );
}

export default TransportForm;
