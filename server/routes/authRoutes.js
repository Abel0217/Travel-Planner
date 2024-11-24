const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken');

// After a user logs in or signs up, sync Firebase user with PostgreSQL
router.post('/sync', verifyToken, async (req, res) => {
    const { uid, email, first_name, last_name, date_of_birth } = req.body;

    try {
        // Check if user exists in PostgreSQL
        const existingUser = await db.fetchUserByUid(uid);
        
        if (!existingUser) {
            // If user does not exist, insert into PostgreSQL
            const newUser = await db.createUser({
                uid,
                email,
                first_name: first_name || '',
                last_name: last_name || '',
                date_of_birth: date_of_birth || null
            });
            res.status(201).json(newUser);
        } else {
            res.status(200).json(existingUser);
        }
    } catch (error) {
        console.error('Error syncing Firebase user with PostgreSQL:', error);
        res.status(500).json({ error: 'Failed to sync user' });
    }
});

module.exports = router;
