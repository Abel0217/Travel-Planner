import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Create a context for auth state
const AuthContext = React.createContext();

// Hook for child components to get the auth object ...
// ... and re-render when it changes.
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps your app and makes auth object ...
// ... available to any child component that calls `useAuth()`.
export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for changes on the authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      console.log("Auth state changed. User:", user);
      setCurrentUser(user);
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
