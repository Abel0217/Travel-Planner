import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../Contexts/AuthContext';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import './css/FriendsPage.css'; 

const FriendsPage = () => {
    const [email, setEmail] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [incomingRequests, setIncomingRequests] = useState([]);  
    const [outgoingRequests, setOutgoingRequests] = useState([]);  
    const [friends, setFriends] = useState([]);  
    const [showFriendPopup, setShowFriendPopup] = useState(false); 
    const [selectedFriend, setSelectedFriend] = useState(null); 
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [dialogMessage, setDialogMessage] = useState('');
    const [dialogTitle, setDialogTitle] = useState('');
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const { currentUser } = useAuth();  

    useEffect(() => {
        if (!currentUser) return;  
    
        const fetchRequestsAndFriends = async () => {
            try {
                const incomingResponse = await apiClient.get(`/friends/requests/incoming`, {
                    headers: { Authorization: `Bearer ${currentUser.token}` }
                });
                setIncomingRequests(incomingResponse.data);
                
                const outgoingResponse = await apiClient.get(`/friends/requests/outgoing`, {
                    headers: { Authorization: `Bearer ${currentUser.token}` }
                });
                setOutgoingRequests(outgoingResponse.data);
                
                const friendsResponse = await apiClient.get(`/friends/list/${currentUser.uid}`);
                setFriends(friendsResponse.data);
            } catch (error) {
                console.error('Error fetching requests or friends:', error);
                alert('Failed to fetch friend requests.');
            }
        };        
    
        fetchRequestsAndFriends();
    }, [currentUser]);
    
    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setSearchResult(null);

        try {
            const response = await apiClient.get(`/friends/search?email=${email}`);
            if (response.data.uid === currentUser.uid) {
                setDialogTitle('Error');
                setDialogMessage('You cannot add yourself as a friend.');
                setIsDialogOpen(true);
                return;
            }
            setSearchResult(response.data);
        } catch (error) {
            setError('User not found.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (requesteeUid) => {
        try {
            const response = await apiClient.post('/friends/request', { requestee_uid: requesteeUid });
            if (response.status === 201) {
                setOutgoingRequests([...outgoingRequests, { requestee_id: requesteeUid }]);
            }
        } catch (error) {
            console.error('Failed to send friend request:', error);
            alert('Could not send friend request. Please try again.');
        }
    };

    const handleCancelRequest = (requesteeUid) => {
        console.log("Requester UID (Frontend):", currentUser?.uid);
        console.log("Requestee UID (Frontend):", requesteeUid);
    
        if (!currentUser?.uid || !requesteeUid) {
            console.error("Missing parameters:", {
                requester_uid: currentUser?.uid,
                requestee_uid: requesteeUid,
            });
            setDialogTitle("Error");
            setDialogMessage("Failed to cancel friend request. Missing required data.");
            setIsDialogOpen(true);
            return;
        }
    
        setConfirmAction(() => async () => {
            try {
                await apiClient.delete('/friends/request/cancel', {
                    data: { requester_uid: currentUser.uid, requestee_uid: requesteeUid },
                    headers: { Authorization: `Bearer ${currentUser.token}` },
                });
    
                setOutgoingRequests(outgoingRequests.filter(req => req.requestee_id !== requesteeUid));
                setDialogTitle("Success");
                setDialogMessage("Friend request canceled successfully!");
            } catch (error) {
                console.error("Failed to cancel friend request:", error.message);
                setDialogTitle("Error");
                setDialogMessage(
                    error.response?.data?.error || "Failed to cancel friend request. Please try again."
                );
            } finally {
                setIsDialogOpen(true);
                setIsConfirmDialogOpen(false);
            }
        });
    
        setDialogTitle("Confirm Cancellation");
        setDialogMessage("Are you sure you want to cancel this friend request?");
        setIsConfirmDialogOpen(true);
    };          
    
    const handleAcceptRequest = async (requestId) => {
        setConfirmAction(() => async () => {
            try {
                await apiClient.put(`/friends/request/${requestId}/accept`);
                setIncomingRequests(incomingRequests.filter(request => request.request_id !== requestId));
                setDialogTitle('Success');
                setDialogMessage('Friend request accepted!');
                setIsDialogOpen(true);
            } catch (error) {
                setDialogTitle('Error');
                setDialogMessage('Failed to accept friend request.');
                setIsDialogOpen(true);
            }
        });
        setIsConfirmDialogOpen(true);
    };

    const handleRejectRequest = async (requestId) => {
        setConfirmAction(() => async () => {
            try {
                await apiClient.put(`/friends/request/${requestId}/reject`);
                setIncomingRequests(incomingRequests.filter(request => request.request_id !== requestId));
                setDialogTitle('Success');
                setDialogMessage('Friend request rejected.');
                setIsDialogOpen(true);
            } catch (error) {
                setDialogTitle('Error');
                setDialogMessage('Failed to reject friend request.');
                setIsDialogOpen(true);
            }
        });
        setIsConfirmDialogOpen(true);
    };

    const handleFriendClick = (friend) => {
        setSelectedFriend(friend);
        setShowFriendPopup(true);
    };
    
    const handleCloseFriendPopup = () => {
        setShowFriendPopup(false);
        setSelectedFriend(null);
    };
    

    const handleRemoveFriend = (friendUid) => {
        setConfirmAction(() => async () => {
            try {
                await apiClient.post('/friends/remove', { friend_uid: friendUid }, {
                    headers: { Authorization: `Bearer ${currentUser.token}` }
                });
                setFriends(friends.filter(friend => friend.uid !== friendUid));
                setShowFriendPopup(false);
                setDialogTitle('Success');
                setDialogMessage('Friend removed successfully!');
                setIsDialogOpen(true);
            } catch (error) {
                console.error('Failed to remove friend:', error);
                setDialogTitle('Error');
                setDialogMessage('Failed to remove friend. Please try again.');
                setIsDialogOpen(true);
            }
        });
        setDialogTitle('Confirm Removal');
        setDialogMessage('Are you sure you want to remove this friend?');
        setIsConfirmDialogOpen(true);
    };
    

    return (
        <div className="friends-page">
            {/* Friend Requests Block */}
            <div className="block friend-requests-block">
                <h2 className="hover-bounce">Friend Requests</h2>
                {incomingRequests.length === 0 ? (
                    <p>No incoming requests</p>
                ) : (
                    incomingRequests.map(request => (
                        <div key={request.request_id} className="search-result-box">
                            <div className="search-result">
                                <img 
                                    src={request.profile_picture} 
                                    alt={request.first_name} 
                                    className="profile-pic large"
                                />
                                <p className="user-name">{request.first_name} {request.last_name}</p>
                            </div>
                            <div className="request-actions">
                                <button onClick={() => handleAcceptRequest(request.request_id)}>Accept</button>
                                <button onClick={() => handleRejectRequest(request.request_id)}>Decline</button>
                            </div>
                        </div>
                    ))
                )}

                <h2 className="hover-bounce">Sent Requests</h2>
                {outgoingRequests.map(request => {
                    if (!request.requestee_id) {
                        console.warn("Requestee ID is missing for:", request);
                        return null; 
                    }

                    return (
                        <div key={request.request_id} className="search-result-box">
                            <div className="search-result">
                                <img 
                                    src={request.profile_picture} 
                                    alt={request.first_name} 
                                    className="profile-pic large"
                                />
                                <p className="user-name">{request.first_name} {request.last_name}</p>
                            </div>
                            <div className="request-actions">
                                <button onClick={() => handleCancelRequest(request.requestee_id)}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Search Block */}
            <div className="block search-block">
                <h2 className="hover-bounce">Find Friends</h2>
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email to search"
                    disabled={loading}
                />
                <button className="search-btn" onClick={handleSearch} disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>

                {error && <p className="error-text">{error}</p>}

                {searchResult && (
                    <div className="search-result-box">
                        <div className="search-result">
                            <img 
                                src={searchResult.profile_picture} 
                                alt={searchResult.first_name} 
                                className="profile-pic large"
                            />
                            <p className="user-name">{searchResult.first_name} {searchResult.last_name}</p>
                        </div>
                        <div className="button-container">
                            <button 
                                className={outgoingRequests.some(req => req.requestee_id === searchResult.uid) ? "pending-button" : "add-button"}
                                onClick={() => handleSendRequest(searchResult.uid)}
                                disabled={outgoingRequests.some(req => req.requestee_id === searchResult.uid)}
                            >
                                {outgoingRequests.some(req => req.requestee_id === searchResult.uid) ? 'Pending' : '+'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Friends List Block */}
            <div className="block friends-list-block">
                <h2 className="hover-bounce">Your Friends</h2>
                {friends.length === 0 ? (
                    <p>No friends yet</p>
                ) : (
                    <div className="friends-list">
                        {friends.map(friend => (
                            <div key={friend.user_id} className="search-result-box" onClick={() => handleFriendClick(friend)}>
                                <div className="search-result">
                                    <img 
                                        src={friend.profile_picture} 
                                        alt={friend.first_name} 
                                        className="profile-pic large"
                                    />
                                    <p className="user-name">{friend.first_name} {friend.last_name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Friend Popup */}
            {showFriendPopup && selectedFriend && (
                <div className="friend-popup">
                    <div className="friend-popup-content">
                        <img 
                            src={selectedFriend.profile_picture} 
                            alt={selectedFriend.first_name} 
                            className="profile-pic large"
                        />
                        <h3>{selectedFriend.first_name} {selectedFriend.last_name}</h3>
                        <p>{selectedFriend.email}</p>
                        <div className="popup-buttons">
                            <Button 
                                onClick={() => handleRemoveFriend(selectedFriend.uid)}
                                className="dialog-button"
                            >
                                Remove Friend
                            </Button>
                            <Button 
                                onClick={handleCloseFriendPopup}
                                className="dialog-button"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog
                open={isConfirmDialogOpen}
                onClose={() => setIsConfirmDialogOpen(false)}
            >
                <DialogTitle style={{ textAlign: 'center' }}>Confirm Action</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content-text">
                        Are you sure you want to proceed?
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button onClick={() => setIsConfirmDialogOpen(false)} className="dialog-button">
                        No
                    </Button>
                    <Button onClick={() => {
                        confirmAction();
                        setIsConfirmDialogOpen(false);
                    }} className="dialog-button">
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success/Error Dialog */}
            <Dialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
            >
                <DialogTitle style={{ textAlign: 'center' }}>{dialogTitle}</DialogTitle>
                <DialogContent>
                    <DialogContentText className="dialog-content-text">
                        {dialogMessage}
                    </DialogContentText>
                </DialogContent>
                <DialogActions className="dialog-actions">
                    <Button onClick={() => setIsDialogOpen(false)} className="dialog-button">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

        </div>
    );
};

export default FriendsPage;
