import React, { useState } from 'react';
import { localDateFromField } from './bookingFields';
import { daysBetween } from './overview/overviewModel';
import {
    DateInput, Field, FormSheet, Grid, More, PlaceInput, TextInput,
    prettyDate, toDateField, useBookingSubmit, useTripDates, outsideTrip,
} from './formKit/FormKit';

const blank = { name: '', checkIn: '', checkOut: '', address: '', confirmation: '' };

const initialFrom = (hotel, prefill) => {
    if (hotel) {
        return {
            name: hotel.hotel_name || '',
            checkIn: toDateField(hotel.check_in_date),
            checkOut: toDateField(hotel.check_out_date),
            address: hotel.address || '',
            confirmation: hotel.booking_confirmation || '',
        };
    }
    if (!prefill) return blank;
    return {
        ...blank,
        name: prefill.title || '',
        checkIn: prefill.date ? toDateField(localDateFromField(prefill.date)) : '',
        address: prefill.location || '',
    };
};

function HotelForm({ itineraryId, startDate, endDate, onClose, onHotelAdded, hotelToEdit, prefill }) {
    const [values, setValues] = useState(() => initialFrom(hotelToEdit, prefill));
    const [problem, setProblem] = useState('');
    const trip = useTripDates(itineraryId, startDate, endDate);
    const editing = Boolean(hotelToEdit);
    const save = useBookingSubmit({
        resource: 'hotels',
        mirror: 'hotels',
        itineraryId,
        editId: hotelToEdit?.hotel_id,
        onSaved: onHotelAdded,
    });

    const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));

    const handleExtracted = (data) => {
        setValues((current) => ({
            ...current,
            name: data.hotelName || current.name,
            address: data.address || current.address,
            confirmation: data.bookingConfirmation || current.confirmation,
            checkIn: data.checkInDate ? (toDateField(localDateFromField(data.checkInDate)) || current.checkIn) : current.checkIn,
            checkOut: data.checkOutDate ? (toDateField(localDateFromField(data.checkOutDate)) || current.checkOut) : current.checkOut,
        }));
    };

    // Picking a check-in nudges the check-out forward so it never lands before it.
    const changeCheckIn = (value) => {
        setValues((current) => ({
            ...current,
            checkIn: value,
            checkOut: current.checkOut && value && current.checkOut < value ? value : current.checkOut,
        }));
    };

    const nights = values.checkIn && values.checkOut ? daysBetween(values.checkIn, values.checkOut) : null;

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!values.name.trim() || !values.checkIn || !values.checkOut) {
            setProblem('Please add the hotel, check-in and check-out.');
            return;
        }
        if (values.checkOut < values.checkIn) {
            setProblem('Check-out needs to be on or after check-in.');
            return;
        }
        setProblem('');
        save.submit({
            hotel_name: values.name.trim(),
            check_in_date: values.checkIn,
            check_out_date: values.checkOut,
            address: values.address.trim(),
            booking_confirmation: values.confirmation.trim(),
            itinerary_id: itineraryId,
        }, outsideTrip([values.checkIn, values.checkOut], trip.start, trip.end));
    };

    const reset = () => {
        setValues(blank);
        save.again();
    };

    return (
        <FormSheet
            category="hotel"
            title={editing ? 'Edit Hotel' : 'Add A Hotel'}
            subtitle="Hotels, rentals and anywhere you are sleeping."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'Save Changes' : 'Add Hotel'}
            busy={save.busy}
            error={problem || save.error}
            warning={save.warning ? {
                title: 'This Is Outside Your Trip Dates',
                text: `Your trip runs ${prettyDate(trip.start)} to ${prettyDate(trip.end)}. Add it anyway?`,
                onConfirm: save.confirm,
                onCancel: save.dismissWarning,
            } : null}
            done={save.done ? {
                title: editing ? 'Hotel Updated' : 'Hotel Added',
                text: `${values.name}, ${prettyDate(values.checkIn)} to ${prettyDate(values.checkOut)}.`,
            } : null}
            onAnother={reset}
            canAddAnother={!editing}
            upload={editing ? null : { type: 'hotel', onData: handleExtracted }}
        >
            <Field label="Hotel Name" required htmlFor="hotel-name">
                <PlaceInput id="hotel-name" kind="hotel" fill="name" value={values.name} onChange={set('name')} placeholder="Search for the hotel by name" required onPick={(place) => place && setValues((current) => ({ ...current, name: place.name, address: place.address || current.address }))} />
            </Field>

            <Grid cols={2}>
                <Field label="Check-In" required htmlFor="hotel-in">
                    <DateInput id="hotel-in" value={values.checkIn} onChange={changeCheckIn} />
                </Field>
                <Field label="Check-Out" required htmlFor="hotel-out" hint={nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : ''}>
                    <DateInput id="hotel-out" value={values.checkOut} onChange={set('checkOut')} min={values.checkIn} />
                </Field>
            </Grid>

            <Field label="Address" hint="Add an address so it shows up on the map." htmlFor="hotel-addr">
                <PlaceInput id="hotel-addr" value={values.address} onChange={set('address')} placeholder="Search for the hotel or its address" />
            </Field>

            <More label="Confirmation Number" startOpen={Boolean(values.confirmation)}>
                <Field label="Confirmation Number" htmlFor="hotel-conf">
                    <TextInput id="hotel-conf" value={values.confirmation} onChange={(e) => set('confirmation')(e.target.value)} maxLength={80} />
                </Field>
            </More>
        </FormSheet>
    );
}

export default HotelForm;
