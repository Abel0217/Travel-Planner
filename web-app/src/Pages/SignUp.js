import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'; // Ensure signOut is imported here
import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import './css/SignUp.css';

function SignUp({ isOpen, closeSignUp, switchToLogin, openLogin }) { 
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasSymbol: false,
    hasUpper: false,
  });

  const validatePassword = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUpper: /[A-Z]/.test(password),
    };
    setPasswordRequirements(requirements);
  };

  const getPasswordRequirementClass = (requirementMet) => {
    return requirementMet ? 'requirement-met' : 'requirement-unmet';
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (!Object.values(passwordRequirements).every(Boolean)) {
      setPasswordError("Password does not meet requirements.");
      return;
    }
    const auth = getAuth();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      closeSignUp();
      openLogin(); 
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setPasswordError("Email already has an account. Please sign in.");
      } else {
        setPasswordError(error.message);
      }
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
        <button onClick={signInWithGoogle} className="google-signup-btn">Sign up with Google</button>
        <button onClick={signInWithApple} className="apple-signup-btn">Sign up with Apple</button>
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
            onChange={(e) => {
              setPassword(e.target.value);
              validatePassword(e.target.value);
            }} 
          />
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
          />
          <button type="submit" className="submit-signup-btn">Sign up with email</button>
        </form>
        <div className="password-requirements">
          <ul>
            <li className={getPasswordRequirementClass(passwordRequirements.minLength)}>At least 8 characters</li>
            <li className={getPasswordRequirementClass(passwordRequirements.hasNumber)}>One number</li>
            <li className={getPasswordRequirementClass(passwordRequirements.hasSymbol)}>One special character</li>
            <li className={getPasswordRequirementClass(passwordRequirements.hasUpper)}>One uppercase letter</li>
          </ul>
        </div>
        {passwordError && <p className="password-error">{passwordError}</p>}
        <div className="modal-footer">
          Already have an account? <button onClick={switchToLogin} className="switch-to-login">Log in</button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
