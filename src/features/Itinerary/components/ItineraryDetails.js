import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; 
import apiClient from '../../../api/apiClient';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './css/ItineraryDetails.css';
import DailyOverview from './DailyOverview';
import FlightDetails from './FlightDetails';
import HotelDetails from './HotelDetails';
import ActivityDetails from './ActivityDetails';
import RestaurantDetails from './RestaurantDetails';
import TransportDetails from './TransportDetails';
import MapComponent from '../../../Components/MapComponent';
import Notes from './Notes';
import Bookings from './Bookings';
import MemoryBoard from './MemoryBoard';
import ActivityForm from './ActivityForm';
import HotelForm from './HotelForm';
import FlightForm from './FlightForm';
import RestaurantForm from './RestaurantForm';
import TransportForm from './TransportForm';
import flightIcon from './css/Flight.jpg';
import hotelIcon from './css/Hotel.jpg';
import activityIcon from './css/Activity.jpg';
import restaurantIcon from './css/Restaurant.jpg';
import transportIcon from './css/Transport.jpg';

const ItineraryDetails = () => {
    const { itineraryId } = useParams();
    const [itinerary, setItinerary] = useState({ title: '', start_date: '', end_date: '', destinations: '' });
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState(null);
    const [formType, setFormType] = useState(null);

    const geocodeDestination = async (destination) => {
        if (!destination) {
            console.error('No destination provided');
            return;
        }

        try {
            console.log(`Geocoding destination: ${destination}`);
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                setCoordinates({ lat: location.lat, lng: location.lng });
            } else {
                console.error('Failed to geocode destination', data);
            }
        } catch (error) {
            console.error('Failed to geocode destination', error);
        }
    };

    const fetchItineraryDetails = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}`);
            console.log('API Response:', response.data);
            const itineraryData = response.data;
            setItinerary(itineraryData);
            await geocodeDestination(itineraryData.destinations);
        } catch (error) {
            console.error('Failed to fetch itinerary details', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchItineraryFromFirestore = () => {
            const docRef = doc(db, 'itineraries', itineraryId);
            const unsubscribe = onSnapshot(docRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const itineraryData = snapshot.data();
                    console.log('Firestore Snapshot:', itineraryData);
                    setItinerary(itineraryData);
                    await geocodeDestination(itineraryData.destinations);
                } else {
                    console.error('No such document!');
                    await fetchItineraryDetails();
                }
                setLoading(false);
            });

            return unsubscribe;
        };

        if (itineraryId) {
            fetchItineraryFromFirestore();
        }

        return () => {
            setLoading(false);
        };
    }, [itineraryId]);

    const openForm = (formType) => {
        setFormType(formType);
    };

    const closeForm = () => {
        setFormType(null);
    };

    const handleActivityAdded = (newActivity) => {
        // Logic to update the state with the new activity
        console.log('New activity added:', newActivity);
    };

    const handleHotelAdded = (newHotel) => {
        // Logic to update the state with the new hotel
        console.log('New hotel added:', newHotel);
    };

    const handleFlightAdded = (newFlight) => {
        // Logic to update the state with the new flight
        console.log('New flight added:', newFlight);
    };

    const handleRestaurantAdded = (newRestaurant) => {
        // Logic to update the state with the new restaurant
        console.log('New restaurant added:', newRestaurant);
    };

    const handleTransportAdded = (newTransport) => {
        // Logic to update the state with the new transport
        console.log('New transport added:', newTransport);
    };

    if (loading) return <div>Loading...</div>;
    if (!itinerary.title) return <div>No itinerary found.</div>;

    return (
        <div>
            <div className="itinerary-header">
                <h1>{itinerary.title}</h1>
                <p>{itinerary.destinations}</p>
            </div>
            {coordinates ? (
                <MapComponent apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY} center={coordinates} />
            ) : (
                <p>Loading map...</p>
            )}
            <Tabs>
                <TabList>
                    <Tab>Overview</Tab>
                    <Tab>Bookings</Tab>
                    <Tab>My Bookings</Tab>
                    <Tab>Memory Board</Tab>
                    <Tab>Notes</Tab>
                </TabList>

                <TabPanel>
                    <DailyOverview
                        itineraryId={itineraryId}
                        destination={itinerary.destinations}
                        startDate={itinerary.start_date}
                        endDate={itinerary.end_date}
                    />
                </TabPanel>

                <TabPanel>
                    {formType ? (
                        <div>
                            <button className="back-button" onClick={closeForm}>Back</button>
                            {formType === 'activity' && <ActivityForm onClose={closeForm} onActivityAdded={handleActivityAdded} itineraryId={itineraryId} startDate={itinerary.start_date} endDate={itinerary.end_date} />}
                            {formType === 'hotel' && <HotelForm onClose={closeForm} onHotelAdded={handleHotelAdded} itineraryId={itineraryId} />}
                            {formType === 'flight' && <FlightForm onClose={closeForm} onFlightAdded={handleFlightAdded} itineraryId={itineraryId} />}
                            {formType === 'restaurant' && <RestaurantForm onClose={closeForm} onRestaurantAdded={handleRestaurantAdded} itineraryId={itineraryId} />}
                            {formType === 'transport' && <TransportForm onClose={closeForm} onTransportAdded={handleTransportAdded} itineraryId={itineraryId} />}
                        </div>
                    ) : (
                        <div className="card-container">
                            <div className="booking-card" onClick={() => openForm('flight')}>
                                <img src={flightIcon} alt="Flights" className="card-icon"/>
                                <h3>Flights</h3>
                            </div>
                            <div className="booking-card" onClick={() => openForm('hotel')}>
                                <img src={hotelIcon} alt="Hotels" className="card-icon"/>
                                <h3>Hotels</h3>
                            </div>
                            <div className="booking-card" onClick={() => openForm('activity')}>
                                <img src={activityIcon} alt="Activities" className="card-icon"/>
                                <h3>Activities</h3>
                            </div>
                            <div className="booking-card" onClick={() => openForm('restaurant')}>
                                <img src={restaurantIcon} alt="Restaurants" className="card-icon"/>
                                <h3>Restaurants</h3>
                            </div>
                            <div className="booking-card" onClick={() => openForm('transport')}>
                                <img src={transportIcon} alt="Transportation" className="card-icon"/>
                                <h3>Transport</h3>
                            </div>
                        </div>
                    )}
                </TabPanel>

                <TabPanel>
                    <Bookings itineraryId={itineraryId} />
                </TabPanel>

                <TabPanel>
                    <MemoryBoard itineraryId={itineraryId} />
                </TabPanel>

                <TabPanel>
                    <Notes itineraryId={itineraryId} />
                </TabPanel>
            </Tabs>
        </div>
    );
};

export default ItineraryDetails;
