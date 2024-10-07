import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import './css/NavBar.css';
import logo from './css/Logo.PNG';
import defaultAvatar from './css/Avatar.jpg';

const NavBar = ({ openSignUp, openLogin }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false); // Track dropdown visibility
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Close dropdown when clicking outside of it
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSignOut = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error('Error signing out: ', error);
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
                        <Link to="/itineraries-View" className="navbar-item">My Itineraries</Link>

                        <div 
                            className="navbar-item profile-container" 
                            onClick={() => setShowDropdown(!showDropdown)}
                            ref={dropdownRef}
                        >
                            <img 
                                src={currentUser.photoURL || defaultAvatar} 
                                alt="Profile" 
                                className="profile-img"
                            />
                            {showDropdown && (
                                <div className="dropdown-menu">
                                    <Link to="/profile">Your Profile</Link>
                                    <Link to="/notifications">Notifications</Link> {/* New link for Reminders */}
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
