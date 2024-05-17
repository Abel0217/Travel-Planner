import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/Forms.css';

function FlightForm({ itineraryId, onClose, onFlightAdded }) {
    const [airline, setAirline] = useState('');
    const [flightNumber, setFlightNumber] = useState('');
    const [departureAirport, setDepartureAirport] = useState('');
    const [arrivalAirport, setArrivalAirport] = useState('');
    const [departureTime, setDepartureTime] = useState('');
    const [arrivalTime, setArrivalTime] = useState('');
    const [bookingReference, setBookingReference] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newFlight = {
            airline: airline,
            flight_number: flightNumber,
            departure_airport: departureAirport,
            arrival_airport: arrivalAirport,
            departure_time: departureTime,
            arrival_time: arrivalTime,
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };

        try {
            const response = await apiClient.post(`/itineraries/${itineraryId}/flights`, newFlight);
            onFlightAdded(response.data);
            onClose();
        } catch (error) {
            console.error('Failed to add flight:', error);
        }
    };

    const handleClear = () => {
        setAirline('');
        setFlightNumber('');
        setDepartureAirport('');
        setArrivalAirport('');
        setDepartureTime('');
        setArrivalTime('');
        setBookingReference('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Flight</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Airline:
                        <input type="text" value={airline} onChange={(e) => setAirline(e.target.value)} required />
                    </label>
                    <label>Flight Number:
                        <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} required />
                    </label>
                    <label>Departure Airport:
                        <input type="text" value={departureAirport} onChange={(e) => setDepartureAirport(e.target.value)} required />
                    </label>
                    <label>Arrival Airport:
                        <input type="text" value={arrivalAirport} onChange={(e) => setArrivalAirport(e.target.value)} required />
                    </label>
                    <label>Departure Time:
                        <input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
                    </label>
                    <label>Arrival Time:
                        <input type="datetime-local" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} required min={departureTime} />
                    </label>
                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="button" onClick={handleClear}>Clear</button>
                        <button type="submit">Add Flight</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FlightForm;
