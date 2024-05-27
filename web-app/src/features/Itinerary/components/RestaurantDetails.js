import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import RestaurantForm from './RestaurantForm';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

function RestaurantDetails({ itineraryId }) {
    const [restaurants, setRestaurants] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
            console.error('Failed to fetch restaurants:', error);
            setError('Failed to fetch restaurants');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleRestaurantAdded = (newRestaurant) => {
        if (selectedRestaurant) {
            setRestaurants(restaurants.map(restaurant =>
                restaurant.reservation_id === newRestaurant.reservation_id ? newRestaurant : restaurant
            ));
        } else {
            setRestaurants([...restaurants, newRestaurant]);
        }
    };

    const handleEditRestaurant = (restaurant) => {
        setSelectedRestaurant(restaurant);
        setIsModalOpen(true);
    };

    const handleViewRestaurant = (restaurant) => {
        console.log('View restaurant:', restaurant);
    };

    const handleDeleteRestaurant = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/restaurants/${selectedRestaurant.reservation_id}`);
            setRestaurants(restaurants.filter(restaurant => restaurant.reservation_id !== selectedRestaurant.reservation_id));
            setIsDeleteDialogOpen(false);
            setSelectedRestaurant(null);
        } catch (error) {
            console.error('Failed to delete restaurant:', error);
        }
    };

    const handleOpenDeleteDialog = (restaurant) => {
        setSelectedRestaurant(restaurant);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedRestaurant(null);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Restaurant Details</h2>
            <div className="card-container">
                {restaurants.map(restaurant => (
                    <div key={restaurant.reservation_id} className="details-card">
                        <div>
                            <h3 className="details-card-title">{restaurant.restaurant_name}</h3>
                            <p className="details-card-info"><span className="field-title">Reservation Date:</span> {formatDate(restaurant.reservation_date)}</p>
                            <p className="details-card-info"><span className="field-title">Reservation Time:</span> {restaurant.reservation_time}</p>
                            <p className="details-card-info"><span className="field-title">Guest Number:</span> {restaurant.guest_number}</p>
                            <p className="details-card-info"><span className="field-title">Address:</span> {restaurant.address}</p>
                            <p className="details-card-info"><span className="field-title">Booking Confirmation:</span> {restaurant.booking_confirmation}</p>
                        </div>
                        <div className="details-card-footer">
                            <Button size="small" onClick={() => handleEditRestaurant(restaurant)}>Edit</Button>
                            <Button size="small" onClick={() => handleViewRestaurant(restaurant)}>View</Button>
                            <Button size="small" color="secondary" onClick={() => handleOpenDeleteDialog(restaurant)}>Delete</Button>
                        </div>
                    </div>
                ))}
                <div className="details-card add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <RestaurantForm
                    itineraryId={itineraryId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedRestaurant(null);
                    }}
                    onRestaurantAdded={handleRestaurantAdded}
                    restaurantToEdit={selectedRestaurant}
                />
            )}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the restaurant "{selectedRestaurant?.restaurant_name}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteRestaurant} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default RestaurantDetails;
