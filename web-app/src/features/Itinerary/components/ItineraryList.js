import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient'; // Ensure the import path is correct
import ItineraryControls from '../../../Components/ItineraryControls'; // Verify the import path
import { Link } from 'react-router-dom';

const ItineraryList = () => {
    const [itineraries, setItineraries] = useState([]);
    const [filteredItineraries, setFilteredItineraries] = useState([]);

    useEffect(() => {
        apiClient.get('/itineraries')
            .then(response => {
                console.log('Fetched data:', response.data);
                response.data.forEach(itinerary => console.log(itinerary.itinerary_id)); // Confirm IDs are logging correctly
                setItineraries(response.data);
                setFilteredItineraries(response.data);
            })
            .catch(error => {
                console.error('Failed to fetch itineraries:', error);
            });
    }, []);

    const handleSearch = (searchTerm) => {
        const filtered = itineraries.filter(itinerary =>
            itinerary.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredItineraries(filtered);
    };

    const handleSort = (sortKey) => {
        const sorted = [...filteredItineraries].sort((a, b) => {
            if (sortKey === 'date') {
                return new Date(a.start_date) - new Date(b.start_date);
            } else { // Default to sorting by title
                return a.title.localeCompare(b.title);
            }
        });
        setFilteredItineraries(sorted);
    };

    const handleFilter = (filterKey) => {
        const now = new Date();
        const filtered = itineraries.filter(itinerary => {
            if (filterKey === 'upcoming') {
                return new Date(itinerary.start_date) > now;
            } else if (filterKey === 'past') {
                return new Date(itinerary.end_date) < now;
            } else {
                return true; // 'all'
            }
        });
        setFilteredItineraries(filtered);
    };

    return (
        <div>
            <h1>Itineraries</h1>
            <ItineraryControls onSearch={handleSearch} onSort={handleSort} onFilter={handleFilter} />
            <ul>
                {filteredItineraries.map(itinerary => {
                    console.log(itinerary.itinerary_id); // Check if any IDs are undefined
                    return (
                        <li key={itinerary.itinerary_id}>
                            <Link to={`/itineraries/${itinerary.itinerary_id}`}>{itinerary.title}</Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ItineraryList;
