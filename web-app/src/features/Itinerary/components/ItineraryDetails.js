import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, onSnapshot } from 'firebase/firestore';
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

const ItineraryDetails = () => {
    const { itineraryId } = useParams();
    const [itinerary, setItinerary] = useState({ title: '', start_date: '', end_date: '' });

    useEffect(() => {
        if (itineraryId) {
            // Fetch itinerary from your existing API
            apiClient.get(`/itineraries/${itineraryId}`)
                .then(response => {
                    setItinerary(response.data);
                })
                .catch(error => {
                    console.error('Failed to fetch itinerary details', error);
                });

            // Fetch itinerary from Firestore for real-time updates
            const docRef = doc(db, 'itineraries', itineraryId);
            const unsubscribe = onSnapshot(docRef, (snapshot) => {
                if (snapshot.exists()) {
                    setItinerary(snapshot.data());
                } else {
                    console.error('No such document!');
                }
            });

            return () => unsubscribe();
        }
    }, [itineraryId]);

    if (!itinerary.title) return <div>No itinerary found.</div>;

    return (
        <div>
            <h1>{itinerary.title}</h1>
            <Tabs>
                <TabList>
                    <Tab>Overview</Tab>
                    <Tab>Flights</Tab>
                    <Tab>Hotels</Tab>
                    <Tab>Activities</Tab>
                    <Tab>Restaurants</Tab>
                    <Tab>Transportation</Tab>
                </TabList>

                <TabPanel>
                    <DailyOverview
                        itineraryId={itineraryId}
                        startDate={itinerary.start_date}
                        endDate={itinerary.end_date}
                    />
                </TabPanel>
                <TabPanel><FlightDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><HotelDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><ActivityDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><RestaurantDetails itineraryId={itineraryId} /></TabPanel>
                <TabPanel><TransportDetails itineraryId={itineraryId} /></TabPanel>
            </Tabs>
        </div>
    );
};

export default ItineraryDetails;
