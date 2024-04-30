import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
  setPersistence, 
  browserLocalPersistence
} from "firebase/auth";
// import { getAnalytics } from "firebase/analytics"; // If you're not using Analytics, you can comment this out


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
// const analytics = getAnalytics(app); // If you're not using Analytics, you can comment this out

const auth = getAuth(app); 
// Set the persistence to LOCAL to keep the user logged in across sessions
setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');


// Here you can set custom parameters for Google, like forcing account selection.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// You can set custom parameters for Apple as well, like requested scopes.
appleProvider.addScope('email');
appleProvider.addScope('name');

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithApple = () => signInWithPopup(auth, appleProvider);

export { auth, googleProvider, appleProvider };