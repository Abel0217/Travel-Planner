import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../api/apiClient';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './css/ItineraryDetails.css';

const ItineraryDetails = () => {
    const { itineraryId } = useParams();
    const [itinerary, setItinerary] = useState({ title: '', start_date: '', end_date: '' });

    useEffect(() => {
        console.log("Attempting to fetch details for ID:", itineraryId); // Added log to check the ID
        if (itineraryId) {
            apiClient.get(`/itineraries/${itineraryId}`)
                .then(response => {
                    setItinerary(response.data);
                })
                .catch(error => {
                    console.error('Failed to fetch itinerary details', error);
                });
        } else {
            console.error('Itinerary ID is undefined');
        }
    }, [itineraryId]);

    if (!itinerary) return <div>No itinerary found.</div>;

    return (
        <div>
            <h1>{itinerary.title}</h1>
            <Tabs>
                <TabList>
                    <Tab>Overview</Tab>
                    <Tab>Flight</Tab>
                    <Tab>Hotel</Tab>
                    <Tab>Activities</Tab>
                    <Tab>Restaurants</Tab>
                    <Tab>Transportation</Tab>
                </TabList>

                <TabPanel><h2>Overview</h2></TabPanel>
                <TabPanel><h2>Flights</h2></TabPanel>
                <TabPanel><h2>Hotels</h2></TabPanel>
                <TabPanel><h2>Activities</h2></TabPanel>
                <TabPanel><h2>Restaurants</h2></TabPanel>
                <TabPanel><h2>Transportation</h2></TabPanel>
            </Tabs>
        </div>
    );
};

export default ItineraryDetails;
