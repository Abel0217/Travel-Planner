import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [activitiesResponse, hotelsResponse, flightsResponse, restaurantsResponse, transportResponse] = await Promise.all([
                    apiClient.get(`/itineraries/${itineraryId}/activities`),
                    apiClient.get(`/itineraries/${itineraryId}/hotels`),
                    apiClient.get(`/itineraries/${itineraryId}/flights`),
                    apiClient.get(`/itineraries/${itineraryId}/restaurants`),
                    apiClient.get(`/itineraries/${itineraryId}/transport`)
                ]);

                setBookings({
                    activities: activitiesResponse.data,
                    hotels: hotelsResponse.data,
                    flights: flightsResponse.data,
                    restaurants: restaurantsResponse.data,
                    transport: transportResponse.data
                });
            } catch (error) {
                console.error('Failed to fetch all data', error);
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

    const formatDate = (dateString, includeTime = false) => {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        const date = new Date(dateString);
        const dateStringFormatted = date.toLocaleDateString('en-US', options);
        if (includeTime) {
            const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `${dateStringFormatted} at ${timeString}`;
        }
        return dateStringFormatted;
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
                            {bookings[section].length ? bookings[section].map(item => (
                                <div key={item.id || item.flight_id || item.hotel_id || item.activity_id || item.reservation_id || item.transport_id} className="booking-item">
                                    <div className="booking-item-header">
                                        <h4>{item.title || item.airline || item.hotel_name || item.restaurant_name || item.type}</h4>
                                        <div className="dropdown" onClick={(e) => handleDropdownClick(item.id || item.flight_id || item.hotel_id || item.activity_id || item.reservation_id || item.transport_id, e)}>
                                            <button className="dropdown-button">...</button>
                                            {activeDropdown === (item.id || item.flight_id || item.hotel_id || item.activity_id || item.reservation_id || item.transport_id) && (
                                                <div className="dropdown-content show">
                                                    <button onClick={() => handleEdit(section, item)}>Edit</button>
                                                    <button onClick={() => handleDelete(section, item.id || item.flight_id || item.hotel_id || item.activity_id || item.reservation_id || item.transport_id)}>Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {section === 'flights' && (
                                        <>
                                            <p><strong>Flight Number:</strong> {item.flight_number}</p>
                                            <p><strong>Departure Airport:</strong> {item.departure_airport}</p>
                                            <p><strong>Arrival Airport:</strong> {item.arrival_airport}</p>
                                            <p><strong>Departure Time:</strong> {formatDate(item.departure_time, true)}</p>
                                            <p><strong>Arrival Time:</strong> {formatDate(item.arrival_time, true)}</p>
                                            <p><strong>Booking Reference:</strong> {item.booking_reference}</p>
                                        </>
                                    )}
                                    {section === 'hotels' && (
                                        <>
                                            <p><strong>Check-in:</strong> {formatDate(item.check_in_date)}</p>
                                            <p><strong>Check-out:</strong> {formatDate(item.check_out_date)}</p>
                                            <p><strong>Address:</strong> {item.address}</p>
                                            <p><strong>Booking Confirmation:</strong> {item.booking_confirmation}</p>
                                        </>
                                    )}
                                    {section === 'activities' && (
                                        <>
                                            <p><strong>Location:</strong> {item.location}</p>
                                            <p><strong>Date:</strong> {formatDate(item.activity_date)}</p>
                                            <p><strong>Start Time:</strong> {formatDate(item.start_time, true)}</p>
                                            <p><strong>End Time:</strong> {formatDate(item.end_time, true)}</p>
                                            <p><strong>Description:</strong> {item.description}</p>
                                            <p><strong>Reservation Number:</strong> {item.reservation_number}</p>
                                        </>
                                    )}
                                    {section === 'restaurants' && (
                                        <>
                                            <p><strong>Reservation Date:</strong> {formatDate(item.reservation_date)}</p>
                                            <p><strong>Reservation Time:</strong> {formatDate(item.reservation_time, true)}</p>
                                            <p><strong>Address:</strong> {item.address}</p>
                                            <p><strong>Booking Confirmation:</strong> {item.booking_confirmation}</p>
                                        </>
                                    )}
                                    {section === 'transport' && (
                                        <>
                                            <p><strong>Pickup Time:</strong> {formatDate(item.pickup_time, true)}</p>
                                            <p><strong>Dropoff Time:</strong> {formatDate(item.dropoff_time, true)}</p>
                                            <p><strong>Pickup Location:</strong> {item.pickup_location}</p>
                                            <p><strong>Dropoff Location:</strong> {item.dropoff_location}</p>
                                            <p><strong>Booking Reference:</strong> {item.booking_reference}</p>
                                        </>
                                    )}
                                </div>
                            )) : <p>No {section} booked.</p>}
                        </div>
                    )}
                </div>
            ))}
            {showEditForm && editingType === 'activity' && (
                <ActivityForm
                    itineraryId={itineraryId}
                    startDate={editingItem.activity_date}
                    endDate={editingItem.activity_date}
                    onClose={() => setShowEditForm(false)}
                    onActivityAdded={(updatedActivity) => {
                        setBookings(prevBookings => ({
                            ...prevBookings,
                            activities: prevBookings.activities.map(activity =>
                                activity.activity_id === updatedActivity.activity_id ? updatedActivity : activity
                            )
                        }));
                        setShowEditForm(false);
                    }}
                    activityToEdit={editingItem}
                />
            )}
            {showEditForm && editingType === 'hotel' && (
                <HotelForm
                    itineraryId={itineraryId}
                    startDate={editingItem.check_in_date}
                    endDate={editingItem.check_out_date}
                    onClose={() => setShowEditForm(false)}
                    onHotelAdded={(updatedHotel) => {
                        setBookings(prevBookings => ({
                            ...prevBookings,
                            hotels: prevBookings.hotels.map(hotel =>
                                hotel.hotel_id === updatedHotel.hotel_id ? updatedHotel : hotel
                            )
                        }));
                        setShowEditForm(false);
                    }}
                    hotelToEdit={editingItem}
                />
            )}
            {showEditForm && editingType === 'flight' && (
                <FlightForm
                    itineraryId={itineraryId}
                    startDate={editingItem.departure_time}
                    endDate={editingItem.arrival_time}
                    onClose={() => setShowEditForm(false)}
                    onFlightAdded={(updatedFlight) => {
                        setBookings(prevBookings => ({
                            ...prevBookings,
                            flights: prevBookings.flights.map(flight =>
                                flight.flight_id === updatedFlight.flight_id ? updatedFlight : flight
                            )
                        }));
                        setShowEditForm(false);
                    }}
                    flightToEdit={editingItem}
                />
            )}
            {showEditForm && editingType === 'restaurant' && (
                <RestaurantForm
                    itineraryId={itineraryId}
                    startDate={editingItem.reservation_date}
                    endDate={editingItem.reservation_date}
                    onClose={() => setShowEditForm(false)}
                    onRestaurantAdded={(updatedRestaurant) => {
                        setBookings(prevBookings => ({
                            ...prevBookings,
                            restaurants: prevBookings.restaurants.map(restaurant =>
                                restaurant.reservation_id === updatedRestaurant.reservation_id ? updatedRestaurant : restaurant
                            )
                        }));
                        setShowEditForm(false);
                    }}
                    restaurantToEdit={editingItem}
                />
            )}
            {showEditForm && editingType === 'transport' && (
                <TransportForm
                    itineraryId={itineraryId}
                    startDate={editingItem.pickup_time}
                    endDate={editingItem.dropoff_time}
                    onClose={() => setShowEditForm(false)}
                    onTransportAdded={(updatedTransport) => {
                        setBookings(prevBookings => ({
                            ...prevBookings,
                            transport: prevBookings.transport.map(transport =>
                                transport.transport_id === updatedTransport.transport_id ? updatedTransport : transport
                            )
                        }));
                        setShowEditForm(false);
                    }}
                    transportToEdit={editingItem}
                />
            )}
        </div>
    );
};

export default Bookings;
