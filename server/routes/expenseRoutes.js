const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');
const verifyToken = require('../FirebaseToken'); // Import the Firebase token middleware

// Apply the token verification middleware to all routes
router.use(verifyToken);

// Fetch all expenses for a specific itinerary
router.get('/:itineraryId', async (req, res) => {
    try {
        const owner_id = req.user.uid;  // Firebase UID
        const { itineraryId } = req.params;
        const expenses = await db.fetchExpensesByItineraryId(itineraryId, owner_id);
        res.json(expenses);
    } catch (error) {
        console.error('Failed to fetch expenses:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Add a new expense
router.post('/', async (req, res) => {
    const { itinerary_id, category, amount, description, expense_date } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const newExpense = await db.addExpense(itinerary_id, owner_id, { category, amount, description, expense_date });
        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Failed to add expense:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Update an existing expense
router.put('/:expenseId', async (req, res) => {
    const { category, amount, description, expense_date } = req.body;
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const updatedExpense = await db.updateExpense(req.params.expenseId, owner_id, { category, amount, description, expense_date });
        res.json(updatedExpense);
    } catch (error) {
        console.error('Failed to update expense:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Delete an expense
router.delete('/:expenseId', async (req, res) => {
    const owner_id = req.user.uid;  // Firebase UID
    try {
        const deletedExpense = await db.deleteExpense(req.params.expenseId, owner_id);
        res.json(deletedExpense);
    } catch (error) {
        console.error('Failed to delete expense:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

module.exports = router;