import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import FlightForm from './FlightForm';

function FlightDetails({ itineraryId }) {
    const [flights, setFlights] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchFlights();
    }, [itineraryId]);

    const fetchFlights = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/flights`);
            setFlights(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch flights:', error);
            setError('Failed to fetch flights');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleFlightAdded = (newFlight) => {
        setFlights([...flights, newFlight]);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Flight Details</h2>
            <div className="card-container">
                {flights.map(flight => (
                    <div key={flight.flight_id} className="details-card">
                        <h3 className="details-card-title">{flight.airline}</h3>
                        <p className="details-card-info"><span className="field-title">Flight Number:</span> {flight.flight_number}</p>
                        <p className="details-card-info"><span className="field-title">Departure Airport:</span> {flight.departure_airport}</p>
                        <p className="details-card-info"><span className="field-title">Arrival Airport:</span> {flight.arrival_airport}</p>
                        <p className="details-card-info"><span className="field-title">Departure Time:</span> {formatDate(flight.departure_time)}</p>
                        <p className="details-card-info"><span className="field-title">Arrival Time:</span> {formatDate(flight.arrival_time)}</p>
                        <p className="details-card-info"><span className="field-title">Booking Reference:</span> {flight.booking_reference}</p>
                    </div>
                ))}
                <div className="add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <FlightForm itineraryId={itineraryId} onClose={() => setIsModalOpen(false)} onFlightAdded={handleFlightAdded} />
            )}
        </div>
    );
}

export default FlightDetails;
