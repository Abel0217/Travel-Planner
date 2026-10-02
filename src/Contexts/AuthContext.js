import React, { useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '../api/apiClient'; 
import { mediaUrl } from '../utils/mediaUrl';

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
        const googleProvider = user.providerData?.find((provider) => provider.providerId === 'google.com');
        setCurrentUser({
          name: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL,
          googlePhotoURL: googleProvider?.photoURL || '',
        });

          try {
          const token = await user.getIdToken();
          await apiClient.post('/users/sync', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Error syncing user data:', error);
        }

        try {
          const profile = await apiClient.get('/users/profile');
          if (profile.data?.profile_picture) {
            setCurrentUser((prev) => (
              prev && prev.uid === user.uid
                ? { ...prev, photoURL: mediaUrl(profile.data.profile_picture) }
                : prev
            ));
          }
        } catch (profileError) {
          console.error('Could not load profile photo:', profileError);
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
    updateCurrentUser: (patch) => setCurrentUser((prev) => (prev ? { ...prev, ...patch } : prev)),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
