const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = require('../database/dbOperations'); 
const pool = require('../database/db');
const verifyToken = require('../FirebaseToken');

// Apply token verification middleware
router.use(verifyToken);

// Sync user data from Firebase to PostgreSQL
router.post('/sync', async (req, res) => {
    try {
        const { uid, email } = req.user; 
        console.log('User details from Firebase Token:', uid, email); 

        // Fetch user from Firebase to get additional info
        const userRecord = await admin.auth().getUser(uid);
        console.log('User record from Firebase:', userRecord); 

        const firstName = userRecord.displayName ? userRecord.displayName.split(' ')[0] : '';
        const lastName = userRecord.displayName ? userRecord.displayName.split(' ')[1] : '';
        const profilePicture = userRecord.photoURL || '';

        // Check if the user already exists in PostgreSQL
        const existingUser = await db.fetchUserByUid(uid);
        console.log('Existing user in DB:', existingUser); 

        if (!existingUser) {
            console.log('Creating a new user in the DB...');
            // Create a new user in PostgreSQL if they don't exist
            await db.createUser({
                uid,
                email,
                first_name: firstName,
                last_name: lastName,
                profile_picture: profilePicture,
            });
            console.log('User created successfully in DB'); 
            return res.status(201).json({ message: 'User synced successfully.' });
        } else {
            console.log('User already exists in DB'); 
            return res.status(200).json({ message: 'User already exists.' });
        }

    } catch (error) {
        console.error('Error syncing user:', error.message || error);
        return res.status(500).json({ error: 'Failed to sync user data.' });
    }
});

// Update user profile (name, DOB, profile picture)
router.put('/profile', async (req, res) => {
    try {
        const { uid } = req.user; 
        const { first_name, last_name } = req.body; 

        console.log('Incoming UID:', uid);
        console.log('Incoming Data:', req.body);

        // Update only the first_name and last_name for now
        const updatedUser = await db.updateUserDetails({
            uid,
            first_name,
            last_name,
            date_of_birth: null, 
            profile_picture: null,
        });

        if (updatedUser) {
            return res.status(200).json(updatedUser);
        } else {
            return res.status(404).json({ error: 'User not found.' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Fetch user profile
router.get('/profile', verifyToken, async (req, res) => {
    const { uid } = req.user;

    try {
        const userProfile = await db.fetchUserProfile(uid);
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

// Fetch first name and last name for the logged-in user
router.get('/name', verifyToken, async (req, res) => {
    const { uid } = req.user; // Extract UID from verified token
    try {
        // Query database to fetch user's first and last name
        const user = await db.fetchUserName(uid); 
        if (user) {
            res.status(200).json(user); // Respond with user details
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user name:', error);
        res.status(500).json({ error: 'Internal server error while fetching user name.' });
    }
});

router.put("/profile-picture", async (req, res) => {
    const userId = req.user?.uid; // Extract Firebase UID from middleware
    const { avatarUrl } = req.body; // Get the avatar URL from the request body

    if (!userId || !avatarUrl) {
        return res.status(400).json({ error: "User ID and avatar URL are required." });
    }

    try {
        // Update the database with the new avatar URL
        const query = `
            UPDATE core.users
            SET profile_picture = $1
            WHERE uid = $2
            RETURNING profile_picture;
        `;
        const values = [avatarUrl, userId];
        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({
            success: true,
            message: "Profile picture updated successfully.",
            profile_picture: rows[0].profile_picture,
        });
    } catch (error) {
        console.error("Error updating profile picture:", error);
        res.status(500).json({ error: "Failed to update profile picture." });
    }
});


module.exports = router;
