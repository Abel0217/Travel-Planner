import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import './css/Login.css'; // Ensure this path is correct

function Login({ isOpen, closeLogin, switchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    const auth = getAuth();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeLogin(); // Close the modal upon successful login
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError("Incorrect email or password.");
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError("Too many failed login attempts. Please try again later.");
      } else {
        setLoginError(error.message);
      }
      console.error('Error during login:', error);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      closeLogin(); // Close the modal upon successful login
    } catch (error) {
      console.error('Error during Google login:', error);
      setLoginError(error.message);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
      closeLogin(); // Close the modal upon successful login
    } catch (error) {
      console.error('Error during Apple login:', error);
      setLoginError(error.message);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={closeLogin} className="close-modal">&times;</button>
        <h1>Log In</h1>
        <button onClick={handleGoogleLogin} className="google-login-btn">Log in with Google</button>
        <button onClick={handleAppleLogin} className="apple-login-btn">Log in with Apple</button>
        <div className="divider-or">
          <span className="divider-line"></span>
          <span className="or-text">or</span>
          <span className="divider-line"></span>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input"
          />
          <button type="submit" className="login-button">Log in</button>
        </form>
        {loginError && <p className="login-error">{loginError}</p>}
        <div className="modal-footer">
          Don't have an account yet? <button onClick={switchToSignUp} className="switch-to-signup">Sign up</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
