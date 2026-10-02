import React, { useState } from 'react';
import { localDateFromField, timeValue } from './bookingFields';
import TimeField from './formKit/TimeField';
import {
    DateInput, Field, FormSheet, Grid, More, PlaceInput, Stepper, TextInput,
    prettyDate, toDateField, useBookingSubmit, useTripDates, outsideTrip,
} from './formKit/FormKit';

const blank = { name: '', date: '', time: '', guests: 2, address: '', confirmation: '' };

const initialFrom = (restaurant, prefill) => {
    if (restaurant) {
        return {
            name: restaurant.restaurant_name || '',
            date: toDateField(restaurant.reservation_date),
            time: timeValue(restaurant.reservation_time),
            guests: Number(restaurant.guest_number) || 2,
            address: restaurant.address || '',
            confirmation: restaurant.booking_confirmation || '',
        };
    }
    if (!prefill) return blank;
    return {
        ...blank,
        name: prefill.title || '',
        date: prefill.date ? toDateField(localDateFromField(prefill.date)) : '',
        time: prefill.time ? timeValue(prefill.time) : '',
        address: prefill.location || '',
        guests: Number(prefill.guests) || 2,
    };
};

function RestaurantForm({ itineraryId, startDate, endDate, onClose, onRestaurantAdded, restaurantToEdit, prefill }) {
    const [values, setValues] = useState(() => initialFrom(restaurantToEdit, prefill));
    const [problem, setProblem] = useState('');
    const [opened, setOpened] = useState(false);
    const trip = useTripDates(itineraryId, startDate, endDate);
    const editing = Boolean(restaurantToEdit);
    const save = useBookingSubmit({
        resource: 'restaurants',
        mirror: 'restaurants',
        itineraryId,
        editId: restaurantToEdit?.reservation_id,
        onSaved: onRestaurantAdded,
    });

    const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }));
    const website = !editing && prefill?.website ? prefill.website : '';

    const handleExtracted = (data) => {
        setValues((current) => ({
            ...current,
            name: data.restaurantName || current.name,
            address: data.address || current.address,
            confirmation: data.bookingConfirmation || current.confirmation,
            guests: Number(data.guestNumber) || current.guests,
            date: data.reservationDate ? (toDateField(localDateFromField(data.reservationDate)) || current.date) : current.date,
            time: data.reservationTime ? timeValue(data.reservationTime) : current.time,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!values.name.trim() || !values.date || !values.time) {
            setProblem('Please add the restaurant, the date and the time.');
            return;
        }
        setProblem('');
        save.submit({
            restaurant_name: values.name.trim(),
            reservation_date: values.date,
            reservation_time: values.time,
            guest_number: String(values.guests),
            address: values.address.trim(),
            booking_confirmation: values.confirmation.trim(),
            itinerary_id: itineraryId,
        }, outsideTrip([values.date], trip.start, trip.end));
    };

    const reset = () => {
        setValues(blank);
        setOpened(false);
        save.again();
    };

    return (
        <FormSheet
            category="restaurant"
            title={editing ? 'Edit Restaurant Reservation' : 'Add A Restaurant'}
            subtitle="Tables, tastings and the places you want to eat."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitLabel={editing ? 'Save Changes' : 'Add Restaurant'}
            busy={save.busy}
            error={problem || save.error}
            warning={save.warning ? {
                title: 'This Is Outside Your Trip Dates',
                text: `Your trip runs ${prettyDate(trip.start)} to ${prettyDate(trip.end)}. Add it anyway?`,
                onConfirm: save.confirm,
                onCancel: save.dismissWarning,
            } : null}
            done={save.done ? {
                title: editing ? 'Reservation Updated' : 'Restaurant Added',
                text: `${values.name} is on your trip for ${prettyDate(values.date)}.`,
            } : null}
            onAnother={reset}
            canAddAnother={!editing}
            upload={editing ? null : { type: 'restaurant', onData: handleExtracted }}
        >
            {website ? (
                <div className="bk-banner is-info">
                    <strong>Book This Table On Their Website</strong>
                    <span>
                        {opened
                            ? 'Once you have booked, paste the confirmation number below and save, and it goes straight on your trip.'
                            : 'Reserve for the date and time below, then come back here with your confirmation number.'}
                    </span>
                    <div>
                        <a className="bk-btn small primary" href={website} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}>
                            Open Booking Page
                        </a>
                    </div>
                </div>
            ) : null}

            <Field label="Restaurant" required htmlFor="rest-name">
                <PlaceInput id="rest-name" kind="restaurant" fill="name" value={values.name} onChange={set('name')} placeholder="Search for the restaurant by name" required onPick={(place) => place && setValues((current) => ({ ...current, name: place.name, address: place.address || current.address }))} />
            </Field>

            <Grid cols={3}>
                <Field label="Date" required htmlFor="rest-date">
                    <DateInput id="rest-date" value={values.date} onChange={set('date')} />
                </Field>
                <Field label="Time" required>
                    <TimeField value={values.time} onChange={set('time')} clearable={false} />
                </Field>
                <Field label="Guests">
                    <Stepper value={values.guests} onChange={set('guests')} min={1} max={30} label="Number Of Guests" />
                </Field>
            </Grid>

            <Field label="Address" hint="Add an address so it shows up on the map." htmlFor="rest-addr">
                <PlaceInput id="rest-addr" value={values.address} onChange={set('address')} placeholder="Search for the restaurant or its address" />
            </Field>

            <More label="Confirmation Number" startOpen={Boolean(values.confirmation) || opened}>
                <Field label="Confirmation Number" htmlFor="rest-conf">
                    <TextInput id="rest-conf" value={values.confirmation} onChange={(e) => set('confirmation')(e.target.value)} maxLength={80} placeholder="Add it once the table is booked" />
                </Field>
            </More>
        </FormSheet>
    );
}

export default RestaurantForm;
