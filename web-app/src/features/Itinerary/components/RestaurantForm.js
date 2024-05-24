import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';

function RestaurantForm({ itineraryId, startDate, endDate, onClose, onRestaurantAdded }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [restaurantName, setRestaurantName] = useState('');
    const [reservationDate, setReservationDate] = useState(initialDate);
    const [reservationTime, setReservationTime] = useState('');
    const [guestNumber, setGuestNumber] = useState('');
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newRestaurant = {
            restaurant_name: restaurantName,
            reservation_date: reservationDate.toISOString().slice(0, 10),
            reservation_time: reservationTime,
            guest_number: guestNumber,
            address: address,
            booking_confirmation: bookingConfirmation,
            itinerary_id: itineraryId
        };

        try {
            const response = await apiClient.post(`/itineraries/${itineraryId}/restaurants`, newRestaurant);
            onRestaurantAdded(response.data);
            onClose();
        } catch (error) {
            console.error('Failed to add restaurant:', error);
        }
    };

    const handleClear = () => {
        setRestaurantName('');
        setReservationDate(initialDate);
        setReservationTime('');
        setGuestNumber('');
        setAddress('');
        setBookingConfirmation('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Restaurant</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Restaurant Name:
                        <input type="text" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} required />
                    </label>
                    <div className="date-fields">
                        <label>Reservation Date:
                            <DatePicker
                                selected={reservationDate}
                                onChange={date => setReservationDate(date)}
                                minDate={startDate ? new Date(startDate) : null}
                                maxDate={endDate ? new Date(endDate) : null}
                                dateFormat="yyyy-MM-dd"
                            />
                        </label>
                        <label>Reservation Time:
                            <input type="time" value={reservationTime} onChange={e => setReservationTime(e.target.value)} required />
                        </label>
                    </div>
                    <label>Number of Guests:
                        <input type="number" value={guestNumber} onChange={e => setGuestNumber(e.target.value)} required />
                    </label>
                    <label>Address:
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} required />
                    </label>
                    <label>Booking Confirmation:
                        <input type="text" value={bookingConfirmation} onChange={e => setBookingConfirmation(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="button" onClick={handleClear}>Clear</button>
                        <button type="submit">Add Restaurant</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RestaurantForm;
