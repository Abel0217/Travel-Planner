import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';

function TransportForm({ itineraryId, startDate, endDate, onClose, onTransportAdded }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [type, setType] = useState('');
    const [pickupTime, setPickupTime] = useState(initialDate);
    const [dropoffTime, setDropoffTime] = useState(new Date());
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [bookingReference, setBookingReference] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newTransport = {
            type,
            pickup_time: pickupTime.toISOString(),
            dropoff_time: dropoffTime.toISOString(),
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            booking_reference: bookingReference,
            itinerary_id: itineraryId,
            day_id: null // Assuming you have dayId logic similar to restaurant logic
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
        setPickupTime(initialDate);
        setDropoffTime(new Date());
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
                        <button type="submit">Add Transport</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransportForm;
