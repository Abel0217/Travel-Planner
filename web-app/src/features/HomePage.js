import React, { useEffect, useState, useContext } from 'react';
import apiClient from '../api/apiClient';
import moment from 'moment';
import { AuthContext } from '../Contexts/AuthContext'; // Adjust path as necessary
import './css/HomePage.css';

const HomePage = () => {
    const [itineraries, setItineraries] = useState([]);
    const [filteredItineraries, setFilteredItineraries] = useState([]);
    const [filter, setFilter] = useState('recentlyViewed');
    const { currentUser } = useContext(AuthContext); // Use auth context to get user details

    useEffect(() => {
        apiClient.get('/itineraries')
            .then(response => {
                const formattedItineraries = response.data.map(itinerary => ({
                    ...itinerary,
                    startDate: moment(itinerary.start_date),
                    endDate: moment(itinerary.end_date)
                }));
                setItineraries(formattedItineraries);
                filterItineraries(formattedItineraries, filter);
            })
            .catch(error => {
                console.error('Failed to fetch itineraries', error);
            });
    }, [filter]); // Removed filter from dependency to avoid infinite loop

    const calculateCountdown = (startDate) => {
        const difference = startDate.diff(moment(), 'days');
        return difference < 0 ? 'Trip has started' : `In ${difference} days`;
    };

    const filterItineraries = (itineraries, filter) => {
        const sorted = [...itineraries].sort((a, b) => {
            return filter === 'upcoming' ? 
                a.startDate.diff(moment()) - b.startDate.diff(moment()) :
                b.startDate.diff(a.startDate); // Sort for 'recentlyViewed' by default
        });
        setFilteredItineraries(sorted);
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    return (
        <div>
            <div className="header-container">
                <div className="greeting">
                    Welcome back, {currentUser ? currentUser.name : 'Guest'}!
                </div>
                <select onChange={handleFilterChange} value={filter} className="filter-dropdown">
                    <option value="recentlyViewed">Recently Viewed</option>
                    <option value="upcoming">Upcoming</option>
                </select>
            </div>
            <div className="itinerary-container">
                {filteredItineraries.map(itinerary => (
                    <div key={itinerary.id} className="itinerary-card">
                        <img src={itinerary.imageUrl || 'default.jpg'} alt={itinerary.title} className="itinerary-image"/>
                        <div className="itinerary-info">
                            <h3>{itinerary.title}</h3>
                            <p>{itinerary.startDate.format('MMMM Do YYYY')} - {itinerary.endDate.format('MMMM Do YYYY')}</p>
                            <span>{calculateCountdown(itinerary.startDate)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomePage;
