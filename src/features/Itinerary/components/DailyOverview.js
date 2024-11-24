import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import Modal from 'react-modal'; 
import './css/DailyOverview.css';
import ActivityForm from './ActivityForm';
import HotelForm from './HotelForm';
import FlightForm from './FlightForm';
import RestaurantForm from './RestaurantForm';
import TransportForm from './TransportForm';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../../../firebaseConfig';
import { fetchWeather } from '../../../api/weatherApi';

Modal.setAppElement('#root'); 

const DailyOverview = ({ itineraryId, destination, startDate, endDate }) => {
    const [days, setDays] = useState([]);
    const [pastDays, setPastDays] = useState([]);
    const [futureDays, setFutureDays] = useState([]);
    const [allActivities, setAllActivities] = useState([]);
    const [allHotels, setAllHotels] = useState([]);
    const [allFlights, setAllFlights] = useState([]);
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [allTransport, setAllTransport] = useState([]);
    const [bookings, setBookings] = useState({});
    const [expandedDay, setExpandedDay] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [formType, setFormType] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [weatherData, setWeatherData] = useState({});
    const [isCelsius, setIsCelsius] = useState(true);
    const [showSelectionModal, setShowSelectionModal] = useState(false);

    useEffect(() => {
        const fetchItineraryData = async () => {
            generateDays(startDate, endDate);
            await fetchAllData();
            await fetchWeatherData(startDate, endDate, destination);
            setupFirestoreListeners();
        };

        fetchItineraryData();
    }, [itineraryId, destination, startDate, endDate]);

    const generateDays = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
            console.error("Invalid start or end date");
            return;
        }
    
        const daysList = [];
        let current = new Date(start);
    
        while (current <= end) {
            daysList.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
    
        const currentDate = new Date().setHours(0, 0, 0, 0);
    
        const past = daysList.filter(day => day < currentDate);
        const future = daysList.filter(day => day >= currentDate);
    
        setPastDays(past);
        setFutureDays(future);
        setDays(daysList);
    };    

    const fetchWeatherData = async (startDate, endDate, destination) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let current = new Date(start);
        const weatherData = {};

        const geocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`);
        const geocodeData = await geocodeResponse.json();

        if (!geocodeData.results || geocodeData.results.length === 0) {
            console.error('Failed to geocode destination');
            return;
        }

        const location = geocodeData.results[0].geometry.location;
        const latitude = location.lat;
        const longitude = location.lng;

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            try {
                const data = await fetchWeather(latitude, longitude, dateStr);
                weatherData[dateStr] = data;
            } catch (error) {
                console.error('Failed to fetch weather data for', dateStr, error);
            }
            current.setDate(current.getDate() + 1);
        }

        setWeatherData(weatherData);
    };

    const fetchAllData = async () => {
        try {
            const [activitiesResponse, hotelsResponse, flightsResponse, restaurantsResponse, transportResponse] = await Promise.all([
                apiClient.get(`/itineraries/${itineraryId}/activities`),
                apiClient.get(`/itineraries/${itineraryId}/hotels`),
                apiClient.get(`/itineraries/${itineraryId}/flights`),
                apiClient.get(`/itineraries/${itineraryId}/restaurants`),
                apiClient.get(`/itineraries/${itineraryId}/transport`),
            ]);
    
            setAllActivities(activitiesResponse.data);
            setAllHotels(hotelsResponse.data);
            setAllFlights(flightsResponse.data);
            setAllRestaurants(restaurantsResponse.data);
            setAllTransport(transportResponse.data);
    
            console.log('Fetched Activities:', activitiesResponse.data);
            console.log('Fetched Hotels:', hotelsResponse.data);
            console.log('Fetched Flights:', flightsResponse.data);
            console.log('Fetched Restaurants:', restaurantsResponse.data);
            console.log('Fetched Transport:', transportResponse.data);
        } catch (error) {
            console.error('Failed to fetch all data:', error);
        }
    };    

    const safeDate = (dateString) => {
        const date = new Date(dateString);
        return isNaN(date) ? null : date.toISOString().split('T')[0];
    };
    
    const setupFirestoreListeners = () => {
        const activitiesQuery = query(collection(db, 'activities'), where('itineraryId', '==', itineraryId));
        const hotelsQuery = query(collection(db, 'hotels'), where('itineraryId', '==', itineraryId));
        const flightsQuery = query(collection(db, 'flights'), where('itineraryId', '==', itineraryId));
        const restaurantsQuery = query(collection(db, 'restaurants'), where('itineraryId', '==', itineraryId));
        const transportQuery = query(collection(db, 'transport'), where('itineraryId', '==', itineraryId));

        onSnapshot(activitiesQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllActivities(prevActivities => {
                const newActivities = [...prevActivities];
                activities.forEach(activity => {
                    const index = newActivities.findIndex(a => a.activity_id === activity.activity_id);
                    if (index === -1) {
                        newActivities.push(activity);
                    } else {
                        newActivities[index] = activity;
                    }
                });
                return newActivities;
            });
        });

        onSnapshot(hotelsQuery, (snapshot) => {
            const hotels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllHotels(prevHotels => {
                const newHotels = [...prevHotels];
                hotels.forEach(hotel => {
                    const index = newHotels.findIndex(h => h.hotel_id === hotel.hotel_id);
                    if (index === -1) {
                        newHotels.push(hotel);
                    } else {
                        newHotels[index] = hotel;
                    }
                });
                return newHotels;
            });
        });

        onSnapshot(flightsQuery, (snapshot) => {
            const flights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllFlights(prevFlights => {
                const newFlights = [...prevFlights];
                flights.forEach(flight => {
                    const index = newFlights.findIndex(f => f.flight_id === flight.flight_id);
                    if (index === -1) {
                        newFlights.push(flight);
                    } else {
                        newFlights[index] = flight;
                    }
                });
                return newFlights;
            });
        });

        onSnapshot(restaurantsQuery, (snapshot) => {
            const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllRestaurants(prevRestaurants => {
                const newRestaurants = [...prevRestaurants];
                restaurants.forEach(restaurant => {
                    const index = newRestaurants.findIndex(r => r.reservation_id === restaurant.reservation_id);
                    if (index === -1) {
                        newRestaurants.push(restaurant);
                    } else {
                        newRestaurants[index] = restaurant;
                    }
                });
                return newRestaurants;
            });
        });

        onSnapshot(transportQuery, (snapshot) => {
            const transport = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllTransport(prevTransport => {
                const newTransport = [...prevTransport];
                transport.forEach(t => {
                    const index = newTransport.findIndex(tr => tr.transport_id === t.transport_id);
                    if (index === -1) {
                        newTransport.push(t);
                    } else {
                        newTransport[index] = t;
                    }
                });
                return newTransport;
            });
        });
    };

    const fetchBookingsForDay = (date) => {
        const filteredActivities = allActivities.filter(activity => {
            const activityDate = safeDate(activity.activity_date);
            return activityDate === date;
        });
    
        const filteredHotels = allHotels.filter(hotel => {
            const checkInDate = safeDate(hotel.check_in_date);
            const checkOutDate = safeDate(hotel.check_out_date);
            return date >= checkInDate && date <= checkOutDate;
        });
    
        const filteredFlights = allFlights.filter(flight => {
            const departureDate = safeDate(flight.departure_time);
            return departureDate === date;
        });
    
        const filteredRestaurants = allRestaurants.filter(restaurant => {
            const reservationDate = safeDate(restaurant.reservation_date);
            return reservationDate === date;
        });
    
        const filteredTransport = allTransport.filter(transport => {
            const pickupDate = safeDate(transport.pickup_time);
            const dropoffDate = safeDate(transport.dropoff_time);
            return date >= pickupDate && date <= dropoffDate;
        });
    
        setBookings(prevBookings => ({
            ...prevBookings,
            [date]: {
                activities: filteredActivities,
                hotels: filteredHotels,
                flights: filteredFlights,
                restaurants: filteredRestaurants,
                transport: filteredTransport,
            },
        }));
    
        console.log('Bookings for', date, {
            activities: filteredActivities,
            hotels: filteredHotels,
            flights: filteredFlights,
            restaurants: filteredRestaurants,
            transport: filteredTransport,
        });
    }; 

    const handleBookingAdded = (newBooking, bookingType) => {
        switch (bookingType) {
            case 'activity':
                setAllActivities((prevActivities) => [...prevActivities, newBooking]);
                break;
            case 'hotel':
                setAllHotels((prevHotels) => [...prevHotels, newBooking]);
                break;
            case 'flight':
                setAllFlights((prevFlights) => [...prevFlights, newBooking]);
                break;
            case 'restaurant':
                setAllRestaurants((prevRestaurants) => [...prevRestaurants, newBooking]);
                break;
            case 'transport':
                setAllTransport((prevTransport) => [...prevTransport, newBooking]);
                break;
            default:
                console.error('Unknown booking type:', bookingType);
        }
    
        if (expandedDay) {
            fetchBookingsForDay(expandedDay);
        }
    };
    
    const toggleDay = (date) => {
        if (expandedDay === date) {
            setExpandedDay(null);
        } else {
            fetchBookingsForDay(date); 
            setExpandedDay(date);
        }
    };    
    

    const openForm = (type, date) => {
        setFormType(type);      
        setSelectedDate(date);  
        setIsModalOpen(true);   
    };    
    
    const closeForm = () => {
        setIsModalOpen(false);  
        setFormType(null);      
        setSelectedDate(null);  
    };    
    
const toggleTemperatureUnit = () => {
    setIsCelsius(!isCelsius);
};

const convertTemperature = (tempCelsius) => {
    return isCelsius ? tempCelsius : (tempCelsius * 9 / 5) + 32;
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
    <div className="daily-overview">
        <h2>Overview</h2>
        <button className="temp-toggle-btn" onClick={toggleTemperatureUnit}>
            Switch to {isCelsius ? '°F' : '°C'}
        </button>
        {futureDays.map(day => {
            const dateString = day.toISOString().split('T')[0];
            const weather = weatherData[dateString];
            return (
                <div key={dateString} className="day-item">
                    <div className="day-header" onClick={() => toggleDay(dateString)}>
                        {formatDate(day)}
                        {weather && (
                            <div className="weather-info">
                                <img src={weather.icon} alt={weather.condition} />
                                <div className="weather-details">
                                    <p>{weather.condition}</p>
                                    <p> · {Math.round(convertTemperature(weather.max_temp))}°{isCelsius ? 'C' : 'F'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {expandedDay === dateString && (
                        <div className="day-details">
                            {bookings[dateString] ? (
                                <>
                                    {bookings[dateString].flights.length > 0 && (
                                        <>
                                            <h3>Flights</h3>
                                            {bookings[dateString].flights.map(flight => (
                                                <div key={flight.flight_id} className="booking-item">
                                                    <h4>{flight.airline}</h4>
                                                    <p><strong>Passenger Name:</strong> {flight.passenger_name}</p>
                                                    <p><strong>Airline:</strong> {flight.airline}</p>
                                                    <p><strong>Flight Number:</strong> {flight.flight_number}</p>
                                                    <p><strong>Departure Airport:</strong> {flight.departure_airport}</p>
                                                    <p><strong>Arrival Airport:</strong> {flight.arrival_airport}</p>
                                                    <p><strong>Departure:</strong> {formatDateTime(flight.departure_time)}</p>
                                                    <p><strong>Arrival:</strong> {formatDateTime(flight.arrival_time)}</p>
                                                    <p><strong>Seat Number:</strong> {flight.seat_number}</p>
                                                    <p><strong>Booking Reference:</strong> {flight.booking_reference}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].hotels.length > 0 && (
                                        <>
                                            <h3>Hotels</h3>
                                            {bookings[dateString].hotels.map(hotel => (
                                                <div key={hotel.hotel_id} className="booking-item">
                                                    <h4>{hotel.hotel_name}</h4>
                                                    <p><strong>Hotel Address:</strong> {hotel.address}</p>
                                                    <p><strong>Check-In:</strong> {formatDate(hotel.check_in_date)}</p>
                                                    <p><strong>Check-Out:</strong> {formatDate(hotel.check_out_date)}</p>
                                                    <p><strong>Booking Conformation:</strong> {hotel.booking_confirmation}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].activities.length > 0 && (
                                        <>
                                            <h3>Activities</h3>
                                            {bookings[dateString].activities.map(activity => (
                                                <div key={activity.activity_id} className="booking-item">
                                                    <h4>{activity.title}</h4>
                                                    <p><strong>Address:</strong> {activity.location}</p>
                                                    <p><strong>Activity Date:</strong> {formatDate(activity.activity_date)}</p>
                                                    <p><strong>Activity Time:</strong> {activity.start_time}</p>
                                                    <p><strong>Reference Number:</strong> {activity.reservation_number}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].restaurants.length > 0 && (
                                        <>
                                            <h3>Restaurants</h3>
                                            {bookings[dateString].restaurants.map(restaurant => (
                                                <div key={restaurant.reservation_id} className="booking-item">
                                                    <h4>{restaurant.restaurant_name}</h4>
                                                    <p><strong>Restaurant Address:</strong> {restaurant.address}</p>
                                                    <p><strong>Reservation Date:</strong> {formatDate(restaurant.reservation_date)}</p>
                                                    <p><strong>Reservation Time:</strong> {formatTime(restaurant.reservation_time)}</p>
                                                    <p><strong>Number of Guest:</strong> {restaurant.guest_number}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].transport.length > 0 && (
                                        <>
                                            <h3>Transport</h3>
                                            {bookings[dateString].transport.map(transport => (
                                                <div key={transport.transport_id} className="booking-item">
                                                    <h4>{transport.type}</h4>
                                                    <p><strong>Pickup Location:</strong> {transport.pickup_location}</p>
                                                    <p><strong>Pickup Time:</strong> {formatDateTime(transport.pickup_time)}</p>
                                                    <p><strong>Dropoff Location:</strong> {transport.dropoff_location}</p>
                                                    <p><strong>Dropoff Time:</strong> {formatDateTime(transport.dropoff_time)}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].activities.length === 0 &&
                                        bookings[dateString].hotels.length === 0 &&
                                        bookings[dateString].flights.length === 0 &&
                                        bookings[dateString].restaurants.length === 0 &&
                                        bookings[dateString].transport.length === 0 && (
                                            <p>No bookings for this day.</p>
                                        )}
                                    <button
                                        className="add-booking-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate(dateString); 
                                            setShowSelectionModal(true); 
                                        }}
                                    >
                                        + Booking
                                    </button>

                                </>
                            ) : (
                                <p>No bookings for this day.</p>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
        {pastDays.map(day => {
            const dateString = day.toISOString().split('T')[0];
            const weather = weatherData[dateString];
            return (
                <div key={dateString} className="day-item past-day">
                    <div className="day-header" onClick={() => toggleDay(dateString)}>
                        {formatDate(day)}
                        {weather && (
                            <div className="weather-info">
                                <img src={weather.icon} alt={weather.condition} />
                                <div className="weather-details">
                                    <p>{weather.condition}</p>
                                    <p> • {Math.round(convertTemperature(weather.max_temp))}°{isCelsius ? 'C' : 'F'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {expandedDay === dateString && (
                        <div className="day-details">
                            {bookings[dateString] ? (
                                <>
                                    {bookings[dateString].flights.length > 0 && (
                                        <>
                                            <h3>Flights</h3>
                                            {bookings[dateString].flights.map(flight => (
                                                <div key={flight.flight_id} className="booking-item">
                                                    <h4>{flight.airline}</h4>
                                                    <p><strong>Passenger Name:</strong> {flight.passenger_name}</p>
                                                    <p><strong>Airline:</strong> {flight.airline}</p>
                                                    <p><strong>Flight Number:</strong> {flight.flight_number}</p>
                                                    <p><strong>Departure Airport:</strong> {flight.departure_airport}</p>
                                                    <p><strong>Arrival Airport:</strong> {flight.arrival_airport}</p>
                                                    <p><strong>Departure:</strong> {formatDateTime(flight.departure_time)}</p>
                                                    <p><strong>Arrival:</strong> {formatDateTime(flight.arrival_time)}</p>
                                                    <p><strong>Seat Number:</strong> {flight.seat_number}</p>
                                                    <p><strong>Booking Reference:</strong> {flight.booking_reference}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].hotels.length > 0 && (
                                        <>
                                            <h3>Hotels</h3>
                                            {bookings[dateString].hotels.map(hotel => (
                                                <div key={hotel.hotel_id} className="booking-item">
                                                    <h4>{hotel.hotel_name}</h4>
                                                    <p><strong>Hotel Address:</strong> {hotel.address}</p>
                                                    <p><strong>Check In:</strong> {formatDate(hotel.check_in_date)}</p>
                                                    <p><strong>Check Out:</strong> {formatDate(hotel.check_out_date)}</p>
                                                    <p><strong>Booking Conformation:</strong> {hotel.booking_confirmation}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].activities.length > 0 && (
                                        <>
                                            <h3>Activities</h3>
                                            {bookings[dateString].activities.map(activity => (
                                                <div key={activity.activity_id} className="booking-item">
                                                    <h4>{activity.title}</h4>
                                                    <p><strong>Address:</strong> {activity.location}</p>
                                                    <p><strong>Activity Date:</strong> {formatDate(activity.activity_date)}</p>
                                                    <p><strong>Activity Time:</strong> {activity.start_time}</p>
                                                    <p><strong>Reference Number:</strong> {activity.reservation_number}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].restaurants.length > 0 && (
                                        <>
                                            <h3>Restaurants</h3>
                                            {bookings[dateString].restaurants.map(restaurant => (
                                                <div key={restaurant.reservation_id} className="booking-item">
                                                    <h4>{restaurant.restaurant_name}</h4>
                                                    <p><strong>Restaurant Address:</strong> {restaurant.address}</p>
                                                    <p><strong>Reservation Date:</strong> {formatDate(restaurant.reservation_date)}</p>
                                                    <p><strong>Reservation Time:</strong> {formatTime(restaurant.reservation_time)}</p>
                                                    <p><strong>Number of Guest:</strong> {restaurant.guest_number}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].transport.length > 0 && (
                                        <>
                                            <h3>Transport</h3>
                                            {bookings[dateString].transport.map(transport => (
                                                <div key={transport.transport_id} className="booking-item">
                                                    <h4>{transport.type}</h4>
                                                    <p><strong>Pickup Location:</strong> {transport.pickup_location}</p>
                                                    <p><strong>Pickup Time:</strong> {formatDateTime(transport.pickup_time)}</p>
                                                    <p><strong>Dropoff Location:</strong> {transport.dropoff_location}</p>
                                                    <p><strong>Dropoff Time:</strong> {formatDateTime(transport.dropoff_time)}</p>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                    {bookings[dateString].activities.length === 0 &&
                                        bookings[dateString].hotels.length === 0 &&
                                        bookings[dateString].flights.length === 0 &&
                                        bookings[dateString].restaurants.length === 0 &&
                                        bookings[dateString].transport.length === 0 && (
                                            <p>No bookings for this day.</p>
                                        )}
                                    <button
                                        className="add-booking-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedDate(dateString); 
                                            setShowSelectionModal(true); 
                                        }}
                                    >
                                        + Booking
                                    </button>
                                </>
                            ) : (
                                <p>No bookings for this day.</p>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
        {showSelectionModal && (
            <div className="overlay" onClick={() => setShowSelectionModal(false)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h2>Select Booking Type</h2>
                    <div className="modal-content">
                        <button onClick={() => { setFormType('activity'); setShowSelectionModal(false); setShowForm(true); }}>Activity</button>
                        <button onClick={() => { setFormType('hotel'); setShowSelectionModal(false); setShowForm(true); }}>Hotel</button>
                        <button onClick={() => { setFormType('flight'); setShowSelectionModal(false); setShowForm(true); }}>Flight</button>
                        <button onClick={() => { setFormType('restaurant'); setShowSelectionModal(false); setShowForm(true); }}>Restaurant</button>
                        <button onClick={() => { setFormType('transport'); setShowSelectionModal(false); setShowForm(true); }}>Transport</button>
                    </div>
                    <button className="close-button" onClick={() => setShowSelectionModal(false)}>x</button>
                </div>
            </div>
        )}

        {showForm && formType === 'activity' && (
            <div className="overlay" onClick={closeForm}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={closeForm}>x</button>
                    <div className="modal-content">
                        <ActivityForm
                            itineraryId={itineraryId}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            onClose={closeForm}
                            onActivityAdded={(newActivity) => handleBookingAdded(newActivity, 'activity')}
                        />
                    </div>
                </div>
            </div>
        )}

        {showForm && formType === 'hotel' && (
            <div className="overlay" onClick={closeForm}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={closeForm}>x</button>
                    <div className="modal-content">
                        <HotelForm
                            itineraryId={itineraryId}    
                            startDate={selectedDate}
                            endDate={selectedDate}
                            onClose={closeForm}
                            onHotelAdded={(newHotel) => handleBookingAdded(newHotel, 'hotel')}
                        />
                    </div>
                </div>
            </div>
        )}

        {showForm && formType === 'flight' && (
            <div className="overlay" onClick={closeForm}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={closeForm}>x</button>
                    <div className="modal-content">
                        <FlightForm
                            itineraryId={itineraryId}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            onClose={closeForm}
                            onFlightAdded={(newFlight) => handleBookingAdded(newFlight, 'flight')}
                        />
                    </div>
                </div>
            </div>
        )}

        {showForm && formType === 'restaurant' && (
            <div className="overlay" onClick={closeForm}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={closeForm}>x</button>
                    <div className="modal-content">
                        <RestaurantForm
                            itineraryId={itineraryId}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            onClose={closeForm}
                            onRestaurantAdded={() => fetchBookingsForDay(selectedDate)}
                        />
                    </div>
                </div>
            </div>
        )}

        {showForm && formType === 'transport' && (
            <div className="overlay" onClick={closeForm}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-button" onClick={closeForm}>x</button>
                    <div className="modal-content">
                        <TransportForm
                            itineraryId={itineraryId}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            onClose={closeForm}
                            onTransportAdded={(newTransport) => handleBookingAdded(newTransport, 'transport')}
                        />
                    </div>
                </div>
            </div>
        )}
        <Modal 
            isOpen={isModalOpen} 
            onRequestClose={closeForm} 
            contentLabel="Booking Form"
            className="modal"  
            overlayClassName="overlay"  
        >
            <button onClick={closeForm} className="modal-close">×</button>
            {formType === 'activity' && (
                <ActivityForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} />
            )}
            {formType === 'hotel' && (
                <HotelForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} />
            )}
            {formType === 'flight' && (
                <FlightForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} />
            )}
            {formType === 'restaurant' && (
                <RestaurantForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} />
            )}
            {formType === 'transport' && (
                <TransportForm itineraryId={itineraryId} startDate={selectedDate} endDate={selectedDate} onClose={closeForm} />
            )}
        </Modal>
    </div>
);
};

export default DailyOverview;
