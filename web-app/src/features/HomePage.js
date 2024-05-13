import React, { useEffect, useState, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient';
import moment from 'moment';
import { AuthContext } from '../Contexts/AuthContext'; 
import './css/HomePage.css';
import { useNavigate } from 'react-router-dom'; 

const HomePage = () => {
    const [itineraries, setItineraries] = useState([]);
    const [filteredItineraries, setFilteredItineraries] = useState([]);
    const [filter, setFilter] = useState('recentlyViewed');
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const filterItineraries = useCallback(() => {
        const sorted = [...itineraries].sort((a, b) => {
            return filter === 'upcoming' ? 
                moment(a.startDate).diff(moment()) - moment(b.startDate).diff(moment()) :
                moment(b.startDate).diff(a.startDate);
        });
        setFilteredItineraries(sorted);
    }, [itineraries, filter]);

    useEffect(() => {
        apiClient.get('/itineraries')
        .then(response => {
            const formattedItineraries = response.data.map(itinerary => ({
                ...itinerary,
                startDate: moment(itinerary.start_date).format('MMMM Do YYYY'),
                endDate: moment(itinerary.end_date).format('MMMM Do YYYY')
            }));
            console.log("Itineraries fetched: ", formattedItineraries);
            setItineraries(formattedItineraries);
        })
        
            .catch(error => {
                console.error('Failed to fetch itineraries', error);
            });
    }, []); 

    useEffect(() => {
        filterItineraries();  // Call filterItineraries whenever itineraries or filter changes
    }, [itineraries, filter, filterItineraries]);

    const calculateCountdown = (startDate) => {
        const date = moment(startDate, "MMMM Do YYYY");
        const difference = date.diff(moment(), 'days');
        return difference < 0 ? 'Trip has started' : `In ${difference} days`;
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const handleItineraryClick = (itineraryId) => {
        navigate(`/itineraries/${itineraryId}`);
        console.log('Navigating to:', itineraryId); // Add this log to confirm the value
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
                <div key={itinerary.itinerary_id} className="itinerary-card" onClick={() => handleItineraryClick(itinerary.itinerary_id)}>
                    <img src={itinerary.imageUrl || 'default.jpg'} alt={itinerary.title} className="itinerary-image"/>
                    <div className="itinerary-info">
                        <h3>{itinerary.title}</h3>
                        <p>{itinerary.startDate} - {itinerary.endDate}</p>
                        <span>{calculateCountdown(itinerary.startDate)}</span>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
};

export default HomePage;
