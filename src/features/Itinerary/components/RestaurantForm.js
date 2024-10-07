import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function RestaurantForm({ itineraryId, startDate, endDate, onClose, onRestaurantAdded, restaurantToEdit }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [restaurantName, setRestaurantName] = useState('');
    const [reservationDate, setReservationDate] = useState(initialDate);
    const [reservationTime, setReservationTime] = useState('');
    const [guestNumber, setGuestNumber] = useState('');
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');

    useEffect(() => {
        if (restaurantToEdit) {
            setRestaurantName(restaurantToEdit.restaurant_name);
            setReservationDate(new Date(restaurantToEdit.reservation_date));
            setReservationTime(restaurantToEdit.reservation_time);
            setGuestNumber(restaurantToEdit.guest_number);
            setAddress(restaurantToEdit.address);
            setBookingConfirmation(restaurantToEdit.booking_confirmation);
        }
    }, [restaurantToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const updatedRestaurant = {
            restaurant_name: restaurantName,
            reservation_date: reservationDate.toISOString().slice(0, 10),
            reservation_time: reservationTime,
            guest_number: guestNumber,
            address: address,
            booking_confirmation: bookingConfirmation,
            itinerary_id: itineraryId
        };

        try {
            if (restaurantToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/restaurants/${restaurantToEdit.reservation_id}`, updatedRestaurant);
                onRestaurantAdded(response.data);

                // Update Firestore
                const restaurantRef = doc(db, 'restaurants', restaurantToEdit.id);
                await updateDoc(restaurantRef, updatedRestaurant);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/restaurants`, updatedRestaurant);
                onRestaurantAdded(response.data);

                // Add to Firestore
                const newDocRef = doc(collection(db, 'restaurants'));
                await setDoc(newDocRef, updatedRestaurant);
            }
        } catch (error) {
            console.error('Failed to save restaurant:', error);
        }
        onClose();  
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
        <div className="form-container full-size">
            <h2 className="form-title">{restaurantToEdit ? 'Edit Restaurant' : 'Add Restaurant'}</h2>
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
                    <input type="number" value={guestNumber} onChange={e => setGuestNumber(e.target.value)} />
                </label>
                <label>Address:
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} required />
                </label>
                <label>Booking Confirmation:
                    <input type="text" value={bookingConfirmation} onChange={e => setBookingConfirmation(e.target.value)} required />
                </label>
                <div className="form-buttons">
                    <button type="button" onClick={handleClear}>Clear</button>
                    <button type="submit">{restaurantToEdit ? 'Save Changes' : 'Add Restaurant'}</button>
                </div>
            </form>
        </div>
    );
}

export default RestaurantForm;
