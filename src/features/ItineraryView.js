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
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false); 
    const [itineraryToLeave, setItineraryToLeave] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [itineraryToEdit, setItineraryToEdit] = useState(null);
    const [participantModalOpen, setParticipantModalOpen] = useState(false); 
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [friends, setFriends] = useState([]);
    const [invitations, setInvitations] = useState([]);  
    const [participants, setParticipants] = useState([]);
    const [sharedItineraries, setSharedItineraries] = useState([]);
    const [isAlreadyInvitedDialogOpen, setIsAlreadyInvitedDialogOpen] = useState(false);
    const [isAlreadyParticipantDialogOpen, setIsAlreadyParticipantDialogOpen] = useState(false);
    const [successDialogOpen, setSuccessDialogOpen] = useState(false);
    const [successDialogMessage, setSuccessDialogMessage] = useState('');
    const [alreadyInvitedDialogOpen, setAlreadyInvitedDialogOpen] = useState(false);
    const [alreadyInItineraryDialogOpen, setAlreadyInItineraryDialogOpen] = useState(false);
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const [errorDialogMessage, setErrorDialogMessage] = useState('');

    const fetchUnsplashImage = async (destination) => {
        if (!UNSPLASH_ACCESS_KEY) {
            console.error('Unsplash access key is not set');
            return 'https://via.placeholder.com/150';
        }
    
        if (!destination) {
            console.error('Destination is undefined');
            return 'https://via.placeholder.com/150';
        }
    
        const query = `${destination} landscape`;
    
        try {
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=${UNSPLASH_ACCESS_KEY}`);
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
                            fullDestination: destination,
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

        const allItineraries = [
            ...itineraries.map((itinerary) => ({ ...itinerary, type: 'regular' })),
            ...sharedItineraries.map((itinerary) => ({ ...itinerary, type: 'shared' })),
        ];
        console.log('All itineraries (combined):', allItineraries);
    
    const fetchSharedItineraries = useCallback(async () => {
        try {
            console.log('Fetching shared itineraries from API...');
            const response = await apiClient.get('/sharing/shared');
            console.log('Shared itineraries API response:', response.data); 
    
            if (response.data && Array.isArray(response.data)) {
                const sharedItinerariesWithImages = await Promise.all(
                    response.data.map(async (itinerary) => {
                        const destination = itinerary.destinations ? itinerary.destinations.trim() : 'No Destination Specified';
                        const imageUrl = await fetchUnsplashImage(destination);
    
                        return {
                            ...itinerary,
                            startDate: itinerary.start_date
                                ? moment(itinerary.start_date).format('MMMM Do YYYY')
                                : 'Start Date Unavailable',
                            endDate: itinerary.end_date
                                ? moment(itinerary.end_date).format('MMMM Do YYYY')
                                : 'End Date Unavailable',
                            title: itinerary.title || 'Untitled Itinerary',
                            imageUrl,
                            fullDestination: destination,
                            type: 'shared',
                        };
                    })
                );
                console.log('Processed shared itineraries:', sharedItinerariesWithImages); 
                setSharedItineraries(sharedItinerariesWithImages);
            } else {
                console.error('Invalid shared itinerary data format');
            }
        } catch (error) {
            console.error('Failed to fetch shared itineraries', error);
        }
    }, []);    
    
    const filterItineraries = useCallback(() => {
        const combinedItineraries = [
            ...itineraries.map(itinerary => ({ ...itinerary, type: 'regular' })),
            ...sharedItineraries.map(itinerary => ({ ...itinerary, type: 'shared' })),
        ];
    
        let sorted = [...combinedItineraries]; 
    
        if (filter === 'alphabetical') {
            sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (filter === 'upcoming') {
            sorted.sort((a, b) => {
                const daysUntilA = moment(a.startDate, 'MMMM Do YYYY').diff(moment(), 'days');
                const daysUntilB = moment(b.startDate, 'MMMM Do YYYY').diff(moment(), 'days');
                return daysUntilA - daysUntilB;
            });
        }
    
        setFilteredItineraries(sorted);
    }, [itineraries, sharedItineraries, filter]);                
    

    const sendInvite = async (friendId, friendName) => {
        if (!friendId) {
            console.error('Friend ID is missing.');
            return;
        }
    
        try {
            const response = await apiClient.post('/sharing/invite', {
                itineraryId: selectedItinerary.itinerary_id,
                friendId,
            }, {
                headers: {
                    Authorization: `Bearer ${currentUser.token}`,
                }
            });
    
            setSuccessDialogMessage(`Invitation sent to ${friendName}`); 
            setSuccessDialogOpen(true);
        } catch (error) {
            console.error("Error sending invite:", error);
    
            if (error.response?.data?.error === 'Invitation already sent to this user.') {
                setAlreadyInvitedDialogOpen(true);
            } else if (error.response?.data?.error === 'User is already a participant in this itinerary.') {
                setAlreadyInItineraryDialogOpen(true);
            } else {
                setErrorDialogMessage('Failed to send invitation.');
                setErrorDialogOpen(true);
            }
        }
    };
    
    const acceptInvite = async (itineraryId) => {
        try {
            await apiClient.post('/sharing/accept', { itineraryId });
            alert('Invitation accepted');
            fetchInvitations(); 
        } catch (error) {
            console.error('Error accepting invitation:', error);
            alert('Failed to accept invitation.');
        }
    };
    
    const rejectInvite = async (itineraryId) => {
        try {
            await apiClient.post('/sharing/reject', { itineraryId });
            alert('Invitation rejected');
            fetchInvitations(); 
        } catch (error) {
            console.error('Error rejecting invitation:', error);
            alert('Failed to reject invitation.');
        }
    };    
    
    const fetchInvitations = async () => {
        try {
            const response = await apiClient.get(`/sharing/invitations`);
            setInvitations(response.data);
        } catch (error) {
            console.error('Error fetching invitations:', error);
            alert('Failed to fetch invitations.');
        }
    };

    const handleLeaveItinerary = async (itineraryId) => {
        try {
            await apiClient.post('/sharing/leave', { itineraryId }, {
                headers: {
                    Authorization: `Bearer ${currentUser.token}`,
                },
            });
            fetchSharedItineraries();  
        } catch (error) {
            console.error('Failed to leave itinerary:', error);
            alert('Failed to leave itinerary.');
        } finally {
            setIsLeaveDialogOpen(false);  
        }
    };
    

    const handleLeaveItineraryRequest = (itinerary) => {
        setItineraryToLeave(itinerary);
        setIsLeaveDialogOpen(true);
    };    
    
    const fetchParticipants = async (itineraryId) => {
        try {
            const response = await apiClient.get(`/sharing/participants/${itineraryId}`, {
                headers: { Authorization: `Bearer ${currentUser.token}` },
            });
            console.log("Fetched participants:", response.data);
            setParticipants(response.data); 
        } catch (error) {
            console.error('Error fetching participants:', error);
            alert('Failed to fetch participants.');
        }
    };      
    
    useEffect(() => {
        const fetchData = async () => {
            await fetchItinerariesWithImages(); 
            await fetchSharedItineraries(); 
        };
        fetchData();
    }, [fetchItinerariesWithImages, fetchSharedItineraries]);

    useEffect(() => {
        console.log("Selected itinerary in invite modal:", selectedItinerary);
    }, [selectedItinerary]);
    
    useEffect(() => {
        if (itineraries.length || sharedItineraries.length) {
            filterItineraries();
        }
    }, [itineraries, sharedItineraries, filter, filterItineraries]);


    useEffect(() => {
        console.log('Itineraries:', itineraries);
    }, [itineraries]);
    
    useEffect(() => {
        console.log('Filtered Itineraries (final to render):', filteredItineraries);
    }, [filteredItineraries]);
    

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
        console.log('Selected filter:', event.target.value); 
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

    
    const handleInviteClick = async (itinerary) => {
        setSelectedItinerary(itinerary);
        setIsInviteModalOpen(true);
    
        try {
            await fetchParticipants(itinerary.itinerary_id); 
        } catch (error) {
            console.error('Error fetching participants:', error);
        }
    };         

    const fetchFriends = async () => {
        try {
            const response = await apiClient.get(`/friends/list/${currentUser.uid}`);
            console.log("Fetched friends:", response.data); 
            setFriends(response.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
            alert('Failed to fetch friends.');
        }
    };              
    
    useEffect(() => {
        fetchFriends();
    }, []);

    const handleViewParticipants = (itineraryId) => {
        setSelectedItinerary(itineraryId);
        setParticipantModalOpen(true);
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
                <div className="header-title">
                    <h1>Itineraries</h1>
                </div>
                <select onChange={handleFilterChange} value={filter} className="filter-dropdown">
                    <option value="upcoming">Upcoming</option>
                    <option value="alphabetical">Alphabetical</option>
                </select>
            </div>
            <div className="itinerary-container">
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
                            <img
                                src={itinerary.imageUrl || 'https://via.placeholder.com/150'}
                                alt={itinerary.title}
                                className={`itinerary-image ${countdown.text === 'Trip has ended' ? 'grayscale' : ''}`}
                            />
                            <div className="itinerary-info">
                                <h3>{itinerary.title}</h3>
                                <p>{itinerary.fullDestination}</p>
                                <p>{itinerary.startDate} - {itinerary.endDate}</p>
                                <span className="countdown" style={{ color: countdown.color }}>{countdown.text}</span>
                            </div>
                            {/* Dropdown Menu */}
                            <div className="dropdown" onClick={(e) => e.stopPropagation()}>
                                <button className="dropdown-button" onClick={() => toggleDropdown(index)}>...</button>
                                <div className={`dropdown-content ${dropdownOpen === index ? 'show' : ''}`}>
                                    {itinerary.type === 'shared' ? (
                                        <>
                                            <button onClick={() => handleViewParticipants(itinerary.itinerary_id)}>View Participants</button>
                                            <button onClick={() => handleLeaveItineraryRequest(itinerary)}>Leave Itinerary</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditClick(itinerary)}>Edit</button>
                                            <button onClick={() => handleInviteClick(itinerary)}>Add Friends</button>
                                            <button onClick={() => handleOpenDeleteDialog(itinerary)}>Delete</button>
                                        </>
                                    )}
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
            <Dialog
                open={isLeaveDialogOpen}
                onClose={() => setIsLeaveDialogOpen(false)}
            >
                <DialogTitle>Confirm Leave Itinerary</DialogTitle>
                <DialogContent className="dialog-center">
                    <DialogContentText>
                        Are you sure you want to leave the itinerary "{itineraryToLeave?.title}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsLeaveDialogOpen(false)} className="dialog-button">
                        Cancel
                    </Button>
                    <Button
                        onClick={async () => {
                            try {
                                await apiClient.post('/sharing/leave', { itineraryId: itineraryToLeave.itinerary_id }, {
                                    headers: {
                                        Authorization: `Bearer ${currentUser.token}`,
                                    },
                                });
                                alert('You have left the itinerary.');
                                fetchSharedItineraries();
                            } catch (error) {
                                console.error('Failed to leave itinerary:', error);
                                alert('Failed to leave itinerary.');
                            } finally {
                                setIsLeaveDialogOpen(false);
                            }
                        }}
                        className="dialog-button"
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Success Dialog */}
            <Dialog open={successDialogOpen} onClose={() => setSuccessDialogOpen(false)}>
                <DialogTitle style={{ textAlign: 'center' }}>Success</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content">
                        {successDialogMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button
                        onClick={() => setSuccessDialogOpen(false)}
                        className="dialog-button"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Already Invited Dialog */}
            <Dialog open={alreadyInvitedDialogOpen} onClose={() => setAlreadyInvitedDialogOpen(false)}>
                <DialogTitle style={{ textAlign: 'center' }}>Invitation Already Sent</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content">
                        You have already sent an invitation to this user.
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button
                        onClick={() => setAlreadyInvitedDialogOpen(false)}
                        className="dialog-button"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Already in Itinerary Dialog */}
            <Dialog open={alreadyInItineraryDialogOpen} onClose={() => setAlreadyInItineraryDialogOpen(false)}>
                <DialogTitle style={{ textAlign: 'center' }}>Already in Itinerary</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content">
                        This user is already a participant in this itinerary.
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button
                        onClick={() => setAlreadyInItineraryDialogOpen(false)}
                        className="dialog-button"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Generic Error Dialog */}
            <Dialog open={errorDialogOpen} onClose={() => setErrorDialogOpen(false)}>
                <DialogTitle style={{ textAlign: 'center' }}>Error</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content">
                        {errorDialogMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button
                        onClick={() => setErrorDialogOpen(false)}
                        className="dialog-button"
                    >
                        Close
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
            {isInviteModalOpen && (
                <div className="invite-modal">
                    <div className="invite-modal-content">
                        <button className="close-button" onClick={() => setIsInviteModalOpen(false)}>✖</button>
                        <h3 className="invite-modal-title">Add Friend to Itinerary</h3>
                        
                        {/* Friends to Invite */}
                        {friends.length > 0 ? (
                            <ul className="invite-friends-list">
                                {friends.map((friend) => (
                                    <li key={friend.uid} className="invite-friend-item">
                                        <img src={friend.profile_picture} alt={friend.first_name} className="profile-pic small" />
                                        <span className="friend-name">{friend.first_name} {friend.last_name}</span>
                                        <button
                                            className={`add-button ${friend.isInvited ? "pending" : ""}`}
                                            onClick={() => sendInvite(friend.uid, `${friend.first_name} ${friend.last_name}`)}
                                            disabled={friend.isInvited}
                                        >
                                            {friend.isInvited ? "Pending" : "Add"}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No friends available to invite. Add friends first!</p>
                        )}

                        {/* Horizontal Divider */}
                        <hr className="divider-line" />

                        {/* Friends Already in the Itinerary */}
                        <h4 className="section-title">Friends Already Added</h4>
                        {participants.length > 0 ? (
                            <ul className="participants-list">
                                {participants.map((participant) => (
                                    <li key={participant.user_id} className="participant-item">
                                        <img
                                            src={participant.profile_picture || "https://via.placeholder.com/50"}
                                            alt={participant.first_name}
                                            className="profile-pic small"
                                        />
                                        <span className="participant-name">
                                            {participant.first_name} {participant.last_name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No friends are currently added to this itinerary.</p>
                        )}
                    </div>
                </div>
            )}
            {participantModalOpen && (
                <div className="participant-modal">
                    <div className="participant-modal-content">
                        <button className="close-button" onClick={() => setParticipantModalOpen(false)}>✖</button>
                        <h3>Participants</h3>
                        <ul>
                            {participants.map(participant => (
                                <li key={participant.user_id}>
                                    {participant.first_name} {participant.last_name} - {participant.role}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItineraryView;