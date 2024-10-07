import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import './css/Login.css'; // Importing the new dedicated Login CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';

// Import images manually
import Beach from './css/Images/Beach.jpg';
import Hollywood from './css/Images/Hollywood.jpg';
import London from './css/Images/London.jpg';
import Louvre from './css/Images/Louvre.jpg';
import Mountains from './css/Images/Mountains.jpg';
import Paris from './css/Images/Paris.jpg';
import Rome from './css/Images/Rome.jpg';
import TajMahal from './css/Images/Taj Mahal.jpg';
import Toronto from './css/Images/Toronto.jpg';
import Vegas from './css/Images/Vegas.jpg';
import Venice from './css/Images/Venice.jpg';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  // List of background images
  const backgroundImages = [
    Beach,
    Hollywood,
    London,
    Louvre,
    Mountains,
    Paris,
    Rome,
    TajMahal,
    Toronto,
    Vegas,
    Venice,
  ];

  // Randomize background image on page load
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    document.querySelector('.background-container').style.backgroundImage = `url(${backgroundImages[randomIndex]})`;
  }, []);

  // Handle email/password login
  const handleLogin = async (event) => {
    event.preventDefault();
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // Redirect to homepage
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError('Incorrect email or password.');
      } else {
        setLoginError(error.message);
      }
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/'); // Redirect to homepage after Google sign-in
    } catch (error) {
      setLoginError(error.message);
    }
  };

  // Handle Apple login
  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
      navigate('/'); // Redirect to homepage after Apple sign-in
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="background-container">
      {/* Puzzle pieces */}
      <div className="puzzle-piece" id="piece1"></div>
      <div className="puzzle-piece" id="piece2"></div>
      <div className="puzzle-piece" id="piece3"></div>

      {/* Auth box with login form */}
      <div className="auth-box">
        <h1>Welcome Back! Your Adventures Await</h1>

        <div className="social-login">
          <button onClick={handleGoogleLogin} className="auth-google-btn">
            <FontAwesomeIcon icon={faGoogle} /> Log in with Google
          </button>
          <button onClick={handleAppleLogin} className="auth-apple-btn">
            <FontAwesomeIcon icon={faApple} /> Log in with Apple
          </button>
        </div>

        <div className="divider"></div>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="auth-button">Log in</button>
        </form>

        {loginError && <p className="auth-error">{loginError}</p>}

        <div className="auth-footer">
          Don't have an account yet? <button className="signup-button" onClick={() => navigate('/signup')}>Sign up</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
