export function friendlyAuthError(error) {
  const code = error?.code || '';

  switch (code) {
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'This Firebase API key is no longer valid. For local work, start the Auth emulator. For cloud login, paste a new web config from Firebase Console into web-app/.env and restart npm start.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'That email already has an account. Please log in.';
    case 'auth/weak-password':
      return 'Please choose a stronger password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Please allow pop-ups and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with that email already exists. Please log in with your email and password.';
    case 'auth/unauthorized-domain':
      return 'localhost is not an authorized domain in Firebase Authentication settings.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase. If you are using the local emulator, make sure it is running on port 9099.';
    default:
      return error?.message || 'Something went wrong while signing in.';
  }
}

export const skipEmailVerification =
  process.env.REACT_APP_SKIP_EMAIL_VERIFICATION === 'true' ||
  process.env.REACT_APP_FIREBASE_AUTH_EMULATOR === 'true';
