import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import apiClient from '../../../api/apiClient';
import './css/Bookings.css';
import ActivityForm from './ActivityForm';
import HotelForm from './HotelForm';
import FlightForm from './FlightForm';
import RestaurantForm from './RestaurantForm';
import TransportForm from './TransportForm';

const Bookings = ({ itineraryId }) => {
    const [bookings, setBookings] = useState({
        activities: [],
        hotels: [],
        flights: [],
        restaurants: [],
        transport: []
    });
    const [expandedSections, setExpandedSections] = useState({
        flights: false,
        hotels: false,
        activities: false,
        restaurants: false,
        transport: false
    });
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [editingType, setEditingType] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ type: null, id: null });    
    
    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [
                    activitiesResponse,
                    hotelsResponse,
                    flightsResponse,
                    restaurantsResponse,
                    transportResponse
                ] = await Promise.all([
                    apiClient.get(`/itineraries/${itineraryId}/activities`).catch(error => {
                        console.error('Failed to fetch activities:', error);
                        return { data: [] };
                    }),
                    apiClient.get(`/itineraries/${itineraryId}/hotels`).catch(error => {
                        console.error('Failed to fetch hotels:', error);
                        return { data: [] };
                    }),
                    apiClient.get(`/itineraries/${itineraryId}/flights`).catch(error => {
                        console.error('Failed to fetch flights:', error);
                        return { data: [] };
                    }),
                    apiClient.get(`/itineraries/${itineraryId}/restaurants`).catch(error => {
                        console.error('Failed to fetch restaurants:', error);
                        return { data: [] };
                    }),
                    apiClient.get(`/itineraries/${itineraryId}/transport`).catch(error => {
                        console.error('Failed to fetch transport:', error);
                        return { data: [] };
                    })
                ]);

                console.log('Flights Response:', flightsResponse.data); 
                console.log('All Bookings Data:', {
                    activities: activitiesResponse.data,
                    hotels: hotelsResponse.data,
                    flights: flightsResponse.data,
                    restaurants: restaurantsResponse.data,
                    transport: transportResponse.data
                });        

                setBookings({
                    activities: activitiesResponse.data,
                    hotels: hotelsResponse.data,
                    flights: flightsResponse.data,
                    restaurants: restaurantsResponse.data,
                    transport: transportResponse.data
                });
            } catch (error) {
                console.error('Failed to fetch all data:', error);
            }
        };
    
        fetchAllData();
    }, [itineraryId]);
    
    const toggleSection = (section, e) => {
        e.stopPropagation();
        setExpandedSections(prevState => ({
            ...prevState,
            [section]: !prevState[section]
        }));
    };

    const showDeleteDialogHandler = (type, id) => {
        setDeleteTarget({ type, id });
        setShowDeleteDialog(true);
    };       
    
    const confirmDeleteAction = async () => {
        const { type, id } = deleteTarget;
    
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/${type}/${id}`);
            setBookings((prevBookings) => ({
                ...prevBookings,
                [type]: prevBookings[type].filter((item) => {
                    const itemIdKey = `${type.slice(0, -1)}_id`; 
                    return item[itemIdKey] !== id;
                }),
            }));
            setShowDeleteDialog(false); 
            setDeleteTarget({ type: null, id: null });
        } catch (error) {
            console.error(`Failed to delete ${type} with ID ${id}`, error);
        }
    };     
    
    const cancelDeleteAction = () => {
        setShowDeleteDialog(false);
        setDeleteTarget({ type: null, id: null });
    };
    
    const confirmDelete = (type, id) => {
        setDeleteTarget({ type, id });
        setShowDeleteDialog(true);
    };

    const handleDropdownClick = (id, e) => {
        e.stopPropagation();
        setActiveDropdown(prev => (prev === id ? null : id));
    };

    const handleOutsideClick = (event) => {
        if (!event.target.closest('.dropdown')) {
            setActiveDropdown(null);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    const handleEdit = (type, item) => {
        setEditingItem(item);
        setEditingType(type);
        setShowEditForm(true);
    };

    const handleDelete = async (type, id) => {
        const confirmDelete = window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`);
        if (!confirmDelete) return;

        try {
            await apiClient.delete(`/itineraries/${itineraryId}/${type}/${id}`);
            setBookings(prevBookings => ({
                ...prevBookings,
                [type]: prevBookings[type].filter(item => item.id !== id)
            }));
        } catch (error) {
            console.error(`Failed to delete ${type.slice(0, -1)} with id ${id}`, error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };
    
    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        const date = new Date(`1970-01-01T${timeString}`);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDateTime = (dateTimeString, includeTime = false) => {
        if (!dateTimeString) return 'N/A'; 
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        const date = new Date(dateTimeString);
        let formattedDate = date.toLocaleDateString('en-US', options);
    
        if (includeTime) {
            const timeString = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
            formattedDate = `${formattedDate}, ${timeString}`;
        }
    
        return formattedDate;
    };    

    return (
        <div className="bookings">
            <h2>My Bookings</h2>
    
            {['flights', 'hotels', 'activities', 'restaurants', 'transport'].map(section => (
                <div className="booking-section" key={section}>
                    <h3 className="dropdown-header" onClick={(e) => toggleSection(section, e)}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                    </h3>
                    {expandedSections[section] && (
                        <div className="booking-items-container">
                            {bookings[section].length ? bookings[section].map(
                                section === 'flights' ? flight => (
                                    <div key={flight.flight_id} className="booking-item">
                                        <div className="booking-item-header">
                                            <h4>{flight.passenger_name}</h4>
                                            <div className="dropdown" onClick={(e) => handleDropdownClick(flight.flight_id, e)}>
                                                <button className="dropdown-button">...</button>
                                                {activeDropdown === flight.flight_id && (
                                                    <div className="dropdown-content show">
                                                        <button onClick={() => showDeleteDialogHandler('flights', flight.flight_id)}>Delete</button>
                                                        </div>
                                                )}
                                            </div>
                                        </div>
                                        <p><strong>Airline:</strong> {flight.airline}</p>
                                        <p><strong>Flight Number:</strong> {flight.flight_number}</p>
                                        <p><strong>Departure Airport:</strong> {flight.departure_airport}</p>
                                        <p><strong>Arrival Airport:</strong> {flight.arrival_airport}</p>
                                        <p><strong>Departure:</strong> {formatDateTime(flight.departure_time, true)}</p>
                                        <p><strong>Arrival:</strong> {formatDateTime(flight.arrival_time, true)}</p>
                                        <p><strong>Seat Number:</strong> {flight.seat_number}</p>
                                        <p><strong>Booking Conformation:</strong> {flight.booking_reference}</p>
                                    </div>
                                ) :
                                section === 'hotels' ? hotel => (
                                    <div key={hotel.hotel_id} className="booking-item">
                                        <div className="booking-item-header">
                                            <h4>{hotel.hotel_name}</h4>
                                            <div className="dropdown" onClick={(e) => handleDropdownClick(hotel.hotel_id, e)}>
                                                <button className="dropdown-button">...</button>
                                                {activeDropdown === hotel.hotel_id && (
                                                    <div className="dropdown-content show">
                                                        <button onClick={() => showDeleteDialogHandler('hotels', hotel.hotel_id)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p><strong>Hotel Address:</strong> {hotel.address}</p>
                                        <p><strong>Check-In:</strong> {formatDate(hotel.check_in_date)}</p>
                                        <p><strong>Check-Out:</strong> {formatDate(hotel.check_out_date)}</p>
                                        <p><strong>Booking Confirmation:</strong> {hotel.booking_confirmation}</p>
                                    </div>
                                ) :
                                section === 'activities' ? activity => (
                                    <div key={activity.activity_id} className="booking-item">
                                        <div className="booking-item-header">
                                            <h4>{activity.title}</h4>
                                            <div className="dropdown" onClick={(e) => handleDropdownClick(activity.activity_id, e)}>
                                                <button className="dropdown-button">...</button>
                                                {activeDropdown === activity.activity_id && (
                                                    <div className="dropdown-content show">
                                                        <button onClick={() => showDeleteDialogHandler('activities', activity.activity_id)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p><strong>Address:</strong> {activity.location}</p>
                                        <p><strong>Activity Date:</strong> {formatDate(activity.activity_date)}</p>
                                        <p><strong>Activity Time: </strong> 
                                            {activity.start_time ? formatTime(activity.start_time) : 'N/A'}
                                            {activity.end_time ? ` - ${formatTime(activity.end_time)}` : ''}
                                        </p>
                                        <p><strong>Description:</strong> {activity.description}</p>
                                        <p><strong>Conformation Number:</strong> {activity.reservation_number}</p>
                                    </div>
                                ) :
                                section === 'restaurants' ? restaurant => (
                                    <div key={restaurant.reservation_id} className="booking-item">
                                        <div className="booking-item-header">
                                            <h4>{restaurant.restaurant_name}</h4>
                                            <div className="dropdown" onClick={(e) => handleDropdownClick(restaurant.reservation_id, e)}>
                                                <button className="dropdown-button">...</button>
                                                {activeDropdown === restaurant.reservation_id && (
                                                    <div className="dropdown-content show">
                                                        <button onClick={() => showDeleteDialogHandler('restaurants', restaurant.reservation_id)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p><strong>Restaurant Address:</strong> {restaurant.address}</p>
                                        <p><strong>Reservation Date:</strong> {formatDate(restaurant.reservation_date)}</p>
                                        <p><strong>Reservation Time:</strong> {formatTime(restaurant.reservation_time)}</p>
                                        <p><strong>Number of Guests:</strong> {restaurant.guest_number}</p>
                                    </div>
                                ) :
                                transport => (
                                    <div key={transport.transport_id} className="booking-item">
                                        <div className="booking-item-header">
                                            <h4>{transport.type}</h4>
                                            <div className="dropdown" onClick={(e) => handleDropdownClick(transport.transport_id, e)}>
                                                <button className="dropdown-button">...</button>
                                                {activeDropdown === transport.transport_id && (
                                                    <div className="dropdown-content show">
                                                        <button onClick={() => showDeleteDialogHandler('transport', transport.transport_id)}>Delete</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p><strong>Pickup Location:</strong> {transport.pickup_location}</p>
                                        <p><strong>Pickup Time:</strong> {formatDateTime(transport.pickup_time, true)}</p>
                                        <p><strong>Dropoff Location:</strong> {transport.dropoff_location}</p>
                                        <p><strong>Dropoff Time:</strong> {formatDateTime(transport.dropoff_time, true)}</p>
                                        <p><strong>Booking Conformation:</strong> {transport.booking_reference}</p>
                                    </div>
                                )
                            ) : <p>No {section} booked.</p>}
                        </div>
                    )}
                </div>
            ))}
    
            {/* Delete Confirmation Dialog */}
            <Dialog
                open={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">Delete Confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        Are you sure you want to delete this booking?
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button 
                        onClick={() => setShowDeleteDialog(false)} 
                        className="dialog-button"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDeleteAction}
                        className="dialog-button"
                        autoFocus
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );     
};

export default Bookings;
