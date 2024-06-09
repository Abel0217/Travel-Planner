import React, { useEffect, useState, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient';
import moment from 'moment';
import { AuthContext } from '../Contexts/AuthContext'; 
import './css/HomePage.css';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import ItineraryForm from './Itinerary/components/ItineraryForm';

const UNSPLASH_ACCESS_KEY = 'OGBaaEYGlTkJhJgnTL9zm0AsrYP_r1HQ134Azhv9870';

const HomePage = () => {
    const [itineraries, setItineraries] = useState([]);
    const [filteredItineraries, setFilteredItineraries] = useState([]);
    const [filter, setFilter] = useState('recentlyViewed');
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItinerary, setSelectedItinerary] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itineraryToEdit, setItineraryToEdit] = useState(null);
    const [recentlyViewed, setRecentlyViewed] = useState([]);

    const fetchUnsplashImage = async (destination) => {
        if (!UNSPLASH_ACCESS_KEY) {
            console.error('Unsplash access key is not set');
            return 'https://via.placeholder.com/150';
        }

        if (!destination) {
            console.error('Destination is undefined');
            return 'https://via.placeholder.com/150';
        }

        try {
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${destination}&client_id=${UNSPLASH_ACCESS_KEY}`);
            if (!response.ok) {
                throw new Error('Failed to fetch image');
            }
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].urls.small;
            } else {
                return 'https://via.placeholder.com/150';
            }
        } catch (error) {
            console.error('Failed to fetch image from Unsplash', error);
            return 'https://via.placeholder.com/150';
        }
    };

    const fetchItinerariesWithImages = useCallback(async () => {
        try {
            const response = await apiClient.get('/itineraries');
            if (response.data && Array.isArray(response.data)) {
                const itinerariesWithImages = await Promise.all(
                    response.data.map(async (itinerary) => {
                        const destination = itinerary.destinations ? itinerary.destinations.trim() : 'default';
                        const imageUrl = await fetchUnsplashImage(destination);
                        return {
                            ...itinerary,
                            startDate: moment(itinerary.start_date).format('MMMM Do YYYY'),
                            endDate: moment(itinerary.end_date).format('MMMM Do YYYY'),
                            imageUrl,
                            fullDestination: destination
                        };
                    })
                );
                setItineraries(itinerariesWithImages);
                setFilteredItineraries(itinerariesWithImages);
            } else {
                console.error('Invalid itinerary data format');
            }
        } catch (error) {
            console.error('Failed to fetch itineraries', error);
        }
    }, []);

    const filterItineraries = useCallback(() => {
        let sorted = [];
        if (filter === 'recentlyViewed') {
            sorted = [...itineraries].sort((a, b) => recentlyViewed.indexOf(a.itinerary_id) - recentlyViewed.indexOf(b.itinerary_id));
        } else if (filter === 'alphabetical') {
            sorted = [...itineraries].sort((a, b) => a.title.localeCompare(b.title));
        } else if (filter === 'upcoming') {
            sorted = [...itineraries].sort((a, b) => moment(a.startDate, 'MMMM Do YYYY').diff(moment(b.startDate, 'MMMM Do YYYY')));
        }
        setFilteredItineraries(sorted);
    }, [itineraries, filter, recentlyViewed]);

    useEffect(() => {
        fetchItinerariesWithImages();
    }, [fetchItinerariesWithImages]);

    useEffect(() => {
        filterItineraries();
    }, [itineraries, filter, filterItineraries]);

    const calculateCountdown = (startDate) => {
        const today = moment().startOf('day');
        const tripStartDate = moment(startDate, "MMMM Do YYYY").startOf('day');
        const difference = tripStartDate.diff(today, 'days');
    
        if (difference === 0) {
            return 'Trip has started';
        } else if (difference === 1) {
            return 'In 1 day';
        } else if (difference < 0) {
            return 'Trip has started';
        } 
        return `In ${difference} days`;
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const handleItineraryClick = (itineraryId) => {
        setRecentlyViewed(prev => [itineraryId, ...prev.filter(id => id !== itineraryId)]);
        navigate(`/itineraries/${itineraryId}`);
        window.scrollTo(0, 0); // Scroll to top
    };

    const handleEditClick = (itinerary) => {
        setItineraryToEdit(itinerary);
        setIsEditModalOpen(true);
        setDropdownOpen(null);
    };

    const handleDeleteClick = async () => {
        try {
            await apiClient.delete(`/itineraries/${selectedItinerary.itinerary_id}`);
            setItineraries(itineraries.filter(itinerary => itinerary.itinerary_id !== selectedItinerary.itinerary_id));
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error('Failed to delete itinerary:', error);
        }
    };

    const handleOpenDeleteDialog = (itinerary) => {
        setSelectedItinerary(itinerary);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedItinerary(null);
    };

    const toggleDropdown = (index) => {
        setDropdownOpen(dropdownOpen === index ? null : index);
    };

    const handleOutsideClick = (event) => {
        if (!event.target.closest('.dropdown')) {
            setDropdownOpen(null);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleOutsideClick);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
        };
    }, []);

    return (
        <div>
            <div className="header-container">
                <div className="greeting">
                    Welcome back, {currentUser ? currentUser.name : 'Guest'}!
                </div>
                <select onChange={handleFilterChange} value={filter} className="filter-dropdown">
                    <option value="recentlyViewed">Recently Viewed</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="alphabetical">Alphabetical</option>
                </select>
            </div>
            <div className="itinerary-container">
                {filteredItineraries.map((itinerary, index) => (
                    <div 
                        key={itinerary.itinerary_id} 
                        className="itinerary-card" 
                        onClick={() => handleItineraryClick(itinerary.itinerary_id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img src={itinerary.imageUrl || 'https://via.placeholder.com/150'} alt={itinerary.title} className="itinerary-image"/>
                        <div className="itinerary-info">
                            <h3>{itinerary.title}</h3>
                            <p>{itinerary.fullDestination}</p> 
                            <p>{itinerary.startDate} - {itinerary.endDate}</p>
                            <span className="countdown">{calculateCountdown(itinerary.startDate)}</span>
                        </div>
                        <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                            <button className="dropdown-button" onClick={() => toggleDropdown(index)}>...</button>
                            <div className={`dropdown-content ${dropdownOpen === index ? 'show' : ''}`}>
                                <button onClick={() => handleEditClick(itinerary)}>Edit</button>
                                <button onClick={() => handleOpenDeleteDialog(itinerary)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the itinerary "{selectedItinerary?.title}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} className="dialog-button">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteClick} className="dialog-button">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            {isEditModalOpen && (
                <Dialog
                    open={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <ItineraryForm
                        itineraryToEdit={itineraryToEdit}
                        onClose={() => setIsEditModalOpen(false)}
                        onItinerarySaved={() => {
                            setIsEditModalOpen(false);
                            fetchItinerariesWithImages(); // Refresh the itineraries and images after saving
                        }}
                    />
                </Dialog>
            )}
        </div>
    );
};

export default HomePage;
