import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function FlightForm({ itineraryId, onClose, onFlightAdded, flightToEdit }) {
    const [airline, setAirline] = useState('');
    const [flightNumber, setFlightNumber] = useState('');
    const [departureAirport, setDepartureAirport] = useState('');
    const [arrivalAirport, setArrivalAirport] = useState('');
    const [departureTime, setDepartureTime] = useState(new Date());
    const [arrivalTime, setArrivalTime] = useState(new Date());
    const [bookingReference, setBookingReference] = useState('');

    useEffect(() => {
        if (flightToEdit) {
            setAirline(flightToEdit.airline);
            setFlightNumber(flightToEdit.flight_number);
            setDepartureAirport(flightToEdit.departure_airport);
            setArrivalAirport(flightToEdit.arrival_airport);
            setDepartureTime(new Date(flightToEdit.departure_time));
            setArrivalTime(new Date(flightToEdit.arrival_time));
            setBookingReference(flightToEdit.booking_reference);
        }
    }, [flightToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedFlight = {
            airline,
            flight_number: flightNumber,
            departure_airport: departureAirport,
            arrival_airport: arrivalAirport,
            departure_time: departureTime.toISOString(),
            arrival_time: arrivalTime.toISOString(),
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };

        try {
            if (flightToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/flights/${flightToEdit.flight_id}`, updatedFlight);
                onFlightAdded(response.data);
                
                // Update Firestore
                const flightRef = doc(db, 'flights', flightToEdit.id);
                await updateDoc(flightRef, updatedFlight);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/flights`, updatedFlight);
                onFlightAdded(response.data);
                
                // Add to Firestore
                const newDocRef = doc(collection(db, 'flights'));
                await setDoc(newDocRef, updatedFlight);
            }
        } catch (error) {
            console.error('Failed to save flight:', error);
        }
        onClose();  // Ensure the form closes after saving
    };

    const handleClear = () => {
        setAirline('');
        setFlightNumber('');
        setDepartureAirport('');
        setArrivalAirport('');
        setDepartureTime(new Date());
        setArrivalTime(new Date());
        setBookingReference('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">{flightToEdit ? 'Edit Flight' : 'Add Flight'}</h2>
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
                    <div className="date-fields">
                        <label>Departure Time:
                            <DatePicker
                                selected={departureTime}
                                onChange={date => setDepartureTime(date)}
                                showTimeSelect
                                dateFormat="MMMM d, yyyy h:mm aa"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                timeCaption="Time"
                            />
                        </label>
                        <label>Arrival Time:
                            <DatePicker
                                selected={arrivalTime}
                                onChange={date => setArrivalTime(date)}
                                showTimeSelect
                                dateFormat="MMMM d, yyyy h:mm aa"
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                timeCaption="Time"
                                minDate={departureTime}
                            />
                        </label>
                    </div>
                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{flightToEdit ? 'Save Changes' : 'Add Flight'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default FlightForm;