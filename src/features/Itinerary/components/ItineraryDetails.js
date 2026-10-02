import React, { useState, useEffect } from 'react';
import { getAuth } from "firebase/auth"; 
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; 
import apiClient from '../../../api/apiClient';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import './css/ItineraryDetails.css';
import DailyOverview from './DailyOverview';
import FlightDetails from './FlightDetails';
import HotelDetails from './HotelDetails';
import ActivityDetails from './ActivityDetails';
import RestaurantDetails from './RestaurantDetails';
import TransportDetails from './TransportDetails';
import ItinerarySharing from './ItinerarySharing';
import MapComponent from './MapComponent';
import Notes from './Notes';
import Bookings from './Bookings';
import LiveChat from './LiveChat';
import Loading from '../Loading'; 
import Expense from '../../Expense';
import { openLeoForItinerary } from '../../../utils/itineraryContext';
import { geocodeQuery } from '../../../utils/tripGeo';
import { CATEGORIES, CATEGORY_ORDER } from '../../../utils/bookingTheme';
import BookingFormModal from './BookingFormModal';
import { Glyph } from './overview/glyphs';
import { dayKey, formatDay, daysBetween } from './overview/overviewModel';

const PICKER_TEXT = {
    activity: 'Tours, tickets and things to do.',
    restaurant: 'Tables, tastings and reservations.',
    hotel: 'Where you are staying each night.',
    flight: 'Tickets, times and airports.',
    transport: 'Trains, buses, taxis and transfers.',
};

