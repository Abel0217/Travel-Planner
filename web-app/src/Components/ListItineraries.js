import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';

const ListItineraries = () => {
    const [itineraries, setItineraries] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        apiClient.get('/itineraries')
            .then(response => {
                setItineraries(response.data);
            })
            .catch(error => {
                console.error('Failed to fetch itineraries:', error);
                setError('Failed to load itineraries. Please try again later.');
            });
    }, []);

    return (
        <div>
            <h1>Itineraries</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ul>
                {itineraries.map(itinerary => (
                    <li key={itinerary.itinerary_id}>{itinerary.title}</li>  
                ))}
            </ul>
        </div>
    );
};

export default ListItineraries;
