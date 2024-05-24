import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';

function HotelForm({ itineraryId, startDate, endDate, onClose, onHotelAdded }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [hotelName, setHotelName] = useState('');
    const [checkInDate, setCheckInDate] = useState(initialDate);
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newHotel = {
            hotel_name: hotelName,
            check_in_date: checkInDate.toISOString().slice(0, 10),
            check_out_date: checkOutDate.toISOString().slice(0, 10),
            address: address,
            booking_confirmation: bookingConfirmation,
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
        setCheckInDate(initialDate);
        setCheckOutDate(new Date());
        setAddress('');
        setBookingConfirmation('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Hotel</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Hotel Name:
                        <input type="text" value={hotelName} onChange={e => setHotelName(e.target.value)} required />
                    </label>
                    <div className="date-fields">
                        <label>Check-in Date:
                            <DatePicker
                                selected={checkInDate}
                                onChange={date => setCheckInDate(date)}
                                minDate={startDate ? new Date(startDate) : null}
                                maxDate={endDate ? new Date(endDate) : null}
                                dateFormat="yyyy-MM-dd"
                            />
                        </label>
                        <label>Check-out Date:
                            <DatePicker
                                selected={checkOutDate}
                                onChange={date => setCheckOutDate(date)}
                                minDate={checkInDate}
                                maxDate={endDate ? new Date(endDate) : null}
                                dateFormat="yyyy-MM-dd"
                            />
                        </label>
                    </div>
                    <label>Address:
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} required />
                    </label>
                    <label>Booking Confirmation:
                        <input type="text" value={bookingConfirmation} onChange={e => setBookingConfirmation(e.target.value)} required />
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
