import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signOut, sendEmailVerification, updateProfile } from 'firebase/auth';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import apiClient from '../api/apiClient';
import AuthShell from '../Components/AuthShell';
import { friendlyAuthError, skipEmailVerification } from '../utils/authErrors';
import { socialSignIn } from '../utils/socialAuth';
import './css/Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';

const REQUIREMENTS = [
  { key: 'minLength', label: '8+ Characters' },
  { key: 'hasUpper', label: 'Uppercase Letter' },
  { key: 'hasNumber', label: 'Number' },
  { key: 'hasSymbol', label: 'Symbol' },
];

function SignUp() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const [socialNotice, setSocialNotice] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showEmailSentDialog, setShowEmailSentDialog] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasSymbol: false,
    hasUpper: false,
  });

  const validatePassword = (value) => {
    setPasswordRequirements({
      minLength: value.length >= 8,
      hasNumber: /\d/.test(value),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      hasUpper: /[A-Z]/.test(value),
    });
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

    setPasswordError('');
    const auth = getAuth();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const displayName = `${firstName} ${lastName}`.trim();
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      if (skipEmailVerification) {
        try {
          await apiClient.post('/users/sync');
        } catch (syncError) {
          console.error('User sync failed after signup:', syncError);
        }
        navigate('/');
        return;
      }

      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setShowEmailSentDialog(true);
    } catch (error) {
      setPasswordError(friendlyAuthError(error));
    }
  };

  const handleSocialSignUp = async (provider) => {
    if (socialBusy) return;
    setSocialBusy(true);
    setPasswordError('');
    setSocialNotice('');
    const result = await socialSignIn(provider);
    setSocialBusy(false);
    if (result.ok) {
      navigate('/');
    } else if (result.notice) {
      setSocialNotice(result.message);
    } else {
      setPasswordError(result.message);
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

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <AuthShell wide>
      <h1 className="auth-title">Start Planning Today!</h1>
      <p className="auth-subtitle">Create Your Account To Build Your First Itinerary</p>

      <div className="auth-social">
        <button
          type="button"
          onClick={() => handleSocialSignUp('google')}
          className="auth-social-btn is-google"
          disabled={socialBusy}
        >
          <FontAwesomeIcon icon={faGoogle} /> Sign Up With Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialSignUp('apple')}
          className="auth-social-btn is-apple"
          disabled={socialBusy}
        >
          <FontAwesomeIcon icon={faApple} /> Sign Up With Apple
        </button>
      </div>

      <div className="auth-or">Or Use Your Email</div>

      <form onSubmit={handleSignUp} className="auth-form">
        <div className="auth-row">
          <label className="auth-field">
            <span>First Name</span>
            <input
              className="auth-input"
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Last Name</span>
            <input
              className="auth-input"
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
        </div>

        <label className="auth-field">
          <span>Email</span>
          <input
            className="auth-input"
            type="email"
            placeholder="Enter Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div className="auth-row">
          <label className="auth-field">
            <span>Password</span>
            <input
              className="auth-input"
              type="password"
              placeholder="Create Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePassword(e.target.value);
              }}
            />
          </label>
          <label className="auth-field">
            <span>Confirm Password</span>
            <input
              className={`auth-input${mismatch ? ' is-invalid' : ''}`}
              type="password"
              placeholder="Repeat Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        </div>

        <ul className="auth-reqs">
          {REQUIREMENTS.map((item) => (
            <li key={item.key} className={passwordRequirements[item.key] ? 'is-met' : ''}>
              {item.label}
            </li>
          ))}
        </ul>

        <button type="submit" className="auth-submit">Sign Up</button>

        <div className="auth-center">
          <button
            type="button"
            className="auth-link"
            onClick={() => setShowResendDialog(true)}
          >
            Resend Verification Email
          </button>
        </div>
      </form>

      {passwordError && <p className="auth-error">{passwordError}</p>}
      {socialNotice && <p className="auth-notice">{socialNotice}</p>}

      <div className="auth-footer">
        Already have an account?
        <button type="button" className="auth-link" onClick={() => navigate('/login')}>
          Log In
        </button>
      </div>

      {/* Resend Verification Popup */}
      <Dialog
        open={showResendDialog}
        onClose={() => setShowResendDialog(false)}
        PaperProps={{ className: 'auth-dialog-paper' }}
      >
        <DialogTitle>Resend Verification Email</DialogTitle>
        <DialogContent style={{ textAlign: 'center' }}>
          {!resendMessage ? (
            <>
              <DialogContentText>
                Please enter your email address to resend the verification link.
              </DialogContentText>
              <input
                type="email"
                className="auth-dialog-input"
                placeholder="Enter Your Email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
            </>
          ) : (
            <DialogContentText>{resendMessage}</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {!resendMessage ? (
            <>
              <Button onClick={() => setShowResendDialog(false)} className="dialog-button is-outline">Cancel</Button>
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
        PaperProps={{ className: 'auth-dialog-paper' }}
      >
        <DialogTitle>Email Sent</DialogTitle>
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
    </AuthShell>
  );
}

export default SignUp;
