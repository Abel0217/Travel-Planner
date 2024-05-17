import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import TransportForm from './TransportForm';

function TransportDetails({ itineraryId }) {
    const [transports, setTransports] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchTransports();
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

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleTransportAdded = (newTransport) => {
        setTransports([...transports, newTransport]);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Transport Details</h2>
            <div className="card-container">
                {transports.map(transport => (
                    <div key={transport.transport_id} className="details-card">
                        <h3 className="details-card-title">{transport.type}</h3>
                        <p className="details-card-info"><span className="field-title">Pickup Time:</span> {formatDate(transport.pickup_time)}</p>
                        <p className="details-card-info"><span className="field-title">Dropoff Time:</span> {formatDate(transport.dropoff_time)}</p>
                        <p className="details-card-info"><span className="field-title">Pickup Location:</span> {transport.pickup_location}</p>
                        <p className="details-card-info"><span className="field-title">Dropoff Location:</span> {transport.dropoff_location}</p>
                        <p className="details-card-info"><span className="field-title">Booking Reference:</span> {transport.booking_reference}</p>
                    </div>
                ))}
                <div className="add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <TransportForm itineraryId={itineraryId} onClose={() => setIsModalOpen(false)} onTransportAdded={handleTransportAdded} />
            )}
        </div>
    );
}

export default TransportDetails;
