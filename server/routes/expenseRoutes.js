const express = require('express');
const router = express.Router();
const db = require('../database/dbOperations');

router.get('/:itineraryId', async (req, res) => {
    try {
        const expenses = await db.fetchExpensesByItineraryId(req.params.itineraryId);
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    const { itineraryId, category, amount, description, expense_date } = req.body;
    try {
        const newExpense = await db.addExpense(itineraryId, category, amount, description, expense_date);
        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:expenseId', async (req, res) => {
    const { category, amount, description, expense_date } = req.body;
    try {
        const updatedExpense = await db.updateExpense(req.params.expenseId, category, amount, description, expense_date);
        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:expenseId', async (req, res) => {
    try {
        const deletedExpense = await db.deleteExpense(req.params.expenseId);
        res.json(deletedExpense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
