import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; // Adjust the path as necessary
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

const ItineraryDetails = () => {
    const { itineraryId } = useParams();
    const [itinerary, setItinerary] = useState({ title: '', start_date: '', end_date: '', destinations: '' });
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState(null);

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
                    <Tab>Flights</Tab>
                    <Tab>Hotels</Tab>
                    <Tab>Activities</Tab>
                    <Tab>Restaurants</Tab>
                    <Tab>Transportation</Tab>
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
                <TabPanel><FlightDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><HotelDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><ActivityDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><RestaurantDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><TransportDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><Notes itineraryId={itineraryId} /></TabPanel>
            </Tabs>
        </div>
    );
};

export default ItineraryDetails;
