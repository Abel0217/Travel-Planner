import React, { useEffect, useRef, useState, useContext } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './css/HomePage.css';
import { AuthContext } from '../Contexts/AuthContext';
import apiClient from '../api/apiClient';
import { syncUnseenChatAlerts } from '../utils/chatAlerts';
import { sceneryImages, nextSceneryIndex, randomLocalSceneryIndex, useHeldCrossfade } from '../utils/scenery';

const UNSPLASH_ACCESS_KEY = 'OGBaaEYGlTkJhJgnTL9zm0AsrYP_r1HQ134Azhv9870';

const fetchPlaceImage = async (destination) => {
    if (!destination) return '';
    try {
        const query = `${String(destination).split(',')[0]} travel destination landscape`;
        const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`);
        const data = await response.json();
        return data.results?.[0]?.urls?.regular || '';
    } catch (error) {
        return '';
    }
};

const stackHomeNotes = (rows) => {
    const groups = [];
    const chatAt = new Map();
    rows.forEach((note) => {
        if (note.event_type === 'chat' && note.itinerary_id) {
            const key = String(note.itinerary_id);
            if (chatAt.has(key)) {
                const group = groups[chatAt.get(key)];
                group.count += 1;
                group.ids.push(note.id);
                group.read = group.read && note.read;
                return;
            }
            chatAt.set(key, groups.length);
            groups.push({ ...note, count: 1, ids: [note.id] });
            return;
        }
        groups.push({ ...note, count: 1, ids: [note.id] });
    });
    return groups.slice(0, 5).map((note) => {
        if (note.event_type === 'chat' && note.count > 1) {
            const trip = note.tripTitle || 'This Itinerary';
            return {
                ...note,
                title: `${note.count} Messages From ${trip} Chat`,
                body: 'Open The Trip Chat To Catch Up.',
            };
        }
        return note;
    });
};

const noteDestination = (note) => {
    if (note.event_type === 'chat' && note.itinerary_id) return `/itineraries/${note.itinerary_id}?tab=chat`;
    if (note.event_type === 'friend') return '/friends';
    if (note.category === 'expense' || note.event_type === 'expense') {
        return note.itinerary_id ? `/expenses/${note.itinerary_id}` : '/expenses';
    }
    // Activities and bookings open the trip overview. The old tab links are empty pages.
    if (note.itinerary_id && (note.category === 'booking' || note.category === 'itinerary')) {
        return `/itineraries/${note.itinerary_id}`;
    }
    if (note.action?.href) return note.action.href;
    if (note.itinerary_id) return `/itineraries/${note.itinerary_id}`;
    return '/notifications';
};

const noteShortcutLabel = (note) => {
    if (note.event_type === 'chat') return 'Open Chat';
    if (note.category === 'expense' || note.event_type === 'expense') return 'Open Expense';
    if (note.event_type === 'friend') return 'Open Friends';
    if (note.itinerary_id) return 'Open Itinerary';
    return 'Open';
};

const HomePage = () => {
    const { currentUser } = useContext(AuthContext);
    const [{ homeStart, cardStart }] = useState(() => {
        const home = randomLocalSceneryIndex();
        return { homeStart: home, cardStart: randomLocalSceneryIndex(home) };
    });
    const backgroundHold = useRef({ base: homeStart, incoming: null });
    const createHold = useRef({ base: cardStart, incoming: null });
    const background = useHeldCrossfade({
        initialIndex: homeStart,
        intervalMs: 20000,
        holdRef: backgroundHold,
        avoidRef: createHold,
    });
    const createFade = useHeldCrossfade({
        initialIndex: cardStart,
        intervalMs: 16000,
        holdRef: createHold,
        avoidRef: backgroundHold,
    });
    const [userName, setUserName] = useState({ firstName: '', lastName: '' });
    const [trips, setTrips] = useState([]);
    const [upcomingImage, setUpcomingImage] = useState('');
    const [notes, setNotes] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserName = async () => {
            try {
                if (!currentUser) return;
                const token = await getAuth().currentUser?.getIdToken();
                if (!token) return;
                const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/users/name`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const { first_name, last_name } = response.data;
                setUserName({ firstName: first_name, lastName: last_name });
            } catch (error) {
                console.error('Failed to fetch user name:', error);
            }
        };
        fetchUserName();
    }, [currentUser]);

    useEffect(() => {
        const loadTrips = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_SERVER_URL}/itineraries`, {
                    headers: { Authorization: `Bearer ${await getAuth().currentUser?.getIdToken()}` },
                });
                setTrips(response.data || []);
            } catch (error) {
                console.error('Failed to load trips for home:', error);
            }
        };
        if (currentUser) loadTrips();
    }, [currentUser]);

    useEffect(() => {
        const loadNotes = async () => {
            try {
                await syncUnseenChatAlerts();
                const response = await apiClient.get('/notifications');
                const fresh = stackHomeNotes((response.data?.notifications || []).filter((note) => {
                    if (note.hiddenFromAll) return false;
                    const when = new Date(note.created_at).getTime();
                    return Number.isFinite(when) && Date.now() - when <= 24 * 60 * 60 * 1000;
                }));
                setNotes(fresh);
            } catch (error) {
                setNotes([]);
            }
        };
        if (currentUser) loadNotes();
    }, [currentUser]);

    const openNote = (note) => {
        const ids = note.ids || [note.id];
        ids.forEach((id) => {
            apiClient.patch(`/notifications/${id}/read`).catch(() => {});
        });
        navigate(noteDestination(note));
    };

    const dismissNote = async (note) => {
        const previous = notes;
        setNotes((current) => current.filter((item) => item.id !== note.id));
        try {
            await Promise.all((note.ids || [note.id]).map((id) => apiClient.patch(`/notifications/${id}/dismiss`)));
        } catch (error) {
            setNotes(previous);
        }
    };

    const formatTripDate = (value) => {
        if (!value) return '';
        const raw = String(value).slice(0, 10);
        const [year, month, day] = raw.split('-').map(Number);
        if (!year || !month || !day) return raw;
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTripDates = (trip) => {
        const start = formatTripDate(trip?.start_date);
        const end = formatTripDate(trip?.end_date);
        if (start && end) return `${start} – ${end}`;
        return start || end || '';
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = trips
        .filter((trip) => trip.end_date && new Date(trip.end_date) >= today)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];

    useEffect(() => {
        if (upcoming?.destinations) {
            fetchPlaceImage(upcoming.destinations).then(setUpcomingImage);
        }
    }, [upcoming?.destinations]);

    return (
        <div className="homepage">
            <div
                className="homepage-background"
                style={{ backgroundImage: `url(${sceneryImages[background.base]})` }}
            >
                {sceneryImages.map((image, index) => (
                    <div
                        key={image}
                        className={`homepage-slide${index === background.base ? ' is-base' : ''}${index === background.incoming ? ' is-incoming' : ''}`}
                        style={{ backgroundImage: `url(${image})` }}
                    />
                ))}
            </div>

            <div className="welcome-box">
                <h1>
                    Welcome Back {userName.firstName} {userName.lastName}!
                </h1>
            </div>

            <div className="home-dashboard">
                <article
                    className="home-card home-create"
                    onClick={() => navigate('/itineraries/create')}
                    style={{ backgroundImage: `url(${sceneryImages[createFade.base]})` }}
                >
                    {sceneryImages.map((image, index) => (
                        <div
                            key={image}
                            className={`home-card-slide${index === createFade.base ? ' is-base' : ''}${index === createFade.incoming ? ' is-incoming' : ''}`}
                            style={{ backgroundImage: `url(${image})` }}
                        />
                    ))}
                    <div className="home-card-copy">
                        <h2>Create Itinerary</h2>
                        <p>Start a New Trip</p>
                    </div>
                </article>

                <div className="home-rail">
                    <div className="home-pair">
                        <article
                            className="home-card home-photo"
                            onClick={() => upcoming && navigate(`/itineraries/${upcoming.itinerary_id}`)}
                            style={{ backgroundImage: `url(${upcomingImage || sceneryImages[nextSceneryIndex(background.base, [createFade.base, background.base])]})` }}
                        >
                            <div className="home-card-copy">
                                <span className="home-kicker">Upcoming Trip</span>
                                <h2>{upcoming ? upcoming.title : 'No Upcoming Trip Yet'}</h2>
                                <p>{upcoming ? formatTripDates(upcoming) : 'Dates Will Appear Here'}</p>
                            </div>
                        </article>

                        <article className="home-card home-widget home-expenses" onClick={() => navigate('/expenses')}>
                            <div className="home-card-copy">
                                <h2>Expenses</h2>
                                <p>Split Costs With Your Group</p>
                            </div>
                        </article>
                    </div>

                    <article
                        className={`home-card home-widget home-notifications${notes.length === 0 ? ' is-empty' : ' has-notes'}`}
                        onClick={notes.length === 0 ? () => navigate('/notifications') : undefined}
                    >
                        <div className="home-card-copy">
                            <h2>Notifications</h2>
                            {notes.length === 0 ? (
                                <p>No New Notifications</p>
                            ) : (
                                <>
                                    <ul className="home-note-list">
                                        {notes.map((note) => (
                                            <li key={note.id} className={note.read ? '' : 'is-unread'}>
                                                <span className="home-note-dot" />
                                                <span className="home-note-copy">
                                                    <strong>{note.title}</strong>
                                                    <span className="home-note-body">{note.body}</span>
                                                </span>
                                                <span className="home-note-tools">
                                                    <button
                                                        type="button"
                                                        className="home-note-send"
                                                        aria-label={noteShortcutLabel(note)}
                                                        onClick={() => openNote(note)}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
                                                            <path d="M22 2L11 13" />
                                                            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="home-note-dismiss"
                                                        aria-label="Dismiss"
                                                        onClick={() => dismissNote(note)}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                            <path d="M6 6l12 12M18 6L6 18" />
                                                        </svg>
                                                    </button>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        className="home-note-go"
                                        onClick={() => navigate('/notifications')}
                                    >
                                        Go To Notifications
                                    </button>
                                </>
                            )}
                        </div>
                    </article>
                </div>
            </div>

            <button type="button" className="home-ai-widget" onClick={() => navigate('/travel-guide')} aria-label="Ask Leo">
                <span>ASK LEO</span>
                <em>Ask AI to start planning your trip</em>
            </button>
        </div>
    );
};

export default HomePage;
