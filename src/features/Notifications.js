import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import './css/Notifications.css';
import Loading from './Itinerary/Loading'; 

const Notifications = () => {
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvitations = async () => {
            try {
                const response = await apiClient.get('/notifications/invitations');
                setInvitations(response.data);
            } catch (error) {
                console.error('Failed to fetch invitations:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvitations();
    }, []);

    const handleAccept = async (invitationId) => {
        try {
            await apiClient.put(`/notifications/invitations/${invitationId}/accept`);
            setInvitations(invitations.filter(invite => invite.invitation_id !== invitationId));
        } catch (error) {
            console.error('Error accepting invitation:', error);
        }
    };

    const handleDecline = async (invitationId) => {
        try {
            await apiClient.put(`/notifications/invitations/${invitationId}/decline`);
            setInvitations(invitations.filter(invite => invite.invitation_id !== invitationId));
        } catch (error) {
            console.error('Error declining invitation:', error);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="notifications-container">
            <div className="notifications-section itinerary-notifications">
                <h2 className="sections-title">Notifications</h2>
                <ul className="notifications-list">
                    {/* Example Notification List - Add itinerary notifications here if available */}
                    <li className="notification-item">
                        <div className="notification-details">
                            <p>No notifications available.</p>
                        </div>
                    </li>
                </ul>
            </div>

            <div className="notifications-section invitation-notifications">
                <h2 className="sections-title">Itinerary Invitations</h2>
                <ul className="notifications-list">
                    {invitations.length === 0 ? (
                        <p className="no-notifications">No itinerary invitations.</p>
                    ) : (
                        invitations.map((invitation) => (
                            <li key={invitation.invitation_id} className="notification-item">
                                <div className="invitation-header">
                                    <p>
                                        <strong>{invitation.inviter_first_name} {invitation.inviter_last_name}</strong> has invited you to join
                                    </p>
                                </div>
                                <div className="inviter-info">
                                    <img
                                        src={invitation.inviter_profile_picture}
                                        alt={`${invitation.inviter_first_name} ${invitation.inviter_last_name}`}
                                        className="profile-pic"
                                    />
                                    <div className="invitation-details">
                                        <strong>{invitation.itinerary_title}</strong>
                                        <p className="notification-time">
                                            {new Date(invitation.invited_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="invitation-buttons">
                                    <button className="accept-button" onClick={() => handleAccept(invitation.invitation_id)}>
                                        Accept
                                    </button>
                                    <button className="decline-button" onClick={() => handleDecline(invitation.invitation_id)}>
                                        Decline
                                    </button>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default Notifications;
