import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/Forms.css'; // Specific CSS for forms

function HotelForm({ itineraryId, onClose, onHotelAdded }) {
    const [hotelName, setHotelName] = useState('');
    const [checkInDate, setCheckInDate] = useState('');
    const [checkOutDate, setCheckOutDate] = useState('');
    const [address, setAddress] = useState('');
    const [bookingReference, setBookingReference] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newHotel = {
            hotel_name: hotelName,
            check_in_date: checkInDate,
            check_out_date: checkOutDate,
            address: address,
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };

        try {
            const response = await apiClient.post(`/itineraries/${itineraryId}/hotels`, newHotel);
            onHotelAdded(response.data);
            onClose();
        } catch (error) {
            console.error('Failed to add hotel:', error);
        }
    };

    const handleClear = () => {
        setHotelName('');
        setCheckInDate('');
        setCheckOutDate('');
        setAddress('');
        setBookingReference('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Hotel</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Hotel Name:
                        <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} required />
                    </label>
                    <div className="date-fields">
                        <label>Check-in Date:
                            <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} required />
                        </label>
                        <label>Check-out Date:
                            <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required min={checkInDate} />
                        </label>
                    </div>
                    <label>Address:
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required />
                    </label>
                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="button" onClick={handleClear}>Clear</button>
                        <button type="submit">Add Hotel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default HotelForm;
