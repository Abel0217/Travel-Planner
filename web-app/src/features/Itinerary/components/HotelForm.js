import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function HotelForm({ itineraryId, startDate, endDate, onClose, onHotelAdded, hotelToEdit }) {
    const [hotelName, setHotelName] = useState('');
    const [checkInDate, setCheckInDate] = useState(startDate ? new Date(startDate) : new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');

    useEffect(() => {
        if (hotelToEdit) {
            setHotelName(hotelToEdit.hotel_name);
            setCheckInDate(new Date(hotelToEdit.check_in_date));
            setCheckOutDate(new Date(hotelToEdit.check_out_date));
            setAddress(hotelToEdit.address);
            setBookingConfirmation(hotelToEdit.booking_confirmation);
        }
    }, [hotelToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const updatedHotel = {
            hotel_name: hotelName,
            check_in_date: checkInDate.toISOString().split('T')[0],
            check_out_date: checkOutDate.toISOString().split('T')[0],
            address,
            booking_confirmation: bookingConfirmation,
            itinerary_id: itineraryId
        };

        try {
            if (hotelToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/hotels/${hotelToEdit.hotel_id}`, updatedHotel);
                onHotelAdded(response.data);

                // Update Firestore
                const hotelRef = doc(db, 'hotels', hotelToEdit.id);
                await updateDoc(hotelRef, updatedHotel);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/hotels`, updatedHotel);
                onHotelAdded(response.data);

                // Add to Firestore
                const newDocRef = doc(collection(db, 'hotels'));
                await setDoc(newDocRef, updatedHotel);
            }
        } catch (error) {
            console.error('Failed to save hotel:', error);
        }
        onClose();  // Ensure the form closes after saving
    };

    const handleClear = () => {
        setHotelName('');
        setCheckInDate(startDate ? new Date(startDate) : new Date());
        setCheckOutDate(new Date());
        setAddress('');
        setBookingConfirmation('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">{hotelToEdit ? 'Edit Hotel' : 'Add Hotel'}</h2>
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
                        <button type="submit">{hotelToEdit ? 'Save Changes' : 'Add Hotel'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default HotelForm;
