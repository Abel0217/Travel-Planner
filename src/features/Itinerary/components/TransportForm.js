import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function TransportForm({ itineraryId, startDate, endDate, onClose, onTransportAdded, transportToEdit }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [type, setType] = useState('');
    const [pickupTime, setPickupTime] = useState(initialDate);
    const [dropoffTime, setDropoffTime] = useState(new Date());
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [bookingReference, setBookingReference] = useState('');

    useEffect(() => {
        if (transportToEdit) {
            setType(transportToEdit.type);
            setPickupTime(new Date(transportToEdit.pickup_time));
            setDropoffTime(new Date(transportToEdit.dropoff_time));
            setPickupLocation(transportToEdit.pickup_location);
            setDropoffLocation(transportToEdit.dropoff_location);
            setBookingReference(transportToEdit.booking_reference);
        }
    }, [transportToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedTransport = {
            type,
            pickup_time: pickupTime.toISOString(),
            dropoff_time: dropoffTime.toISOString(),
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };

        try {
            if (transportToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/transport/${transportToEdit.transport_id}`, updatedTransport);
                onTransportAdded(response.data);

                // Update Firestore
                const transportRef = doc(db, 'transports', transportToEdit.id);
                await updateDoc(transportRef, updatedTransport);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/transport`, updatedTransport);
                onTransportAdded(response.data);

                // Add to Firestore
                const newDocRef = doc(collection(db, 'transports'));
                await setDoc(newDocRef, updatedTransport);
            }
        } catch (error) {
            console.error('Failed to save transport:', error);
        }
        onClose();  
    };

    const handleClear = () => {
        setType('');
        setPickupTime(initialDate);
        setDropoffTime(new Date());
        setPickupLocation('');
        setDropoffLocation('');
        setBookingReference('');
    };

    return (
        <div className="form-container full-size">
            <h2 className="form-title">{transportToEdit ? 'Edit Transport' : 'Add Transport'}</h2>
            <form onSubmit={handleSubmit}>
                <label>Method of Transportation:
                    <input type="text" value={type} onChange={e => setType(e.target.value)} required />
                </label>
                <div className="date-fields">
                    <label>Pickup Time:
                        <DatePicker
                            selected={pickupTime}
                            onChange={date => setPickupTime(date)}
                            minDate={startDate ? new Date(startDate) : new Date()}
                            maxDate={endDate ? new Date(endDate) : null}
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                        />
                    </label>
                    <label>Dropoff Time:
                        <DatePicker
                            selected={dropoffTime}
                            onChange={date => setDropoffTime(date)}
                            minDate={startDate ? new Date(startDate) : new Date()}
                            maxDate={endDate ? new Date(endDate) : null}
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                        />
                    </label>
                </div>
                <label>Pickup Location:
                    <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} required />
                </label>
                <label>Dropoff Location:
                    <input type="text" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} required />
                </label>
                <label>Booking Reference:
                    <input type="text" value={bookingReference} onChange={e => setBookingReference(e.target.value)} required />
                </label>
                <div className="form-buttons">
                    <button type="submit">{transportToEdit ? 'Save Changes' : 'Add Transport'}</button>
                    <button type="button" onClick={handleClear}>Clear</button>
                </div>
            </form>
        </div>
    );
}

export default TransportForm;
