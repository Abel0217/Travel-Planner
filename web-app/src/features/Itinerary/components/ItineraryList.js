import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';  // Update the path as necessary

const ItineraryList = () => {
    const [itineraries, setItineraries] = useState([]);

    useEffect(() => {
        apiClient.get('/itineraries')
            .then(response => setItineraries(response.data))
            .catch(error => console.error('Failed to fetch itineraries:', error));
    }, []);

    return (
        <div>
            <h1>Itineraries</h1>
            <ul>
                {itineraries.map(itinerary => (
                    <li key={itinerary.itinerary_id}>{itinerary.title}</li>
                ))}
            </ul>
        </div>
    );
};

export default ItineraryList;
