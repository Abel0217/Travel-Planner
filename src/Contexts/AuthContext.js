import React, { useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '../api/apiClient'; 

export const AuthContext = React.createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser({
          name: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL,
        });

        try {
          const token = await user.getIdToken();

          await apiClient.post('/users/sync', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          console.log('User synced successfully with PostgreSQL');
        } catch (error) {
          console.error('Error syncing user data:', error);
        }

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
