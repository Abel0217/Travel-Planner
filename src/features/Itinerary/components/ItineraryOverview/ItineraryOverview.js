import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../../api/apiClient';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './css/ItineraryOverview.css';

const localizer = momentLocalizer(moment);

const ItineraryOverview = () => {
    const { id } = useParams();
    const [itinerary, setItinerary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (id) {
            apiClient.get(`/itineraries/${id}`)
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
    }, [id]);

    const convertItineraryToEvents = (itineraryData) => {
        return []; 
    };

    if (loading) return <div>Loading...</div>;
    if (!itinerary) return <div>No itinerary found.</div>;

    return (
        <div className="itinerary-overview">
            <h1>{itinerary.title}</h1>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
            />
        </div>
    );
};

export default ItineraryOverview;