const ItineraryDetails = () => {
    const { itineraryId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [itinerary, setItinerary] = useState({ title: '', start_date: '', end_date: '', destinations: '' });
    const [loading, setLoading] = useState(true);
    const [coordinates, setCoordinates] = useState(null);
    const [bookingsVersion, setBookingsVersion] = useState(0);
    const bumpBookings = () => setBookingsVersion((value) => value + 1);
    const [tabIndex, setTabIndex] = useState(() => (searchParams.get('tab') === 'chat' ? 5 : 0));
    const [formType, setFormType] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); 
    const [isHost, setIsHost] = useState(false);
    const [isGuest, setIsGuest] = useState(false);
    const [tabMenuOpen, setTabMenuOpen] = useState(false);
    
    const geocodeDestination = async (destination) => {
        if (!destination) {
            console.error('No destination provided');
            return;
        }

        try {
            console.log(`Geocoding destination: ${destination}`);
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                setCoordinates({ lat: location.lat, lng: location.lng });
            } else {
                const fallback = await geocodeQuery(destination);
                if (fallback) setCoordinates(fallback);
            }
        } catch (error) {
            const fallback = await geocodeQuery(destination);
            if (fallback) setCoordinates(fallback);
        }
    };

    const fetchItineraryDetails = async () => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            setCurrentUser(user);
    
            if (user) {
                const token = await user.getIdToken();
                const response = await apiClient.get(`/itineraries/${itineraryId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('API Response:', response.data);
                const itineraryData = response.data;
                setItinerary(itineraryData);
    
                setIsHost(itineraryData.owner_id === user.uid);
                setIsGuest(itineraryData.isShared);
                geocodeDestination(itineraryData.destinations);
            } else {
                console.error("User not logged in");
            }
        } catch (error) {
            console.error('Failed to fetch itinerary details', error);
        } finally {
            setLoading(false);
        }
    };    

    useEffect(() => {
        fetchItineraryDetails();
        if (!itineraryId) return undefined;

        const docRef = doc(db, 'itineraries', itineraryId);
        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const itineraryData = snapshot.data();
                setItinerary((prev) => ({ ...prev, ...itineraryData }));
                if (itineraryData.destinations) {
                    geocodeDestination(itineraryData.destinations);
                }
            }
        });

        return () => unsubscribe();
    }, [itineraryId]);

    const openForm = (formType) => {
        setFormType(formType);
    };

    const closeForm = () => {
        setFormType(null);
    };

    useEffect(() => {
        if (currentUser && itinerary) {
            setIsHost(currentUser.uid === itinerary.owner_id);
            setIsGuest(itinerary.participants?.some(p => p.uid === currentUser.uid && p.role === 'guest'));
        }
    }, [itinerary, currentUser]);

    const leaveItinerary = async () => {
        try {
            await apiClient.post('/sharing/remove', { itineraryId, userId: currentUser.uid });
            alert('You have left the itinerary.');
        } catch (error) {
            console.error('Error leaving itinerary:', error);
        }
    };

    const editItinerary = () => {
        alert('Edit itinerary feature coming soon.');
    };

    const deleteItinerary = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}`);
            alert('Itinerary deleted.');
        } catch (error) {
            console.error('Error deleting itinerary:', error);
        }
    };

    const handleActivityAdded = (newActivity) => {
        console.log('New activity added:', newActivity);
        bumpBookings();
    };

    const handleHotelAdded = (newHotel) => {
        console.log('New hotel added:', newHotel);
        bumpBookings();
    };

    const handleFlightAdded = (newFlight) => {
        console.log('New flight added:', newFlight);
        bumpBookings();
    };

    const handleRestaurantAdded = (newRestaurant) => {
        console.log('New restaurant added:', newRestaurant);
        bumpBookings();
    };

    const handleTransportAdded = (newTransport) => {
        console.log('New transport added:', newTransport);
        bumpBookings();
    };

    const tripStatus = (() => {
        const start = dayKey(itinerary.start_date);
        const end = dayKey(itinerary.end_date) || start;
        if (!start) return { label: 'Your Itinerary', range: '', length: '' };
        const short = { month: 'short', day: 'numeric' };
        const sameYear = start.slice(0, 4) === end.slice(0, 4);
        const range = start === end
            ? formatDay(start, { ...short, year: 'numeric' })
            : `${formatDay(start, sameYear ? short : { ...short, year: 'numeric' })} – ${formatDay(end, { ...short, year: 'numeric' })}`;
        const total = daysBetween(start, end) + 1;
        const length = `${total} ${total === 1 ? 'Day' : 'Days'}`;
        return { range, length };
    })();
    if (loading) return <Loading />; 
    if (!itinerary.title) return <div>No itinerary found.</div>;

    return (
        <div className="itinerary-details-page">
            <div className="itinerary-header">
                <h1>{itinerary.title}</h1>
                <span className="itin-rule" aria-hidden="true"><b /></span>
                <div className="itin-meta">
                    {itinerary.destinations ? (
                        <span className="itin-chip is-place">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
                                <circle cx="12" cy="9.5" r="2.5" />
                            </svg>
                            {itinerary.destinations}
                        </span>
                    ) : null}
                    {tripStatus.range ? (
                        <span className="itin-chip">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                                <path d="M8 3v4M16 3v4M3.5 10h17" />
                            </svg>
                            {tripStatus.range}
                            {tripStatus.length ? <b>{tripStatus.length}</b> : null}
                        </span>
                    ) : null}
                </div>
            </div>            {/* Conditional render for Host and Guest actions */}
            <div className="itinerary-actions">
                {isGuest ? (
                    <button onClick={leaveItinerary}>Leave Itinerary</button>
                ) : null}
            </div>
            <Tabs
                className="itinerary-tabs"
                selectedIndex={tabIndex}
                onSelect={(index) => {
                    setTabIndex(index);
                    setFormType(null);
                    setTabMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            >
                <div className="itinerary-tab-dock">
                    <div className={`itinerary-menu-anchor ${tabMenuOpen ? 'open' : ''}`}>
                        <TabList>
                            <Tab>Overview</Tab>
                            <Tab>Bookings</Tab>
                            <Tab>My Bookings</Tab>
                            <Tab>Expenses</Tab>
                            <Tab>Notes</Tab>
                            <Tab>Live Chat</Tab>
                        </TabList>
                        <button
                            type="button"
                            className="itinerary-tab-orb"
                            onClick={() => setTabMenuOpen((open) => !open)}
                            aria-label="Toggle itinerary tabs"
                            aria-expanded={tabMenuOpen}
                        >
                            {tabMenuOpen ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                                    <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <button
                        type="button"
                        className="itinerary-tab-ask"
                        onClick={async () => {
                            try {
                                await openLeoForItinerary(apiClient, navigate, {
                                    itinerary_id: itineraryId,
                                    destinations: itinerary.destinations,
                                });
                            } catch (error) {
                                navigate('/travel-guide');
                            }
                        }}
                        aria-label="Ask Leo"
                    >
                        <span>ASK LEO</span>
                        <em>Ask AI to start planning your trip</em>
                    </button>
                </div>

                <TabPanel>
                    <DailyOverview
                        itineraryId={itineraryId}
                        destination={itinerary.destinations}
                        startDate={itinerary.start_date}
                        endDate={itinerary.end_date}
                        center={coordinates}
                    />
                </TabPanel>

                <TabPanel>
                    <div className="bookings-picker">
                        <header className="picker-head">
                            <h2>Add To Your Trip</h2>
                            <p>Pick what you are booking. We keep it short: only what is needed.</p>
                        </header>
                        <div className="picker-grid">
                            {CATEGORY_ORDER.map((type) => {
                                const category = CATEGORIES[type];
                                return (
                                    <button
                                        type="button"
                                        key={type}
                                        className="booking-card"
                                        style={{ '--cat': category.color, '--cat-tint': category.tint }}
                                        onClick={() => openForm(type)}
                                    >
                                        <span className="card-icon-wrap"><Glyph name={category.glyph} size={26} /></span>
                                        <h3>{category.plural}</h3>
                                        <p>{PICKER_TEXT[type]}</p>
                                        <span className="card-add"><Glyph name="plus" size={14} /> Add {category.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {formType ? (
                        <BookingFormModal
                            type={formType}
                            itineraryId={itineraryId}
                            startDate={itinerary.start_date}
                            endDate={itinerary.end_date}
                            onClose={closeForm}
                            onAdded={bumpBookings}
                        />
                    ) : null}
                </TabPanel>
                <TabPanel>
                    <Bookings itineraryId={itineraryId} onChange={bumpBookings} />
                </TabPanel>
                <TabPanel>
                    <Expense lockedItineraryId={itineraryId} />
                </TabPanel>
                <TabPanel>
                    <Notes itineraryId={itineraryId} />
                </TabPanel>
                <TabPanel>
                    <LiveChat itineraryId={itineraryId} active={tabIndex === 5} />
                </TabPanel>
                <TabPanel>
                    <ItinerarySharing 
                        itineraryId={itineraryId} 
                        currentUser={currentUser} 
                        isHost={isHost} 
                    />
                </TabPanel>
            </Tabs>
            {tabIndex === 1 || tabIndex === 2 ? (
                <section className="bookings-map">
                    <h2>Your Trip On The Map</h2>
                    {coordinates ? (
                        <MapComponent center={coordinates} itineraryId={itineraryId} destination={itinerary.destinations} startDate={itinerary.start_date} endDate={itinerary.end_date} refreshKey={bookingsVersion} />
                    ) : (
                        <div className="map-placeholder">Map will appear once the destination loads.</div>
                    )}
                </section>
            ) : null}        </div>
    );
};

export default ItineraryDetails;
