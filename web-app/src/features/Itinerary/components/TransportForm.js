import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/Forms.css';

function TransportForm({ itineraryId, onClose, onTransportAdded }) {
    const [type, setType] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [dropoffTime, setDropoffTime] = useState('');
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [bookingReference, setBookingReference] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newTransport = {
            type: type,
            pickup_time: pickupTime,
            dropoff_time: dropoffTime,
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };

        try {
            const response = await apiClient.post(`/itineraries/${itineraryId}/transport`, newTransport);
            onTransportAdded(response.data);
            onClose();
        } catch (error) {
            console.error('Failed to add transport:', error);
        }
    };

    const handleClear = () => {
        setType('');
        setPickupTime('');
        setDropoffTime('');
        setPickupLocation('');
        setDropoffLocation('');
        setBookingReference('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Transport</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Type:
                        <input type="text" value={type} onChange={(e) => setType(e.target.value)} required />
                    </label>
                    <div className="date-fields">
                        <label>Pickup Time:
                            <input type="datetime-local" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} required />
                        </label>
                        <label>Dropoff Time:
                            <input type="datetime-local" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} required min={pickupTime} />
                        </label>
                    </div>
                    <label>Pickup Location:
                        <input type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} required />
                    </label>
                    <label>Dropoff Location:
                        <input type="text" value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} required />
                    </label>
                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="button" onClick={handleClear}>Clear</button>
                        <button type="submit">Add Transport</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransportForm;
