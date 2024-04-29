import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD-1JxrE5TZD0Vh5nSASAFaGw1Wr2P-Q8c",
  authDomain: "travel-planner-20f6c.firebaseapp.com",
  projectId: "travel-planner-20f6c",
  storageBucket: "travel-planner-20f6c.appspot.com",
  messagingSenderId: "540755138239",
  appId: "1:540755138239:web:a511ebbf2d56e63a19d80a",
  measurementId: "G-Y3CSC9K5QT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const auth = getAuth(app); 
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// Here you can set custom parameters for Google, like forcing account selection.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// You can set custom parameters for Apple as well, like requested scopes.
appleProvider.addScope('email');
appleProvider.addScope('name');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithApple = () => signInWithPopup(auth, appleProvider);

export { auth, googleProvider, appleProvider }; // Export the auth object and providers
