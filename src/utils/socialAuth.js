import { signInWithGoogle, signInWithApple } from '../firebaseConfig';
import apiClient from '../api/apiClient';
import { friendlyAuthError } from './authErrors';

// Closing the sign-in window is a choice, not an error, so it stays quiet.
const QUIET_CODES = [
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/user-cancelled',
];

const APPLE_UNAVAILABLE = "Apple sign-in isn't available yet. Please use Google or your email.";

// Never throws. Returns { ok, message, notice } so the page can navigate or show one clean line.
// notice = true means "not an error, just not available" and gets the softer gold style.
export async function socialSignIn(provider) {
    try {
        if (provider === 'apple') {
            await signInWithApple();
        } else {
            await signInWithGoogle();
        }
    } catch (error) {
        if (QUIET_CODES.includes(error?.code)) {
            return { ok: false, message: '' };
        }
        if (provider === 'apple') {
            // Apple needs a paid developer account before Firebase can accept it.
            console.warn('Apple sign-in is not set up:', error?.code || error?.message);
            return { ok: false, message: APPLE_UNAVAILABLE, notice: true };
        }
        return { ok: false, message: friendlyAuthError(error) };
    }

    try {
        await apiClient.post('/users/sync');
    } catch (syncError) {
        console.warn('User sync skipped after sign-in:', syncError?.message);
    }
    return { ok: true, message: '' };
}
