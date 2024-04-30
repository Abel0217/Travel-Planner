import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../Contexts/AuthContext';
import { getAuth, signOut } from 'firebase/auth';
import './css/NavBar.css';
import logo from './css/Logo.PNG';
import defaultAvatar from './css/Avatar.jpg'; // Make sure this path is correct

const NavBar = ({ openSignUp, openLogin }) => {
  const { currentUser } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // Optionally reset any auth-related state here if needed
      navigate('/login'); // Navigate to the login page after sign out
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src={logo} alt="Logo" className="logo-img" />
      </Link>
      <div className="navbar-links">
        {currentUser ? (
          <div className="navbar-item profile-container">
            <img 
              src={currentUser.photoURL || defaultAvatar} 
              alt="Profile" 
              className="profile-img"
              onClick={toggleDropdown}
            />
            {showDropdown && (
              <div className="dropdown-menu">
                <Link to="/profile" onClick={() => setShowDropdown(false)}>Your profile</Link>
                <button onClick={handleSignOut}>Log out</button>
              </div>
            )}
          </div>
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
