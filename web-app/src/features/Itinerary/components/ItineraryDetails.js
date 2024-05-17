import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../api/apiClient';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './css/ItineraryDetails.css';

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
            apiClient.get(`/itineraries/${itineraryId}`)
                .then(response => {
                    setItinerary(response.data);
                })
                .catch(error => {
                    console.error('Failed to fetch itinerary details', error);
                });
        }
    }, [itineraryId]);

    if (!itinerary) return <div>No itinerary found.</div>;

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

                <TabPanel><h2>Overview</h2></TabPanel>
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
