const express = require('express');
const app = express();
const db = require('./database/db'); 
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Defining Routes 
app.get('/itineraries', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM core.itineraries');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
