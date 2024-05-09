import React, { useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

// Create and export a context for auth state
export const AuthContext = React.createContext();

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
        if (user) {
            // Ensure that you are capturing the right user attributes, such as displayName
            setCurrentUser({
                name: user.displayName, // Or whatever attribute holds the name
                email: user.email,
                uid: user.uid
            });
        } else {
            setCurrentUser(null);
        }
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
