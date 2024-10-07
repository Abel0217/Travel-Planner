import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import './css/NavBar.css';
import logo from './css/Logo.PNG';
import defaultAvatar from './css/Avatar.jpg';

const NavBar = ({ openSignUp, openLogin, openItineraryModal }) => {
    const { currentUser } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showItineraryDropdown, setShowItineraryDropdown] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const itineraryDropdownRef = useRef(null);

    useEffect(() => {
        const checkIfClickedOutside = e => {
            if (showDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
            if (showItineraryDropdown && itineraryDropdownRef.current && !itineraryDropdownRef.current.contains(e.target)) {
                setShowItineraryDropdown(false);
            }
        };

        document.addEventListener("mousedown", checkIfClickedOutside);

        return () => {
            document.removeEventListener("mousedown", checkIfClickedOutside);
        };
    }, [showDropdown, showItineraryDropdown]);

    const handleSignOut = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    const toggleDropdown = (menu) => {
        if (menu === "profile") {
            setShowDropdown(!showDropdown);
            setShowItineraryDropdown(false);
        } else if (menu === "itinerary") {
            setShowItineraryDropdown(!showItineraryDropdown);
            setShowDropdown(false);
        }
    };

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-logo">
                <img src={logo} alt="Logo" className="logo-img" />
            </Link>
            <div className="navbar-links">
                {currentUser ? (
                    <>
                        <Link to="/" className="navbar-item">Home</Link>
                        <div className="navbar-item" onClick={() => toggleDropdown("itinerary")}>
                            Itineraries
                        </div>
                        {showItineraryDropdown && (
                            <div className="dropdown-menu itinerary-dropdown" ref={itineraryDropdownRef}>
                                <Link to="/itineraries/create" onClick={openItineraryModal}>Create Itinerary</Link>
                                <Link to="/itineraries" onClick={() => setShowItineraryDropdown(false)}>View Itineraries</Link>
                            </div>
                        )}
                        <div className="navbar-item profile-container" onClick={() => toggleDropdown("profile")}>
                            <img 
                                src={currentUser.photoURL || defaultAvatar} 
                                alt="Profile" 
                                className="profile-img"
                            />
                            {showDropdown && (
                                <div className="dropdown-menu" ref={dropdownRef}>
                                    <Link to="/profile" onClick={() => setShowDropdown(false)}>Your profile</Link>
                                    <button onClick={handleSignOut}>Log out</button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <button onClick={openLogin} className="navbar-item">Log in</button>
                        <button onClick={openSignUp} className="navbar-item-signup">Sign Up</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default NavBar;
