import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import TransportForm from './TransportForm';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function TransportDetails({ itineraryId }) {
    const [transports, setTransports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [selectedTransport, setSelectedTransport] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchTransports();
        setupFirestoreListeners();
    }, [itineraryId]);

    const fetchTransports = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/transport`);
            setTransports(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch transports:', error);
            setError('Failed to fetch transports');
        }
    };

    const setupFirestoreListeners = () => {
        const transportsQuery = query(collection(db, 'transports'), where('itineraryId', '==', itineraryId));
        
        onSnapshot(transportsQuery, (snapshot) => {
            const transports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransports(transports);
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleTransportAdded = (newTransport) => {
        if (selectedTransport) {
            setTransports(transports.map(transport =>
                transport.transport_id === newTransport.transport_id ? newTransport : transport
            ));
        } else {
            setTransports([...transports, newTransport]);
        }
    };

    const handleEditTransport = (transport) => {
        setSelectedTransport(transport);
        setIsModalOpen(true);
    };

    const handleViewTransport = (transport) => {
        console.log('View transport:', transport);
    };

    const handleDeleteTransport = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/transport/${selectedTransport.transport_id}`);
            setTransports(transports.filter(transport => transport.transport_id !== selectedTransport.transport_id));
            setIsDeleteDialogOpen(false);
            setSelectedTransport(null);
        } catch (error) {
            console.error('Failed to delete transport:', error);
        }
    };

    const handleOpenDeleteDialog = (transport) => {
        setSelectedTransport(transport);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedTransport(null);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Transport Details</h2>
            <div className="card-container">
                {transports.map(transport => (
                    <div key={transport.transport_id} className="details-card">
                        <div>
                            <h3 className="details-card-title">{transport.type}</h3>
                            <p className="details-card-info"><span className="field-title">Pickup Time:</span> {formatDate(transport.pickup_time)}</p>
                            <p className="details-card-info"><span className="field-title">Dropoff Time:</span> {formatDate(transport.dropoff_time)}</p>
                            <p className="details-card-info"><span className="field-title">Pickup Location:</span> {transport.pickup_location}</p>
                            <p className="details-card-info"><span className="field-title">Dropoff Location:</span> {transport.dropoff_location}</p>
                            <p className="details-card-info"><span className="field-title">Booking Reference:</span> {transport.booking_reference}</p>
                        </div>
                        <div className="details-card-footer">
                            <Button size="small" onClick={() => handleEditTransport(transport)}>Edit</Button>
                            <Button size="small" onClick={() => handleViewTransport(transport)}>View</Button>
                            <Button size="small" color="secondary" onClick={() => handleOpenDeleteDialog(transport)}>Delete</Button>
                        </div>
                    </div>
                ))}
                <div className="details-card add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <TransportForm
                    itineraryId={itineraryId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedTransport(null);
                    }}
                    onTransportAdded={handleTransportAdded}
                    transportToEdit={selectedTransport}
                />
            )}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the transport "{selectedTransport?.type}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteTransport} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default TransportDetails;
