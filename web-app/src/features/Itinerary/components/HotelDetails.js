import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';   // Specific CSS for cards
import HotelForm from './HotelForm';

function HotelDetails({ itineraryId }) {
    const [hotels, setHotels] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchHotels();
    }, [itineraryId]);

    const fetchHotels = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/hotels`);
            setHotels(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch hotels', error);
            setError('Failed to fetch hotels');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleHotelAdded = (newHotel) => {
        setHotels([...hotels, newHotel]);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Hotel Details</h2>
            <div className="card-container">
                {hotels.map(hotel => (
                    <div key={hotel.hotel_id} className="details-card">
                        <h3 className="details-card-title">{hotel.hotel_name}</h3>
                        <p className="details-card-info"><span className="field-title">Check-in Date:</span> {formatDate(hotel.check_in_date)}</p>
                        <p className="details-card-info"><span className="field-title">Check-out Date:</span> {formatDate(hotel.check_out_date)}</p>
                        <p className="details-card-info"><span className="field-title">Address:</span> {hotel.address}</p>
                        <p className="details-card-info"><span className="field-title">Booking Confirmation:</span> {hotel.booking_confirmation}</p>
                    </div>
                ))}
                <div className="add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <HotelForm itineraryId={itineraryId} onClose={() => setIsModalOpen(false)} onHotelAdded={handleHotelAdded} />
            )}
        </div>
    );
}

export default HotelDetails;
