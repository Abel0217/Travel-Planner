import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient'; 
import './css/FlightsTab.css';
import FlightForm from './FlightForm';  

const FlightsTab = ({ itineraryId }) => {
    const [flights, setFlights] = useState([]);

    useEffect(() => {
        apiClient.get(`/itineraries/${itineraryId}/flights`)
            .then(response => {
                setFlights(response.data);
            })
            .catch(error => {
                console.error('Failed to fetch flights', error);
            });
    }, [itineraryId]);

    const handleAddFlight = () => {
        console.log('Adding new flight');
    };

    const handleEditFlight = (flightId) => {
        console.log('Editing flight:', flightId);
    };

    const handleDeleteFlight = (flightId) => {
        console.log('Deleting flight:', flightId);
    };

    return (
        <div>
            <h2>Flights Information</h2>
            <button onClick={handleAddFlight}>Add Flight</button>
            {flights.map(flight => (
                <div key={flight.id} className="flight-info">
                    <h3>{flight.airline}: {flight.flightNumber}</h3>
                    <p>From {flight.departureAirport} to {flight.arrivalAirport}</p>
                    <p>Departure: {flight.departureTime}, Arrival: {flight.arrivalTime}</p>
                    <button onClick={() => handleEditFlight(flight.id)}>Edit</button>
                    <button onClick={() => handleDeleteFlight(flight.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
};

export default FlightsTab;
