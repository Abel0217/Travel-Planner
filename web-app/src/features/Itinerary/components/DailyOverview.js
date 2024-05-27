import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DailyOverview.css';
import ActivityForm from './ActivityForm';
import HotelForm from './HotelForm';
import FlightForm from './FlightForm';
import RestaurantForm from './RestaurantForm';
import TransportForm from './TransportForm';

const DailyOverview = ({ itineraryId }) => {
    const [days, setDays] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [allHotels, setAllHotels] = useState([]);
    const [allFlights, setAllFlights] = useState([]);
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [allTransport, setAllTransport] = useState([]);
    const [bookings, setBookings] = useState({});
    const [expandedDay, setExpandedDay] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        const fetchItineraryData = async () => {
            try {
                const response = await apiClient.get(`/itineraries/${itineraryId}`);
                const { start_date, end_date } = response.data;
                generateDays(start_date, end_date);
                await fetchAllData();
            } catch (error) {
                console.error('Failed to fetch itinerary data', error);
            }
        };

        fetchItineraryData();
    }, [itineraryId]);

    const generateDays = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysList = [];
        let current = new Date(start);

        while (current <= end) {
            daysList.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        setDays(daysList);
    };

    const fetchAllData = async () => {
        try {
            const [activitiesResponse, hotelsResponse, flightsResponse, restaurantsResponse, transportResponse] = await Promise.all([
                apiClient.get(`/itineraries/${itineraryId}/activities`),
                apiClient.get(`/itineraries/${itineraryId}/hotels`),
                apiClient.get(`/itineraries/${itineraryId}/flights`),
                apiClient.get(`/itineraries/${itineraryId}/restaurants`),
                apiClient.get(`/itineraries/${itineraryId}/transport`)
            ]);

            setAllActivities(activitiesResponse.data);
            setAllHotels(hotelsResponse.data);
            setAllFlights(flightsResponse.data);
            setAllRestaurants(restaurantsResponse.data);
            setAllTransport(transportResponse.data);
        } catch (error) {
            console.error('Failed to fetch all data', error);
        }
    };

    const fetchBookingsForDay = (date) => {
        const filteredActivities = allActivities.filter(activity => {
            const activityDate = new Date(activity.activity_date).toISOString().split('T')[0];
            return activityDate === date;
        });

        const filteredHotels = allHotels.filter(hotel => {
            const checkInDate = new Date(hotel.check_in_date).toISOString().split('T')[0];
            const checkOutDate = new Date(hotel.check_out_date).toISOString().split('T')[0];
            return date >= checkInDate && date <= checkOutDate;
        });

        const filteredFlights = allFlights.filter(flight => {
            const departureDate = new Date(flight.departure_time).toISOString().split('T')[0];
            return departureDate === date;
        });

        const filteredRestaurants = allRestaurants.filter(restaurant => {
            const reservationDate = new Date(restaurant.reservation_date).toISOString().split('T')[0];
            return reservationDate === date;
        });

        const filteredTransport = allTransport.filter(transport => {
            const pickupDate = new Date(transport.pickup_time).toISOString().split('T')[0];
            const dropoffDate = new Date(transport.dropoff_time).toISOString().split('T')[0];
            return (date >= pickupDate && date <= dropoffDate);
        });

        setBookings(prevBookings => ({
            ...prevBookings,
            [date]: {
                activities: filteredActivities,
                hotels: filteredHotels,
                flights: filteredFlights,
                restaurants: filteredRestaurants,
                transport: filteredTransport
            }
        }));
    };

    const toggleDay = (date) => {
        if (expandedDay === date) {
            setExpandedDay(null);
        } else {
            if (!bookings[date]) {
                fetchBookingsForDay(date);
            }
            setExpandedDay(date);
        }
    };

    const openForm = (formType, date) => {
        setFormType(formType);
        setSelectedDate(date);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setFormType(null);
        setSelectedDate(null);
    };

    return (
        <div className="daily-overview">
            <h2>Overview</h2>
            {days.map(day => {
                const dateString = day.toISOString().split('T')[0];
                return (
                    <div key={dateString} className="day-item">
                        <div className="day-header" onClick={() => toggleDay(dateString)}>
                            {day.toDateString()}
                        </div>
                        {expandedDay === dateString && (
                            <div className="day-details">
                                {bookings[dateString] ? (
                                    <>
                                        {bookings[dateString].activities.length > 0 ? (
                                            <>
                                                <h3>Activities</h3>
                                                {bookings[dateString].activities.map(activity => (
                                                    <div key={activity.activity_id} className="booking-item">
                                                        <h4>{activity.title}</h4>
                                                        <p><strong>Location:</strong> {activity.location}</p>
                                                        <p><strong>Time:</strong> {activity.start_time}</p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : null}
                                        {bookings[dateString].hotels.length > 0 ? (
                                            <>
                                                <h3>Hotels</h3>
                                                {bookings[dateString].hotels.map(hotel => (
                                                    <div key={hotel.hotel_id} className="booking-item">
                                                        <h4>{hotel.hotel_name}</h4>
                                                        <p><strong>Check-in:</strong> {hotel.check_in_date}</p>
                                                        <p><strong>Check-out:</strong> {hotel.check_out_date}</p>
                                                        <p><strong>Address:</strong> {hotel.address}</p>
                                                        <p><strong>Booking Reference:</strong> {hotel.booking_reference}</p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : null}
                                        {bookings[dateString].flights.length > 0 ? (
                                            <>
                                                <h3>Flights</h3>
                                                {bookings[dateString].flights.map(flight => (
                                                    <div key={flight.flight_id} className="booking-item">
                                                        <h4>{flight.airline}</h4>
                                                        <p><strong>Flight Number:</strong> {flight.flight_number}</p>
                                                        <p><strong>Departure:</strong> {flight.departure_airport} at {new Date(flight.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p><strong>Arrival:</strong> {flight.arrival_airport} at {new Date(flight.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p><strong>Booking Reference:</strong> {flight.booking_reference}</p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : null}
                                        {bookings[dateString].restaurants.length > 0 ? (
                                            <>
                                                <h3>Restaurants</h3>
                                                {bookings[dateString].restaurants.map(restaurant => (
                                                    <div key={restaurant.reservation_id} className="booking-item">
                                                        <h4>{restaurant.restaurant_name}</h4>
                                                        <p><strong>Reservation Date:</strong> {restaurant.reservation_date}</p>
                                                        <p><strong>Reservation Time:</strong> {new Date(restaurant.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p><strong>Address:</strong> {restaurant.address}</p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : null}
                                        {bookings[dateString].transport.length > 0 ? (
                                            <>
                                                <h3>Transport</h3>
                                                {bookings[dateString].transport.map(transport => (
                                                    <div key={transport.transport_id} className="booking-item">
                                                        <h4>{transport.type}</h4>
                                                        <p><strong>Pickup Time:</strong> {new Date(transport.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p><strong>Dropoff Time:</strong> {new Date(transport.dropoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        <p><strong>Pickup Location:</strong> {transport.pickup_location}</p>
                                                        <p><strong>Dropoff Location:</strong> {transport.dropoff_location}</p>
                                                    </div>
                                                ))}
                                            </>
                                        ) : null}
                                        {bookings[dateString].activities.length === 0 &&
                                         bookings[dateString].hotels.length === 0 &&
                                         bookings[dateString].flights.length === 0 &&
                                         bookings[dateString].restaurants.length === 0 &&
                                         bookings[dateString].transport.length === 0 && (
                                            <p>No bookings for this day.</p>
                                        )}
                                        <button className="add-booking-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            openForm('select', dateString);
                                        }}>+ Booking</button>
                                    </>
                                ) : (
                                    <p>No bookings for this day.</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            {showForm && formType === 'select' && (
                <div className="form-modal">
                    <div className="form-container">
                        <h2>Select Booking Type</h2>
                        <button className="close-button" onClick={closeForm}>×</button>
                        <div className="form-buttons">
                            <button onClick={() => openForm('activity', selectedDate)}>Activity</button>
                            <button onClick={() => openForm('hotel', selectedDate)}>Hotel</button>
                            <button onClick={() => openForm('flight', selectedDate)}>Flight</button>
                            <button onClick={() => openForm('restaurant', selectedDate)}>Restaurant</button>
                            <button onClick={() => openForm('transport', selectedDate)}>Transport</button>
                        </div>
                    </div>
                </div>
            )}
            {showForm && formType === 'activity' && (
                <ActivityForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} onActivityAdded={() => fetchBookingsForDay(selectedDate)} />
            )}
            {showForm && formType === 'hotel' && (
                <HotelForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} onHotelAdded={() => fetchBookingsForDay(selectedDate)} />
            )}
            {showForm && formType === 'flight' && (
                <FlightForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} onFlightAdded={() => fetchBookingsForDay(selectedDate)} />
            )}
            {showForm && formType === 'restaurant' && (
                <RestaurantForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} onRestaurantAdded={() => fetchBookingsForDay(selectedDate)} />
            )}
            {showForm && formType === 'transport' && (
                <TransportForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} onTransportAdded={() => fetchBookingsForDay(selectedDate)} />
            )}
        </div>
    );
};

export default DailyOverview;
