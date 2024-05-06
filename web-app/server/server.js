const express = require('express');
const cors = require('cors');
const db = require('./database/dbOperations');  // Ensure this path is correct

const app = express();

app.use(cors());
app.use(express.json());

// Fetch all itineraries
app.get('/itineraries', async (req, res) => {
  try {
    const itineraries = await db.fetchAllItineraries();
    res.json(itineraries);
  } catch (error) {
    console.error("Server error when fetching itineraries:", error.message);
    res.status(500).json({ error: 'Failed to retrieve itineraries', details: error.message });
  }
});

// Add a new itinerary
app.post('/itineraries', async (req, res) => {
  const { title, description, start_date, end_date, owner_id } = req.body;
  try {
    const newItinerary = await db.addItinerary(title, description, start_date, end_date, owner_id);
    res.status(201).json(newItinerary);
  } catch (error) {
    console.error("Server error when adding an itinerary:", error.message);
    res.status(500).json({ error: 'Failed to add itinerary', details: error.message });
  }
});

// Update an existing itinerary
app.put('/itineraries/:id', async (req, res) => {
  const { title, description, start_date, end_date, owner_id } = req.body;
  const { id } = req.params;
  try {
    const updatedItinerary = await db.updateItinerary(id, title, description, start_date, end_date, owner_id);
    res.json(updatedItinerary);
  } catch (error) {
    console.error("Server error when updating an itinerary:", error.message);
    res.status(500).json({ error: 'Failed to update itinerary', details: error.message });
  }
});

// Delete an itinerary
app.delete('/itineraries/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItinerary = await db.deleteItinerary(id);
    res.json(deletedItinerary);
  } catch (error) {
    console.error("Server error when deleting an itinerary:", error.message);
    res.status(500).json({ error: 'Failed to delete itinerary', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
