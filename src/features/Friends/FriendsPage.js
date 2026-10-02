import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../Contexts/AuthContext';
import { mediaUrl } from '../../utils/mediaUrl';
import './css/FriendsPage.css';
import { randomLocalSceneryIndex, sceneryImages, useHeldCrossfade } from '../../utils/scenery';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initials(person) {
    const letters = `${person?.first_name || ''} ${person?.last_name || ''}`
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
    return letters;
}

function personName(person) {
    return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim();
}

function tripStamp(trip) {
    const raw = trip?.end_date ? String(trip.end_date).slice(0, 10) : '';
    const [year, month, day] = raw.split('-').map(Number);
    if (!year || !month || !day) return 0;
    return new Date(year, month - 1, day).getTime();
}

function endedLabel(trip) {
    const raw = trip?.end_date ? String(trip.end_date).slice(0, 10) : '';
    const [year, month] = raw.split('-').map(Number);
    if (!year || !month) return 'Date unavailable';
    const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long' });
    return `Ended ${monthName} ${year}`;
}

function Avatar({ person, large = false }) {
    const src = mediaUrl(person?.profile_picture);
    const letters = initials(person);
    return (
        <div className={`friend-avatar ${large ? 'large' : ''}`}>
            {src ? <img src={src} alt="" /> : letters ? <span>{letters}</span> : (
                <span className="avatar-fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="3.15" />
                        <path d="M5.2 18.8c.4-3.15 3.15-5.15 6.8-5.15s6.4 2 6.8 5.15z" />
                    </svg>
                </span>
            )}
        </div>
    );
}

function SharedTripItem({ trip }) {
    const navigate = useNavigate();
    const names = trip.friends.map((friend) => personName(friend) || friend.email).join(', ');
    return (
        <li>
            <span className="activity-mark" />
            <div>
                <strong>{trip.title}</strong>
                <span>With {names}</span>
                <small>{endedLabel(trip)}</small>
            </div>
            <button
                type="button"
                className="trip-view"
                onClick={() => navigate(`/itineraries/${trip.itinerary_id}`)}
            >
                View
            </button>
        </li>
    );
}

const FriendsPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [startSlide] = useState(() => randomLocalSceneryIndex());
    const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });
    const [query, setQuery] = useState('');
    const [friendFilter, setFriendFilter] = useState('all');
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchResult, setSearchResult] = useState(null);
    const [inviteMessage, setInviteMessage] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [tripFriend, setTripFriend] = useState(null);
    const [myTrips, setMyTrips] = useState([]);
    const [tripMessage, setTripMessage] = useState('');
    const [tripError, setTripError] = useState('');
    const [itinerariesOpen, setItinerariesOpen] = useState(false);

    const loadFriends = async () => {
        if (!currentUser) return;
        const [overview, incoming, outgoing] = await Promise.all([
            apiClient.get('/friends/overview'),
            apiClient.get('/friends/requests/incoming'),
            apiClient.get('/friends/requests/outgoing'),
        ]);
        setFriends(overview.data.friends || []);
        setIncomingRequests(incoming.data || []);
        setOutgoingRequests(outgoing.data || []);
    };

    useEffect(() => {
        loadFriends().catch((error) => console.error(error));
    }, [currentUser]);

    const filteredFriends = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return friends.filter((friend) => {
            const active = (friend.trips || []).some((trip) => trip.active);
            if (friendFilter === 'active' && !active) return false;
            if (!needle) return true;
            const name = `${friend.first_name || ''} ${friend.last_name || ''}`.toLowerCase();
            return name.includes(needle) || (friend.email || '').toLowerCase().includes(needle);
        });
    }, [friends, query, friendFilter]);

    const activeCollaborators = friends.filter((friend) => (friend.trips || []).some((trip) => trip.active)).length;

    const sharedActivity = useMemo(() => {
        const byTrip = new Map();
        friends.forEach((friend) => {
            (friend.trips || []).forEach((trip) => {
                const current = byTrip.get(trip.itinerary_id) || {
                    itinerary_id: trip.itinerary_id,
                    title: trip.title,
                    end_date: trip.end_date,
                    active: trip.active,
                    friends: [],
                };
                current.friends.push(friend);
                if (trip.active) current.active = true;
                byTrip.set(trip.itinerary_id, current);
            });
        });
        return [...byTrip.values()]
            .sort((a, b) => tripStamp(b) - tripStamp(a));
    }, [friends]);

    const recentItineraries = sharedActivity.slice(0, 3);

    const pendingCount = incomingRequests.length + outgoingRequests.length;

    const emailValid = emailPattern.test(email.trim());
    const knownFriend = searchResult && friends.some((friend) => friend.uid === searchResult.uid);

    const openInvite = () => {
        setInviteOpen(true);
        setEmail('');
        setEmailTouched(false);
        setSearchResult(null);
        setInviteMessage('');
        setInviteError('');
    };

    const handleSearch = async (event) => {
        event.preventDefault();
        setEmailTouched(true);
        setSearchResult(null);
        setInviteMessage('');
        setInviteError('');
        if (!emailValid) return;

        setSearching(true);
        try {
            const response = await apiClient.get(`/friends/search?email=${encodeURIComponent(email.trim())}`);
            if (response.data.relation === 'self' || response.data.uid === currentUser.uid) {
                setInviteError('That is your own email.');
                return;
            }
            if (response.data.relation === 'friend' || friends.some((friend) => friend.uid === response.data.uid)) {
                setSearchResult({ ...response.data, relation: 'friend' });
                setInviteMessage(`${response.data.first_name} is already in your circle.`);
                return;
            }
            setSearchResult(response.data);
        } catch (error) {
            setInviteError(error.response?.data?.error || 'No account uses that email.');
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async () => {
        if (!searchResult) return;
        try {
            await apiClient.post('/friends/request', { requestee_uid: searchResult.uid });
            setInviteMessage(`Request sent to ${searchResult.first_name} ${searchResult.last_name}.`);
            setSearchResult({ ...searchResult, relation: 'outgoing' });
            await loadFriends();
        } catch (error) {
            const relation = error.response?.data?.relation;
            if (relation === 'friend') {
                setSearchResult({ ...searchResult, relation: 'friend' });
                setInviteMessage(`${searchResult.first_name} is already in your circle.`);
                return;
            }
            if (relation === 'outgoing' || relation === 'incoming') {
                setSearchResult({ ...searchResult, relation });
            }
            setInviteError(error.response?.data?.error || 'Could not send that request.');
        }
    };

    const handleAcceptRequest = async (requestId) => {
        await apiClient.put(`/friends/request/${requestId}/accept`);
        await loadFriends();
    };

    const handleRejectRequest = async (requestId) => {
        await apiClient.put(`/friends/request/${requestId}/reject`);
        setIncomingRequests((current) => current.filter((request) => request.request_id !== requestId));
    };

    const handleCancelRequest = async (requesteeUid) => {
        await apiClient.delete('/friends/request/cancel', {
            data: { requester_uid: currentUser.uid, requestee_uid: requesteeUid },
        });
        setOutgoingRequests((current) => current.filter((request) => request.requestee_id !== requesteeUid));
    };

    const openTripInvite = async (friend) => {
        setTripFriend(friend);
        setTripMessage('');
        setTripError('');
        setMyTrips([]);
        try {
            const response = await apiClient.get('/itineraries');
            setMyTrips(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setTripError('Could not load your trips.');
        }
    };

    const sendTripInvite = async (itineraryId) => {
        setTripMessage('');
        setTripError('');
        try {
            await apiClient.post('/sharing/invite', { itineraryId, friendId: tripFriend.uid });
            setTripMessage(`Invitation sent to ${tripFriend.first_name} ${tripFriend.last_name} (${tripFriend.email}).`);
        } catch (error) {
            setTripError(error.response?.data?.error || 'Could not send that invite.');
        }
    };

    const handleRemoveFriend = async () => {
        if (!selectedFriend) return;
        await apiClient.post('/friends/remove', { friend_uid: selectedFriend.uid });
        setFriends((current) => current.filter((friend) => friend.uid !== selectedFriend.uid));
        setSelectedFriend(null);
        setConfirmRemove(false);
    };

    return (
        <div className="friends-page">
            <div className="friends-scenery" aria-hidden="true" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
                {sceneryImages.map((image, index) => (
                    <div
                        key={image}
                        className={`friends-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))}
            </div>

            <div className="friends-shell">
                <header className="friends-header">
                    <div>
                        <p className="friends-kicker">Your circle</p>
                        <h1>Friends</h1>
                    </div>
                    <div className="friends-tools">
                        <label className="friend-search">
                            Search existing friends
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Name or email already in your circle"
                                aria-label="Search existing friends by name or email"
                            />
                        </label>
                        <span className="friends-divider" aria-hidden="true" />
                        <button type="button" className="friends-add" onClick={openInvite}>+ Add Friend</button>
                    </div>
                </header>

                <div className="friends-metrics" role="tablist">
                    <div className="metric">
                        <b>{friends.length}</b>
                        <span>Total Friends</span>
                    </div>
                    <div className="metric">
                        <b>{activeCollaborators}</b>
                        <span>Active Trip Collaborators</span>
                    </div>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={friendFilter === 'all'}
                        className={friendFilter === 'all' ? 'is-active' : ''}
                        onClick={() => setFriendFilter('all')}
                    >
                        All Friends
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={friendFilter === 'active'}
                        className={friendFilter === 'active' ? 'is-active' : ''}
                        onClick={() => setFriendFilter('active')}
                    >
                        Active Collaborators
                    </button>
                </div>

                <div className="friends-board">
                    <div className="friends-main">
                    {filteredFriends.length === 0 ? (
                    <p className="friends-empty">
                        {friends.length === 0 ? 'Your circle is empty. Add a friend to start planning together.' : 'No friends match that search.'}
                    </p>
                    ) : (
                    <section className="friend-grid">
                        {filteredFriends.map((friend) => {
                            const activeTrips = (friend.trips || []).filter((trip) => trip.active);
                            const shown = (activeTrips.length ? activeTrips : friend.trips || []).slice(0, 2);
                            const extra = (friend.trips || []).length - shown.length;
                            return (
                                <article
                                    key={friend.uid}
                                    className="friend-card"
                                    onClick={() => { setSelectedFriend(friend); setConfirmRemove(false); }}
                                >
                                    <div className="friend-card-top">
                                        <Avatar person={friend} />
                                        <div className="friend-identity">
                                            <h2>{friend.first_name} {friend.last_name}</h2>
                                            <p>{friend.email}</p>
                                        </div>
                                    </div>
                                    <div className="trip-badges">
                                        {shown.length === 0 ? <span className="trip-badge muted">No shared trips</span> : shown.map((trip) => (
                                            <span key={trip.itinerary_id} className={`trip-badge ${trip.active ? 'active' : ''}`}>{trip.title}</span>
                                        ))}
                                        {extra > 0 ? <span className="trip-badge">+{extra}</span> : null}
                                    </div>
                                    <button
                                        type="button"
                                        className="invite-trip"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openTripInvite(friend);
                                        }}
                                    >
                                        Invite to Trip
                                    </button>
                                </article>
                            );
                        })}
                    </section>
                )}
                </div>
                    <aside className="friends-side">
                        <section className="side-panel">
                            <header className="side-panel-head">
                                <p>Waiting on you</p>
                                <h2>Pending Requests</h2>
                            </header>
                            {pendingCount === 0 ? (
                                <p className="panel-empty">No requests waiting.</p>
                            ) : (
                                <div className="pending-list">
                                    {outgoingRequests.map((request) => {
                                        const name = personName(request);
                                        return (
                                            <article key={request.request_id || request.requestee_id} className="pending-row">
                                                <Avatar person={request} />
                                                <div className="pending-copy">
                                                    {name ? <strong>{name}</strong> : null}
                                                    <span>{request.email}</span>
                                                </div>
                                                <button type="button" className="ghost" onClick={() => handleCancelRequest(request.requestee_id)}>Cancel</button>
                                            </article>
                                        );
                                    })}
                                    {incomingRequests.map((request) => {
                                        const name = personName(request);
                                        return (
                                            <article key={request.request_id} className="pending-row">
                                                <Avatar person={request} />
                                                <div className="pending-copy">
                                                    {name ? <strong>{name}</strong> : null}
                                                    <span>{request.email}</span>
                                                </div>
                                                <div className="request-actions">
                                                    <button type="button" onClick={() => handleAcceptRequest(request.request_id)}>Accept</button>
                                                    <button type="button" className="ghost" onClick={() => handleRejectRequest(request.request_id)}>Decline</button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="side-panel">
                            <header className="side-panel-head">
                                <p>Shared with friends</p>
                                <h2>Recently Shared Itineraries</h2>
                            </header>
                            {sharedActivity.length === 0 ? (
                                <p className="panel-empty">Shared trips will show up here once you plan with a friend.</p>
                            ) : (
                                <>
                                    <ul className="activity-list">
                                        {recentItineraries.map((trip) => (
                                            <SharedTripItem key={trip.itinerary_id} trip={trip} />
                                        ))}
                                    </ul>
                                    {sharedActivity.length > 3 ? (
                                        <button type="button" className="view-more" onClick={() => setItinerariesOpen(true)}>
                                            View More
                                        </button>
                                    ) : null}
                                </>
                            )}
                        </section>
                    </aside>
                </div>
            </div>

            {inviteOpen ? (
                <div className="friends-modal" onClick={() => setInviteOpen(false)}>
                    <div className="friends-modal-card" onClick={(event) => event.stopPropagation()}>
                        <header className="modal-head">
                            <h2>Add Friend</h2>
                            <button type="button" className="modal-close" onClick={() => setInviteOpen(false)} aria-label="Close">×</button>
                        </header>
                        <form onSubmit={handleSearch}>
                            <label>
                                Email
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        setSearchResult(null);
                                        setInviteMessage('');
                                        setInviteError('');
                                    }}
                                    onBlur={() => setEmailTouched(true)}
                                    placeholder="name@email.com"
                                    autoFocus
                                />
                            </label>
                            {emailTouched && email && !emailValid ? <p className="invite-error">Enter a valid email address.</p> : null}
                            {inviteError ? <p className="invite-error">{inviteError}</p> : null}
                            {inviteMessage ? <p className="invite-success">{inviteMessage}</p> : null}
                            {searchResult && searchResult.relation !== 'self' ? (
                                <div className="invite-result">
                                    <Avatar person={searchResult} />
                                    <div>
                                        <strong>{searchResult.first_name} {searchResult.last_name}</strong>
                                        <span>{searchResult.email}</span>
                                    </div>
                                    {searchResult.relation === 'friend' || knownFriend ? (
                                        <em>Connected</em>
                                    ) : searchResult.relation === 'outgoing' ? (
                                        <em>Pending</em>
                                    ) : searchResult.relation === 'incoming' ? (
                                        <button type="button" onClick={() => {
                                            const incoming = incomingRequests.find((request) => request.requester_id === searchResult.uid);
                                            if (incoming) handleAcceptRequest(incoming.request_id);
                                        }}>Accept</button>
                                    ) : (
                                        <button type="button" onClick={handleSendRequest}>Send</button>
                                    )}
                                </div>
                            ) : null}
                            <button type="submit" className="friends-add wide">
                                {searching ? 'Looking up...' : 'Find'}
                            </button>
                        </form>
                    </div>
                </div>
            ) : null}

            {selectedFriend ? (
                <div className="friends-modal" onClick={() => setSelectedFriend(null)}>
                    <div className="friends-modal-card" onClick={(event) => event.stopPropagation()}>
                        <header className="modal-head">
                            <h2>Friend Profile</h2>
                            <button type="button" className="modal-close" onClick={() => setSelectedFriend(null)} aria-label="Close">×</button>
                        </header>
                        <div className="friend-detail">
                            <div className="friend-detail-head">
                                <Avatar person={selectedFriend} large />
                                <div>
                                    <h3>{selectedFriend.first_name} {selectedFriend.last_name}</h3>
                                    <p>{selectedFriend.email}</p>
                                </div>
                            </div>
                            <h4>Shared trips</h4>
                            <div className="trip-badges">
                                {selectedFriend.trips.length === 0 ? <span className="trip-badge muted">No shared trips</span> : selectedFriend.trips.map((trip) => (
                                    <span key={trip.itinerary_id} className={`trip-badge ${trip.active ? 'active' : ''}`}>{trip.title}</span>
                                ))}
                            </div>
                        </div>
                        {confirmRemove ? (
                            <div className="remove-confirm">
                                <p>Remove {selectedFriend.first_name} from your friends?</p>
                                <div>
                                    <button type="button" className="ghost" onClick={() => setConfirmRemove(false)}>Keep</button>
                                    <button type="button" className="danger" onClick={handleRemoveFriend}>Remove</button>
                                </div>
                            </div>
                        ) : (
                            <button type="button" className="remove-friend" onClick={() => setConfirmRemove(true)}>Remove Friend</button>
                        )}
                    </div>
                </div>
            ) : null}

            {tripFriend ? (
                <div className="friends-modal" onClick={() => setTripFriend(null)}>
                    <div className="friends-modal-card" onClick={(event) => event.stopPropagation()}>
                        <header className="modal-head">
                            <h2>Invite to Trip</h2>
                            <button type="button" className="modal-close" onClick={() => setTripFriend(null)} aria-label="Close">×</button>
                        </header>
                        <div className="trip-picker">
                            <p>Invite {tripFriend.first_name} {tripFriend.last_name} to one of your itineraries, or start a new one.</p>
                            {tripError ? <p className="invite-error">{tripError}</p> : null}
                            {tripMessage ? <p className="invite-success">{tripMessage}</p> : null}
                            <div className="trip-picker-list">
                                {myTrips.length === 0 ? <p className="trip-empty">You do not have a trip to invite them to yet.</p> : myTrips.map((trip) => {
                                    const already = (tripFriend.trips || []).some((item) => item.itinerary_id === trip.itinerary_id);
                                    return (
                                        <button
                                            key={trip.itinerary_id}
                                            type="button"
                                            disabled={already}
                                            onClick={() => sendTripInvite(trip.itinerary_id)}
                                        >
                                            <strong>{trip.title}</strong>
                                            <span>{already ? 'Already on this trip' : 'Send invite'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                type="button"
                                className="friends-add wide create-trip"
                                onClick={() => navigate('/itineraries/create')}
                            >
                                Create a new itinerary
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {itinerariesOpen ? (
                <div className="friends-modal" onClick={() => setItinerariesOpen(false)}>
                    <div className="friends-modal-card" onClick={(event) => event.stopPropagation()}>
                        <header className="modal-head">
                            <h2>Recently Shared Itineraries</h2>
                            <button type="button" className="modal-close" onClick={() => setItinerariesOpen(false)} aria-label="Close">×</button>
                        </header>
                        <ul className="activity-list activity-modal-list">
                            {sharedActivity.map((trip) => (
                                <SharedTripItem key={trip.itinerary_id} trip={trip} />
                            ))}
                        </ul>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default FriendsPage;
