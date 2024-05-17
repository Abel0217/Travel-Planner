import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';   // Specific CSS for cards
import RestaurantForm from './RestaurantForm';

function RestaurantDetails({ itineraryId }) {
    const [restaurants, setRestaurants] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchRestaurants();
    }, [itineraryId]);

    const fetchRestaurants = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/restaurants`);
            setRestaurants(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch restaurants', error);
            setError('Failed to fetch restaurants');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleRestaurantAdded = (newRestaurant) => {
        setRestaurants([...restaurants, newRestaurant]);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Restaurant Details</h2>
            <div className="card-container">
                {restaurants.map(restaurant => (
                    <div key={restaurant.reservation_id} className="details-card">
                        <h3 className="details-card-title">{restaurant.restaurant_name}</h3>
                        <p className="details-card-info"><span className="field-title">Reservation Date:</span> {formatDate(restaurant.reservation_date)}</p>
                        <p className="details-card-info"><span className="field-title">Reservation Time:</span> {restaurant.reservation_time}</p>
                        <p className="details-card-info"><span className="field-title">Guest Number:</span> {restaurant.guest_number}</p>
                        <p className="details-card-info"><span className="field-title">Address:</span> {restaurant.address}</p>
                        <p className="details-card-info"><span className="field-title">Booking Confirmation:</span> {restaurant.booking_confirmation}</p>
                    </div>
                ))}
                <div className="add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <RestaurantForm itineraryId={itineraryId} onClose={() => setIsModalOpen(false)} onRestaurantAdded={handleRestaurantAdded} />
            )}
        </div>
    );
}

export default RestaurantDetails;
