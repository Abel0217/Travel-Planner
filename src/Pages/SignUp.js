import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signOut, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import apiClient from '../api/apiClient'; 
import './css/SignUp.css'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';

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
  const [resendEmail, setResendEmail] = useState(''); 
  const [showResendDialog, setShowResendDialog] = useState(false); 
  const [resendMessage, setResendMessage] = useState(''); 
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [showEmailSentDialog, setShowEmailSentDialog] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasSymbol: false,
    hasUpper: false,
  });

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
  
    if (!Object.values(passwordRequirements).every(Boolean)) {
      setPasswordError('Password does not meet requirements.');
      return;
    }
  
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
  
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
      await sendEmailVerification(userCredential.user);
  
      await signOut(auth);
  
      setShowEmailSentDialog(true); 
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setPasswordError('Email already has an account. Please log in.');
      } else {
        setPasswordError(error.message);
      }
    }
  };  

  const handleResendVerification = async () => {
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, resendEmail, 'tempPassword');
  
      await sendEmailVerification(userCredential.user);
  
      await auth.signOut();
  
      setResendMessage(`Verification email has been sent to ${resendEmail}. Please check your inbox.`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setResendMessage('Verification email already sent. Please check your email.');
      } else {
        setResendMessage('Failed to send verification email. Please check the email address.');
        console.error('Error resending verification email:', error);
      }
    }
  };  
  
  return (
    <div className="background-container">
      <div className="puzzle-pieces" id="pieces1"></div>
      <div className="puzzle-pieces" id="pieces2"></div>
      <div className="puzzle-pieces" id="pieces3"></div>
  
      <div className="auth-box">
        <h1>Sign Up and Start Planning Today!</h1>
  
        <form onSubmit={handleSignUp} className="auth-form">
          {/* Form Inputs */}
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
          {/* Password Fields */}
          <div className="password-fields">
            <div className="password-input-wrapper">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                  setShowPasswordRequirements(true);
                }}
                onBlur={() => setShowPasswordRequirements(false)}
                className={passwordMatchError ? 'error-input' : ''}
              />
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
  
          {/* Errors */}
          {passwordError && <p className="password-error">{passwordError}</p>}
  
          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button"
            onMouseEnter={() => setShowPasswordRequirements(false)}
          >
            Sign up
          </button>
  
          {/* Resend Verification Button */}
          <button
            type="button"
            className="resend-verification-button"
            onClick={() => setShowResendDialog(true)}
          >
            Resend Verification Email
          </button>
        </form>
  
        <div className="divider"></div>
  
        {/* Social Signups */}
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
  
      {/* Resend Verification Popup */}
      <Dialog
        open={showResendDialog}
        onClose={() => setShowResendDialog(false)}
      >
        <DialogTitle style={{ textAlign: 'center' }}>Resend Verification Email</DialogTitle>
        <DialogContent style={{ textAlign: 'center' }}>
          {!resendMessage ? (
            <>
              <DialogContentText>
                Please enter your email address to resend the verification link.
              </DialogContentText>
              <input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '10px' }}
              />
            </>
          ) : (
            <DialogContentText>{resendMessage}</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {!resendMessage ? (
            <>
              <Button onClick={() => setShowResendDialog(false)} className="dialog-button">Cancel</Button>
              <Button onClick={handleResendVerification} className="dialog-button">Submit</Button>
            </>
          ) : (
            <Button onClick={() => setShowResendDialog(false)} className="dialog-button">Close</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Email Sent Dialog */}
      <Dialog
        open={showEmailSentDialog}
        onClose={() => setShowEmailSentDialog(false)}
      >
        <DialogTitle style={{ textAlign: 'center' }}>Email Sent</DialogTitle>
        <DialogContent style={{ textAlign: 'center' }}>
          <DialogContentText>
            A verification email has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions to verify your email.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowEmailSentDialog(false);
              navigate('/login');
            }}
            className="dialog-button"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );  

}

export default SignUp;
