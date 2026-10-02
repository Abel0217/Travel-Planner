import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import apiClient from '../api/apiClient';
import AuthShell from '../Components/AuthShell';
import { friendlyAuthError, skipEmailVerification } from '../utils/authErrors';
import { socialSignIn } from '../utils/socialAuth';
import './css/Login.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginNotice, setLoginNotice] = useState('');
  const [socialBusy, setSocialBusy] = useState(false);
  const [showPasswordResetPopup, setShowPasswordResetPopup] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');
    const auth = getAuth();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      const user = userCredential.user;
      if (!skipEmailVerification && !user.emailVerified) {
        await signOut(auth);
        setLoginError('Your email is not verified. Please check your inbox and verify your email.');
        return;
      }

      try {
        await apiClient.post('/users/sync');
      } catch (syncError) {
        console.error('User sync failed after login:', syncError);
      }
      navigate('/');
    } catch (error) {
      setLoginError(friendlyAuthError(error));
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

  const handleSocialLogin = async (provider) => {
    if (socialBusy) return;
    setSocialBusy(true);
    setLoginError('');
    setLoginNotice('');
    const result = await socialSignIn(provider);
    setSocialBusy(false);
    if (result.ok) {
      navigate('/');
    } else if (result.notice) {
      setLoginNotice(result.message);
    } else {
      setLoginError(result.message);
    }
  };

  return (
    <AuthShell>
      <h1 className="auth-title">Welcome Back!</h1>
      <p className="auth-subtitle">Your Adventures Await</p>

      <div className="auth-social">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          className="auth-social-btn is-google"
          disabled={socialBusy}
        >
          <FontAwesomeIcon icon={faGoogle} /> Log In With Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin('apple')}
          className="auth-social-btn is-apple"
          disabled={socialBusy}
        >
          <FontAwesomeIcon icon={faApple} /> Log In With Apple
        </button>
      </div>

      <div className="auth-or">Or Use Your Email</div>

      <form onSubmit={handleLogin} className="auth-form">
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
        <label className="auth-field">
          <span>Password</span>
          <input
            className="auth-input"
            type="password"
            placeholder="Enter Your Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="auth-submit">Log In</button>
        <div className="auth-center">
          <button
            type="button"
            className="auth-link"
            onClick={() => setShowPasswordResetPopup(true)}
          >
            Forgot Your Password?
          </button>
        </div>
      </form>

      {loginError && <p className="auth-error">{loginError}</p>}
      {loginNotice && <p className="auth-notice">{loginNotice}</p>}

      <div className="auth-footer">
        Don't have an account yet?
        <button type="button" className="auth-link" onClick={() => navigate('/signup')}>Sign Up</button>
      </div>

      {/* Password Reset Popup */}
      <Dialog
        open={showPasswordResetPopup}
        onClose={() => setShowPasswordResetPopup(false)}
        PaperProps={{ className: 'auth-dialog-paper' }}
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
                className="auth-dialog-input"
                placeholder="Enter Your Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </>
          ) : (
            <DialogContentText>{resetMessage}</DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {!resetMessage ? (
            <>
              <Button onClick={() => setShowPasswordResetPopup(false)} className="dialog-button is-outline">Cancel</Button>
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
        PaperProps={{ className: 'auth-dialog-paper' }}
      >
        <DialogTitle>Email Sent</DialogTitle>
        <DialogContent style={{ textAlign: 'center' }}>
          <DialogContentText>
            Password reset email has been sent to <strong>{resetEmail}</strong>. Please check your inbox and follow the instructions.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSuccessPopup(false)} className="dialog-button">Close</Button>
        </DialogActions>
      </Dialog>
    </AuthShell>
  );
}

export default Login;
