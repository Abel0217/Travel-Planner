import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../../api/apiClient';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import FlightDetails from './FlightDetails';
import HotelDetails from './HotelDetails';
import RestaurantDetails from './RestaurantDetails';
import TransportDetails from './TransportDetails';
import ActivityDetails from './ActivityDetails';
import DailyOverview from './DailyOverview'; // Import DailyOverview component
import './css/ItineraryOverview.css';

const localizer = momentLocalizer(moment);

const ItineraryOverview = () => {
    const { itineraryId } = useParams();
    const [itinerary, setItinerary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (itineraryId) {
            apiClient.get(`/itineraries/${itineraryId}`)
                .then(response => {
                    setItinerary(response.data);
                    setEvents(convertItineraryToEvents(response.data));
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Failed to fetch itinerary', error);
                    setLoading(false);
                });
        }
    }, [itineraryId]);

    const convertItineraryToEvents = (itineraryData) => {
        // Conversion logic here
        return [];
    };

    if (loading) return <div>Loading...</div>;
    if (!itinerary) return <div>No itinerary found.</div>;

    return (
        <div className="itinerary-overview">
            <h1>{itinerary.title}</h1>
            <div className="tab-buttons">
                <button onClick={() => setActiveTab('overview')}>Overview</button>
                <button onClick={() => setActiveTab('flights')}>Flights</button>
                <button onClick={() => setActiveTab('hotels')}>Hotels</button>
                <button onClick={() => setActiveTab('restaurants')}>Restaurants</button>
                <button onClick={() => setActiveTab('transport')}>Transport</button>
                <button onClick={() => setActiveTab('activities')}>Activities</button>
            </div>
            {activeTab === 'overview' && <DailyOverview itineraryId={itineraryId} />}
            {activeTab === 'flights' && <FlightDetails itineraryId={itineraryId} />}
            {activeTab === 'hotels' && <HotelDetails itineraryId={itineraryId} />}
            {activeTab === 'restaurants' && <RestaurantDetails itineraryId={itineraryId} />}
            {activeTab === 'transport' && <TransportDetails itineraryId={itineraryId} />}
            {activeTab === 'activities' && <ActivityDetails itineraryId={itineraryId} />}
        </div>
    );
};

export default ItineraryOverview;
