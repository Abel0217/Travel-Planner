import React from 'react';
import { Link } from 'react-router-dom';
import './css/NavBar.css';
import logo from './css/Logo.PNG';

const NavBar = ({ openSignUp, openLogin }) => {  // Include openLogin in the props
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src={logo} alt="Logo" className="logo-img" />
      </Link>
      <div className="navbar-links">
        <button onClick={openLogin} className="navbar-item">Log in</button>  
        <button onClick={openSignUp} className="navbar-item-signup">Sign Up</button>
      </div>
    </nav>
  );
};

export default NavBar;
