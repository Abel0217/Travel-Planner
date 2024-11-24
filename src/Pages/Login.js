import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import apiClient from '../api/apiClient';
import './css/Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

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
  const [showPasswordResetPopup, setShowPasswordResetPopup] = useState(false); 
  const [resetEmail, setResetEmail] = useState(''); 
  const [resetMessage, setResetMessage] = useState(''); 
  const [showSuccessPopup, setShowSuccessPopup] = useState(false); 
  const navigate = useNavigate();

  const backgroundImages = [
    Beach, Hollywood, London, Louvre, Mountains, Paris, Rome,
    TajMahal, Toronto, Vegas, Venice,
  ];

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    document.querySelector('.background-container').style.backgroundImage = `url(${backgroundImages[randomIndex]})`;
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    const auth = getAuth();
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
  
      const user = userCredential.user;
      if (!user.emailVerified) {
        await signOut(auth); 
        setLoginError('Your email is not verified. Please check your inbox and verify your email.');
        return;
      }
  
      await apiClient.post('/users/sync');
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError('Incorrect email or password.');
      } else {
        setLoginError(error.message);
      }
    }
  };

  const resendVerificationEmail = async () => {
    const auth = getAuth();
  
    try {
      const user = auth.currentUser;
  
      if (user && !user.emailVerified) {
        await user.sendEmailVerification();
        setResetMessage('Verification email resent. Please check your inbox.');
        setShowSuccessPopup(true); 
      } else {
        setResetMessage('Your email is already verified.');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      setResetMessage('Failed to resend verification email. Please try again later.');
    }
  };  

  const handlePasswordReset = async () => {
    const auth = getAuth();
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetMessage(`Password reset email has been sent to ${resetEmail}. Please check your inbox.`);
      setShowPasswordResetPopup(false);
      setShowSuccessPopup(true); 
    } catch (error) {
      setResetMessage('Failed to send password reset email. Please check the email address.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      await apiClient.post('/users/sync');
      navigate('/');
    } catch (error) {
      setLoginError(error.message);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
      navigate('/');
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="background-container">
      <div className="puzzle-piece" id="piece1"></div>
      <div className="puzzle-piece" id="piece2"></div>
      <div className="puzzle-piece" id="piece3"></div>

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
          <div className="forgot-password">
            <button
              className="forgot-password-button"
              onClick={() => setShowPasswordResetPopup(true)}
            >
              Forgot Your Password?
            </button>
          </div>
        </form>

        {loginError && <p className="auth-error">{loginError}</p>}

        <div className="auth-footer">
          Don't have an account yet? <button className="signup-button" onClick={() => navigate('/signup')}>Sign up</button>
        </div>
      </div>

      {/* Password Reset Popup */}
      <Dialog
        open={showPasswordResetPopup}
        onClose={() => setShowPasswordResetPopup(false)}
      >
        <DialogTitle>Password Reset</DialogTitle>
        <DialogContent style={{ textAlign: 'center' }}> 
          {!resetMessage ? (
            <>
              <DialogContentText>
                Please enter your email address to receive a password reset link.
              </DialogContentText>
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '10px' }}
              />
            </>
          ) : (
            <DialogContentText>{resetMessage}</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {!resetMessage ? (
            <>
              <Button onClick={() => setShowPasswordResetPopup(false)} className="dialog-button">Cancel</Button>
              <Button onClick={handlePasswordReset} className="dialog-button">Submit</Button>
            </>
          ) : (
            <Button onClick={() => setShowPasswordResetPopup(false)} className="dialog-button">Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Follow-Up Success Popup */}
      <Dialog
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
      >
        <DialogTitle>Email Sent</DialogTitle> {/* Changed title */}
        <DialogContent style={{ textAlign: 'center' }}> {/* Centering content */}
          <DialogContentText>
            Password reset email has been sent to <strong>{resetEmail}</strong>. Please check your inbox and follow the instructions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuccessPopup(false)} className="dialog-button">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Login;
