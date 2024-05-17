const express = require('express');
const cors = require('cors');
const app = express();

// Route imports
const itineraryRoutes = require('./routes/itineraryRoutes');
const dayRoutes = require('./routes/dayRoutes');
const activityRoutes = require('./routes/activityRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const flightRoutes = require('./routes/flightRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const transportRoutes = require('./routes/transportRoutes');

app.use(cors());
app.use(express.json());

// Itinerary related routes
app.use('/itineraries', itineraryRoutes);

// Day related routes
app.use('/days', dayRoutes);

// Activity related routes for specific days
app.use('/itineraries/:itineraryId/activities', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    if (req.params.dayId) { 
        req.dayId = req.params.dayId;
    }
    next();
}, activityRoutes);

// Expense related routes for specific itineraries
app.use('/itineraries/:itineraryId/expenses', expenseRoutes);

// Flight related routes for specific itineraries
app.use('/itineraries/:itineraryId/flights', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, flightRoutes);

// Hotel related routes for specific itineraries
app.use('/itineraries/:itineraryId/hotels', hotelRoutes);

// Restaurant related routes for specific days & itineraries
app.use('/itineraries/:itineraryId/restaurants', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    if (req.params.dayId) {  
        req.dayId = req.params.dayId;
    }
    next();
}, restaurantRoutes);

// Transport related routes for specific itineraries
app.use('/itineraries/:itineraryId/transport', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    if (req.params.dayId) {  // Ensure this line is in place to capture dayId if not already
        req.dayId = req.params.dayId;
    }
    next();
}, transportRoutes);


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


module.exports = app;
