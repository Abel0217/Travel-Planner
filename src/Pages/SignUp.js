import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import './css/SignUp.css'; // Importing the new dedicated SignUp CSS file
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';

// Import images
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

function SignUp() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasSymbol: false,
    hasUpper: false,
  });

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

  const validatePassword = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUpper: /[A-Z]/.test(password),
    };
    setPasswordRequirements(requirements);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    // Password validation logic
    if (!Object.values(passwordRequirements).every(Boolean)) {
      setPasswordError('Password does not meet requirements.');
      return;
    }

    // Password mismatch validation
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    } else {
      setPasswordError(''); // Clear errors once matched
      setPasswordMatchError(false);
    }

    const auth = getAuth();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setPasswordError('Email already has an account. Please sign in.');
      } else {
        setPasswordError(error.message);
      }
    }
  };

  return (
    <div className="background-container">
      {/* Puzzle pieces */}
      <div className="puzzle-pieces" id="pieces1"></div>
      <div className="puzzle-pieces" id="pieces2"></div>
      <div className="puzzle-pieces" id="pieces3"></div>

      {/* Auth box with signup form */}
      <div className="auth-box">
        <h1>Sign Up and Start Planning Today!</h1>

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="name-fields">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="name-input"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="name-input"
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="password-fields">
            <div className="password-input-wrapper">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                  setShowPasswordRequirements(true); // Show requirements while typing
                }}
                onBlur={() => setShowPasswordRequirements(false)} // Hide when focus is lost
                className={passwordMatchError ? 'error-input' : ''}
              />
              {/* Display password requirements message */}
              {showPasswordRequirements && (
                <div className="password-requirements-popup">
                  <ul>
                    <li className={passwordRequirements.minLength ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordRequirements.minLength ? '✔' : '✖'} At least 8 characters
                    </li>
                    <li className={passwordRequirements.hasNumber ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordRequirements.hasNumber ? '✔' : '✖'} One number
                    </li>
                    <li className={passwordRequirements.hasSymbol ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordRequirements.hasSymbol ? '✔' : '✖'} One special character
                    </li>
                    <li className={passwordRequirements.hasUpper ? 'requirement-met' : 'requirement-unmet'}>
                      {passwordRequirements.hasUpper ? '✔' : '✖'} One uppercase letter
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <div className="password-input-wrapper">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={passwordMatchError ? 'error-input' : ''}
              />
            </div>
          </div>

          {/* Centralized error message */}
          {passwordError && <p className="password-error">{passwordError}</p>}

          <button
            type="submit"
            className="auth-button"
            onMouseEnter={() => setShowPasswordRequirements(false)} // Hide on hover over the button
          >
            Sign up
          </button>
        </form>

        <div className="divider"></div>

        <div className="social-signup">
          <button onClick={signInWithGoogle} className="auth-google-btn">
            <FontAwesomeIcon icon={faGoogle} /> Sign up with Google
          </button>
          <button onClick={signInWithApple} className="auth-apple-btn">
            <FontAwesomeIcon icon={faApple} /> Sign up with Apple
          </button>
        </div>

        <div className="auth-footer">
          Already have an account?{' '}
          <button className="login-button" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
