import React, { useEffect, useState, useContext, useCallback } from 'react';
import apiClient from '../api/apiClient';
import moment from 'moment';
import { AuthContext } from '../Contexts/AuthContext'; 
import './css/ItineraryView.css';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import ItineraryForm from './Itinerary/components/ItineraryForm';

const UNSPLASH_ACCESS_KEY = 'OGBaaEYGlTkJhJgnTL9zm0AsrYP_r1HQ134Azhv9870';

const ItineraryView = () => {
    const [itineraries, setItineraries] = useState([]);
    const [filteredItineraries, setFilteredItineraries] = useState([]);
    const [filter, setFilter] = useState('upcoming');
    const { currentUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItinerary, setSelectedItinerary] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itineraryToEdit, setItineraryToEdit] = useState(null);

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
        if (filter === 'alphabetical') {
            sorted = [...itineraries].sort((a, b) => a.title.localeCompare(b.title));
        } else if (filter === 'upcoming') {
            sorted = [...itineraries].sort((a, b) => {
                const endA = moment(a.endDate, 'MMMM Do YYYY');
                const endB = moment(b.endDate, 'MMMM Do YYYY');
                if (endA.isBefore(moment())) return 1;
                if (endB.isBefore(moment())) return -1;
                return moment(a.startDate, 'MMMM Do YYYY').diff(moment(b.startDate, 'MMMM Do YYYY'));
            });
        }
        setFilteredItineraries(sorted);
    }, [itineraries, filter]);

    useEffect(() => {
        fetchItinerariesWithImages();
    }, [fetchItinerariesWithImages]);

    useEffect(() => {
        filterItineraries();
    }, [itineraries, filter, filterItineraries]);

    const calculateCountdown = (startDate, endDate) => {
        const today = moment().startOf('day');
        const tripStartDate = moment(startDate, "MMMM Do YYYY").startOf('day');
        const tripEndDate = moment(endDate, "MMMM Do YYYY").startOf('day');
        const startDifference = tripStartDate.diff(today, 'days');
        const endDifference = tripEndDate.diff(today, 'days');

        if (endDifference < 0) {
            return { text: 'Trip has ended', color: 'gray' };
        } else if (startDifference === 0) {
            return { text: 'Trip has started', color: 'green' };
        } else if (startDifference === 1) {
            return { text: 'In 1 day', color: 'red' };
        } else if (startDifference < 0) {
            return { text: 'Trip has started', color: 'green' };
        } 
        return { text: `In ${startDifference} days`, color: 'red' };
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const handleItineraryClick = (itineraryId) => {
        navigate(`/itineraries/${itineraryId}`);
        window.scrollTo(0, 0); 
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
                {/* Removed the "Welcome back" and added a + New button */}
                <div className="header-title">
                    <h1>Itineraries</h1>
                </div>

                <select onChange={handleFilterChange} value={filter} className="filter-dropdown">
                    <option value="upcoming">Upcoming</option>
                    <option value="alphabetical">Alphabetical</option>
                </select>
            </div>
            <div className="itinerary-container">
                {/* New Itinerary Card */}
                <div 
                    className="itinerary-card create-card" 
                    onClick={() => navigate('/itineraries/create')}
                    style={{ cursor: 'pointer' }}
                >
                    <div className="create-itinerary-content">
                        <span className="create-plus">+</span>
                    </div>
                </div>

                {filteredItineraries.map((itinerary, index) => {
                    const countdown = calculateCountdown(itinerary.startDate, itinerary.endDate);
                    return (
                        <div 
                            key={itinerary.itinerary_id} 
                            className={`itinerary-card ${countdown.text === 'Trip has ended' ? 'gray-out' : ''}`} 
                            onClick={() => handleItineraryClick(itinerary.itinerary_id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <img src={itinerary.imageUrl || 'https://via.placeholder.com/150'} alt={itinerary.title} className={`itinerary-image ${countdown.text === 'Trip has ended' ? 'grayscale' : ''}`}/>
                            <div className="itinerary-info">
                                <h3>{itinerary.title}</h3>
                                <p>{itinerary.fullDestination}</p> 
                                <p>{itinerary.startDate} - {itinerary.endDate}</p>
                                <span className="countdown" style={{ color: countdown.color }}>{countdown.text}</span>
                            </div>
                            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                                <button className="dropdown-button" onClick={() => toggleDropdown(index)}>...</button>
                                <div className={`dropdown-content ${dropdownOpen === index ? 'show' : ''}`}>
                                    <button onClick={() => handleEditClick(itinerary)}>Edit</button>
                                    <button onClick={() => handleOpenDeleteDialog(itinerary)}>Delete</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                            fetchItinerariesWithImages(); 
                        }}
                    />
                </Dialog>
            )}
        </div>
    );
};

export default ItineraryView;
