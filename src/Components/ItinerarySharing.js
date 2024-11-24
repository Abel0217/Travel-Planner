import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import './css/ItinerarySharing.css'; 

const ItinerarySharing = ({ itineraryId, currentUser, isHost }) => {
    const [friends, setFriends] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [friendToInvite, setFriendToInvite] = useState(null);
    const [inviteStatus, setInviteStatus] = useState('');

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const response = await apiClient.get('/friends/list');
                setFriends(response.data);
            } catch (error) {
                console.error('Failed to fetch friends:', error);
            }
        };
        fetchFriends();
    }, []);

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const response = await apiClient.get(`/sharing/participants/${itineraryId}`);
                setParticipants(response.data);
            } catch (error) {
                console.error('Failed to fetch participants:', error);
            }
        };
        fetchParticipants();
    }, [itineraryId]);

    const handleInviteFriend = async () => {
        if (!friendToInvite) return;
        try {
            const response = await apiClient.post('/sharing/invite', {
                itineraryId,
                friendId: friendToInvite
            });
            setInviteStatus('Invite sent successfully');
            setFriendToInvite(null);
        } catch (error) {
            console.error('Error inviting friend:', error);
            setInviteStatus('Error sending invite');
        }
    };

    return (
        <div className="itinerary-sharing">
            {isHost && (
                <div className="invite-friend">
                    <h3>Invite a Friend</h3>
                    <select
                        value={friendToInvite || ''}
                        onChange={(e) => setFriendToInvite(e.target.value)}
                    >
                        <option value="">Select a friend</option>
                        {friends.map(friend => (
                            <option key={friend.uid} value={friend.uid}>
                                {friend.first_name} {friend.last_name}
                            </option>
                        ))}
                    </select>
                    <button onClick={handleInviteFriend} disabled={!friendToInvite}>
                        Send Invite
                    </button>
                    {inviteStatus && <p>{inviteStatus}</p>}
                </div>
            )}

            <div className="participants-list">
                <h3>Participants</h3>
                {participants.map(participant => (
                    <div key={participant.uid} className="participant">
                        <img src={participant.profile_picture || '/default-avatar.png'} alt={`${participant.first_name} ${participant.last_name}`} />
                        <p>{participant.first_name} {participant.last_name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ItinerarySharing;
