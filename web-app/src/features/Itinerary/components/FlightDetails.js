import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import FlightForm from './FlightForm';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function FlightDetails({ itineraryId }) {
    const [flights, setFlights] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchFlights();
        setupFirestoreListeners();
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

    const setupFirestoreListeners = () => {
        const flightsQuery = query(collection(db, 'flights'), where('itineraryId', '==', itineraryId));
        
        onSnapshot(flightsQuery, (snapshot) => {
            const flights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFlights(flights);
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleFlightAdded = (newFlight) => {
        if (selectedFlight) {
            setFlights(flights.map(flight =>
                flight.flight_id === newFlight.flight_id ? newFlight : flight
            ));
        } else {
            setFlights([...flights, newFlight]);
        }
    };

    const handleEditFlight = (flight) => {
        setSelectedFlight(flight);
        setIsModalOpen(true);
    };

    const handleViewFlight = (flight) => {
        console.log('View flight:', flight);
    };

    const handleDeleteFlight = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/flights/${selectedFlight.flight_id}`);
            setFlights(flights.filter(flight => flight.flight_id !== selectedFlight.flight_id));
            setIsDeleteDialogOpen(false);
            setSelectedFlight(null);
        } catch (error) {
            console.error('Failed to delete flight:', error);
        }
    };

    const handleOpenDeleteDialog = (flight) => {
        setSelectedFlight(flight);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedFlight(null);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Flight Details</h2>
            <div className="card-container">
                {flights.map(flight => (
                    <div key={flight.flight_id} className="details-card">
                        <div>
                            <h3 className="details-card-title">{flight.airline}</h3>
                            <p className="details-card-info"><span className="field-title">Flight Number:</span> {flight.flight_number}</p>
                            <p className="details-card-info"><span className="field-title">Departure Airport:</span> {flight.departure_airport}</p>
                            <p className="details-card-info"><span className="field-title">Arrival Airport:</span> {flight.arrival_airport}</p>
                            <p className="details-card-info"><span className="field-title">Departure Time:</span> {formatDate(flight.departure_time)}</p>
                            <p className="details-card-info"><span className="field-title">Arrival Time:</span> {formatDate(flight.arrival_time)}</p>
                            <p className="details-card-info"><span className="field-title">Booking Reference:</span> {flight.booking_reference}</p>
                        </div>
                        <div className="details-card-footer">
                            <Button size="small" onClick={() => handleEditFlight(flight)}>Edit</Button>
                            <Button size="small" onClick={() => handleViewFlight(flight)}>View</Button>
                            <Button size="small" color="secondary" onClick={() => handleOpenDeleteDialog(flight)}>Delete</Button>
                        </div>
                    </div>
                ))}
                <div className="details-card add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <FlightForm
                    itineraryId={itineraryId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedFlight(null);
                    }}
                    onFlightAdded={handleFlightAdded}
                    flightToEdit={selectedFlight}
                />
            )}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the flight "{selectedFlight?.airline}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteFlight} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default FlightDetails;
