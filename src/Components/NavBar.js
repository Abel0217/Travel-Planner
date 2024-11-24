import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import './css/NavBar.css';
import apiClient from '../api/apiClient';
import logo from './css/Logo.PNG';
import defaultAvatar from './css/Avatar.jpg';

const NavBar = ({ openSignUp, openLogin }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false); 
    const [showSidebar, setShowSidebar] = useState(false); 
    const [showSubmenu, setShowSubmenu] = useState(''); 
    const [profilePicture, setProfilePicture] = useState(defaultAvatar); 
    const dropdownRef = useRef(null);
    const sidebarRef = useRef(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await apiClient.get(`/users/profile`); 
                const profileUrl = response.data?.profile_picture || defaultAvatar; 
                setProfilePicture(profileUrl);
            } catch (error) {
                console.error('Error fetching user profile picture:', error);
                setProfilePicture(defaultAvatar); 
            }
        };
    
        if (currentUser) {
            fetchUserProfile();
        }
    }, [currentUser]);    

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
                        className="navbar-item profile-container" 
                        onClick={() => setShowDropdown(!showDropdown)}
                        ref={dropdownRef}
                    >
                        <img 
                            src={profilePicture} 
                            alt="Profile" 
                            className="profile-img"
                        />

                        {showDropdown && (
                            <div className="dropdown-menu">
                                <Link to="/profile">Your Profile</Link>
                                <button onClick={handleSignOut}>Log out</button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar for logged-in users */}
                    <div className={`sidebar ${showSidebar ? 'show-sidebar' : ''}`} ref={sidebarRef}>
                        {showSubmenu === '' ? (
                            <>
                                <Link to="/" onClick={handleSidebarItemClick}>Home</Link>
                                <div className="sidebar-item" onClick={() => handleMenuItemClick('itineraries')}>
                                    Itineraries
                                </div>
                                <Link to="/friends" onClick={handleSidebarItemClick}>Friends</Link>
                                <Link to="/expenses" onClick={handleSidebarItemClick}>Expenses</Link> 
                                <Link to="/notifications" onClick={handleSidebarItemClick}>Notifications</Link>
                            </>
                        ) : null}

                        {showSubmenu === 'itineraries' && (
                            <>
                                <div className="sidebar-back" onClick={handleBackClick}>← Back</div>
                                <Link to="/itineraries/create" onClick={handleSidebarItemClick}>Create Itinerary</Link>
                                <Link to="/itineraries-View" onClick={handleSidebarItemClick}>View Itineraries</Link>
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
                        <button onClick={() => navigate('/login')} className="navbar-item">Log in</button>
                        <button onClick={() => navigate('/signup')} className="navbar-item-signup">Sign Up</button>
                    </div>
                </>
            )}
        </nav>
    );
};

export default NavBar;