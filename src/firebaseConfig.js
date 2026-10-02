import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, setPersistence, browserLocalPersistence, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID,
  databaseURL: process.env.REACT_APP_DATABASE_URL || `https://${process.env.REACT_APP_PROJECT_ID}.firebaseio.com`
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

if (process.env.REACT_APP_FIREBASE_AUTH_EMULATOR === 'true' && !auth.emulatorConfig) {
  const emulatorHost = process.env.REACT_APP_FIREBASE_AUTH_EMULATOR_URL || 'http://127.0.0.1:9099';
  try {
    connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
  } catch (error) {
    // connectAuthEmulator throws if it was already connected during hot reload
    if (!String(error?.message || '').includes('already been called')) {
      console.warn('Firebase Auth emulator connection skipped:', error.message);
    }
  }
}

setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

googleProvider.setCustomParameters({ prompt: 'select_account' });

appleProvider.addScope('email');
appleProvider.addScope('name');

const db = getFirestore(app);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithApple = () => signInWithPopup(auth, appleProvider);

export { auth, googleProvider, appleProvider, db };
