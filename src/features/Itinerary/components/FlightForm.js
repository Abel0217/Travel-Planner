import React, { useState } from 'react';
import AirportSuggest from './AirportSuggest';
import { localDateFromField, timeValue } from './bookingFields';
import TimeField from './formKit/TimeField';
import { Glyph } from './overview/glyphs';
import {
    DateInput, Field, FormSheet, Grid, More, TextInput,
    joinLocal, localParts, outsideTrip, prettyDate, toDateField, useBookingSubmit, useTripDates,
} from './formKit/FormKit';

const blank = {
    airline: '', number: '', from: '', to: '',
    departDate: '', departTime: '', arriveDate: '', arriveTime: '',
    passenger: '', seat: '', reference: '',
};

const initialFrom = (flight, prefill) => {
    if (flight) {
        const depart = localParts(flight.departure_time);
        const arrive = localParts(flight.arrival_time);
        return {
            airline: flight.airline || '',
            number: flight.flight_number || '',
            from: flight.departure_airport || '',
            to: flight.arrival_airport || '',
            departDate: depart.date,
            departTime: depart.time,
            arriveDate: arrive.date,
            arriveTime: arrive.time,
            passenger: flight.passenger_name || '',
            seat: flight.seat_number || '',
            reference: flight.booking_reference || '',
        };
    }
    if (!prefill) return blank;
    const day = prefill.date ? toDateField(localDateFromField(prefill.date)) : '';
    return { ...blank, departDate: day, arriveDate: day, to: prefill.location || '' };
};

