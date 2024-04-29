// SignUp.js
import React, { useState } from 'react';
import { signInWithGoogle, signInWithApple } from '../firebaseConfig'; 
import './css/SignUp.css';

function SignUp({ isOpen, closeSignUp, switchToLogin }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = (e) => {
    e.preventDefault();
    // Implement your sign-up logic here
    closeSignUp();
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      closeSignUp();
    } catch (error) {
      console.error(error);
      // Optionally handle the error, like showing an error message to the user
    }
  };

    // Define handleAppleSignIn
    const handleAppleSignIn = async () => {
      try {
        await signInWithApple();
        closeSignUp();
      } catch (error) {
        console.error(error);
        // Optionally handle the error, like showing an error message to the user
      }
    };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={closeSignUp} className="close-modal">&times;</button>
        <h1>Sign Up</h1>
        <button onClick={handleGoogleSignIn} className="google-signup-btn">Sign up with Google</button>
        <button onClick={handleAppleSignIn} className="apple-signup-btn">Sign up with Apple</button>
        <div className="divider-or">
          <span className="divider-line"></span>
          <span className="or-text">or</span>
          <span className="divider-line"></span>
        </div>
        <form onSubmit={handleSignUp}>
          <input 
            type="text" 
            placeholder="First Name" 
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Last Name" 
            value={lastName} 
            onChange={(e) => setLastName(e.target.value)} 
          />
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
          <button type="submit" className="submit-signup-btn">Sign up with email</button>
        </form>
        <div className="modal-footer">
          Already have an account? <button onClick={switchToLogin} className="switch-to-login">Log in</button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
