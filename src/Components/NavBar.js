import React, { useState, useRef, useEffect } from 'react';
import { Link, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import './css/NavBar.css';
import apiClient from '../api/apiClient';
import { mediaUrl } from '../utils/mediaUrl';
import logo from './css/Logo.PNG';
import defaultAvatar from './css/Avatar.jpg';

const NavBar = ({ openSignUp, openLogin }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const itineraryMatch = useMatch('/itineraries/:itineraryId');
    const rawItineraryId = itineraryMatch?.params?.itineraryId;
    const activeItineraryId = rawItineraryId && rawItineraryId !== 'create' ? rawItineraryId : '';
    const [showDropdown, setShowDropdown] = useState(false); 
    const [showSidebar, setShowSidebar] = useState(false); 
    const [showSubmenu, setShowSubmenu] = useState(''); 
    const [profilePicture, setProfilePicture] = useState(mediaUrl(currentUser?.photoURL) || defaultAvatar); 
    const dropdownRef = useRef(null);
    const sidebarRef = useRef(null);

    useEffect(() => {
        if (!currentUser?.uid) return undefined;
        let cancelled = false;

        const loadSavedPhoto = async () => {
            try {
                const response = await apiClient.get('/users/profile');
                const profileUrl = mediaUrl(response.data?.profile_picture);
                if (!cancelled && profileUrl) setProfilePicture(profileUrl);
            } catch (error) {
                console.error('Error fetching user profile picture:', error);
                if (!cancelled && currentUser.photoURL) {
                    setProfilePicture(mediaUrl(currentUser.photoURL));
                }
            }
        };

        loadSavedPhoto();

        const onUpdated = (event) => {
            if (event.detail?.avatarUrl) {
                setProfilePicture(mediaUrl(event.detail.avatarUrl));
            }
        };
        window.addEventListener('profilePictureUpdated', onUpdated);
        return () => {
            cancelled = true;
            window.removeEventListener('profilePictureUpdated', onUpdated);
        };
    }, [currentUser?.uid, currentUser?.photoURL]);    

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setShowSidebar(false); 
                setShowSubmenu(''); 
            }

            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false); 
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // A photo that fails to load (expired Google link, missing upload) falls back to the
    // Google account photo once, then to the default avatar, so no broken icon shows.
    const handleAvatarError = () => {
        const googlePhoto = mediaUrl(currentUser?.photoURL);
        if (googlePhoto && profilePicture !== googlePhoto && profilePicture !== defaultAvatar) {
            setProfilePicture(googlePhoto);
        } else if (profilePicture !== defaultAvatar) {
            setProfilePicture(defaultAvatar);
        }
    };

    const handleMenuClick = () => {
        setShowSidebar(!showSidebar);
        setShowSubmenu(''); 
    };

    const handleSignOut = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    const handleSidebarItemClick = () => {
        setShowSidebar(false); 
    };

    const handleMenuItemClick = (submenu) => {
        setShowSubmenu(submenu); 
    };

    const handleBackClick = () => {
        setShowSubmenu(''); 
    };

    return (
        <nav className="navbar">
            {currentUser ? (
                <>
                    <div className="menu-icon" onClick={handleMenuClick}>
                        &#9776; 
                    </div>
                    <Link to="/" className="navbar-logo-container">
                        <img src={logo} alt="Logo" className="logo-img" />
                    </Link>

                    <div 
                        className={`navbar-item profile-container${showDropdown ? ' is-open' : ''}`}
                        onClick={() => setShowDropdown(!showDropdown)}
                        ref={dropdownRef}
                    >
                        <img 
                            src={profilePicture} 
                            alt="Profile" 
                            className="profile-img"
                            referrerPolicy="no-referrer"
                            onError={handleAvatarError}
                        />

                        {showDropdown && (
                            <div className="dropdown-menu">
                                <Link to="/profile">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                                    </svg>
                                    Your Profile
                                </Link>
                                <button type="button" className="dropdown-logout" onClick={handleSignOut}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <path d="M16 17l5-5-5-5" />
                                        <path d="M21 12H9" />
                                    </svg>
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar for logged-in users */}
                    <div className={`sidebar ${showSidebar ? 'show-sidebar' : ''}`} ref={sidebarRef}>
                        {showSubmenu === '' ? (
                            <>
                                <Link to="/" onClick={handleSidebarItemClick}>Home</Link>
                                <div className="sidebar-item" onClick={() => handleMenuItemClick('itineraries')}>
                                    <span>Itinerary</span>
                                    <span className="sidebar-caret">▾</span>
                                </div>
                                <Link
                                    to={activeItineraryId ? `/expenses/${activeItineraryId}` : '/expenses'}
                                    onClick={handleSidebarItemClick}
                                >
                                    Expenses
                                </Link>
                                <Link to="/friends" onClick={handleSidebarItemClick}>Friends</Link>
                                <Link to="/travel-guide" onClick={handleSidebarItemClick}>Ask Leo Travel Guide</Link>
                                <Link to="/notifications" onClick={handleSidebarItemClick}>Notifications</Link>
                            </>
                        ) : null}

                        {showSubmenu === 'itineraries' && (
                            <>
                                <div className="sidebar-back" onClick={handleBackClick}>← Back</div>
                                <Link to="/itineraries/create" onClick={handleSidebarItemClick}>Create Itinerary</Link>
                                <Link to="/itineraries-view" onClick={handleSidebarItemClick}>View Itineraries</Link>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* New Navbar for not logged in */}
                    <Link to="/" className="navbar-logo-container navbar-logged-out-logo">
                        <img src={logo} alt="Logo" className="logo-img" />
                    </Link>
                    <div className="navbar-login-buttons">
                        <button onClick={() => navigate('/login')} className="navbar-item">Log In</button>
                        <button onClick={() => navigate('/signup')} className="navbar-item-signup">Sign Up</button>
                    </div>
                </>
            )}
        </nav>
    );
};

export default NavBar;