function FlightForm({ itineraryId, startDate, endDate, onClose, onFlightAdded, flightToEdit, prefill }) {
    const [values, setValues] = useState(() => initialFrom(flightToEdit, prefill));
    const [problem, setProblem] = useState('');
    const trip = useTripDates(itineraryId, startDate, endDate);
    const editing = Boolean(flightToEdit);
    const save = useBookingSubmit({
        resource: 'flights',
        mirror: 'flights',
        itineraryId,
        editId: flightToEdit?.flight_id,
        onSaved: onFlightAdded,
    });

    const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

    // Most flights land the same day, so the arrival date follows the departure until it is changed.
    const changeDepartDate = (value) => {
        setValues((current) => ({
            ...current,
            departDate: value,
            arriveDate: !current.arriveDate || current.arriveDate === current.departDate ? value : current.arriveDate,
        }));
    };

    const handleExtracted = (data) => {
        setValues((current) => ({
            ...current,
            airline: data.airline || current.airline,
            number: data.flightNumber || current.number,
            from: data.departureAirport || current.from,
            to: data.arrivalAirport || current.to,
            passenger: data.passengerName || current.passenger,
            seat: data.seatNumber || current.seat,
            reference: data.bookingReference || current.reference,
            departDate: data.departureDate ? (toDateField(localDateFromField(data.departureDate)) || current.departDate) : current.departDate,
            departTime: data.departureTime ? timeValue(data.departureTime) : current.departTime,
            arriveDate: data.arrivalDate ? (toDateField(localDateFromField(data.arrivalDate)) || current.arriveDate) : current.arriveDate,
            arriveTime: data.arrivalTime ? timeValue(data.arrivalTime) : current.arriveTime,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!values.airline.trim() || !values.number.trim() || !values.from.trim() || !values.to.trim()) {
            setProblem('Please add the airline, flight number and both airports.');
            return;
        }
        if (!values.departDate || !values.departTime || !values.arriveDate || !values.arriveTime) {
            setProblem('Please add the departure and arrival date and time.');
            return;
        }
        if (joinLocal(values.arriveDate, values.arriveTime) <= joinLocal(values.departDate, values.departTime)) {
            setProblem('The flight needs to arrive after it departs.');
            return;
        }
        setProblem('');
        save.submit({
            airline: values.airline.trim(),
            flight_number: values.number.trim(),
            departure_airport: values.from.trim(),
            arrival_airport: values.to.trim(),
            departure_time: joinLocal(values.departDate, values.departTime),
            arrival_time: joinLocal(values.arriveDate, values.arriveTime),
            booking_reference: values.reference.trim(),
            passenger_name: values.passenger.trim(),
            seat_number: values.seat.trim(),
            itinerary_id: itineraryId,
        }, outsideTrip([values.departDate, values.arriveDate], trip.start, trip.end));
    };

    const reset = () => {
        setValues(blank);
        save.again();
    };

    return (
        <FormSheet
            category="flight"
            title={editing ? 'Edit Flight' : 'Add A Flight'}
            subtitle="Tickets, times and where you are headed."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'Save Changes' : 'Add Flight'}
            busy={save.busy}
            error={problem || save.error}
            warning={save.warning ? {
                title: 'This Is Outside Your Trip Dates',
                text: `Your trip runs ${prettyDate(trip.start)} to ${prettyDate(trip.end)}. Add it anyway?`,
                onConfirm: save.confirm,
                onCancel: save.dismissWarning,
            } : null}
            done={save.done ? {
                title: editing ? 'Flight Updated' : 'Flight Added',
                text: `${values.airline} ${values.number}, ${values.from} to ${values.to}.`,
            } : null}
            onAnother={reset}
            canAddAnother={!editing}
            upload={editing ? null : { type: 'flight', onData: handleExtracted }}
        >
            <Grid cols={2}>
                <Field label="Airline" required htmlFor="fl-airline">
                    <TextInput id="fl-airline" value={values.airline} onChange={(e) => set('airline')(e.target.value)} placeholder="Air Canada" autoFocus={!prefill} />
                </Field>
                <Field label="Flight Number" required htmlFor="fl-number">
                    <TextInput id="fl-number" value={values.number} onChange={(e) => set('number')(e.target.value)} placeholder="AC 091" />
                </Field>
            </Grid>

            <Grid cols={2}>
                <Field label="From" required htmlFor="fl-from">
                    <AirportSuggest id="fl-from" value={values.from} onChange={set('from')} placeholder="City or airport (YYZ)" />
                </Field>
                <Field label="To" required htmlFor="fl-to">
                    <AirportSuggest id="fl-to" value={values.to} onChange={set('to')} placeholder="City or airport (GIG)" />
                </Field>
            </Grid>

            <div className="bk-when">
                <strong><Glyph name="flight" size={16} /> Departure</strong>
                <Grid cols={2}>
                    <Field label="Date" required htmlFor="fl-dd">
                        <DateInput id="fl-dd" value={values.departDate} onChange={changeDepartDate} />
                    </Field>
                    <Field label="Time" required>
                        <TimeField value={values.departTime} onChange={set('departTime')} clearable={false} />
                    </Field>
                </Grid>
            </div>

            <div className="bk-when">
                <strong><Glyph name="pin" size={16} /> Arrival</strong>
                <Grid cols={2}>
                    <Field label="Date" required htmlFor="fl-ad">
                        <DateInput id="fl-ad" value={values.arriveDate} onChange={set('arriveDate')} min={values.departDate} />
                    </Field>
                    <Field label="Time" required>
                        <TimeField value={values.arriveTime} onChange={set('arriveTime')} clearable={false} />
                    </Field>
                </Grid>
            </div>

            <More label="Passenger, Seat And Confirmation" startOpen={Boolean(values.passenger || values.seat || values.reference)}>
                <Field label="Passenger Name" htmlFor="fl-pax">
                    <TextInput id="fl-pax" value={values.passenger} onChange={(e) => set('passenger')(e.target.value)} placeholder="Full name as on the ticket" />
                </Field>
                <Grid cols={2}>
                    <Field label="Seat" htmlFor="fl-seat">
                        <TextInput id="fl-seat" value={values.seat} onChange={(e) => set('seat')(e.target.value)} placeholder="12A" />
                    </Field>
                    <Field label="Booking Reference" htmlFor="fl-ref">
                        <TextInput id="fl-ref" value={values.reference} onChange={(e) => set('reference')(e.target.value)} placeholder="6 characters" />
                    </Field>
                </Grid>
            </More>
        </FormSheet>
    );
}

export default FlightForm;
