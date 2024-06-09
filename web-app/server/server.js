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
const uploadRoutes = require('./routes/uploadRoutes');

app.use(cors());
app.use(express.json());

// Itinerary routes
app.use('/itineraries', itineraryRoutes);

// Day routes
app.use('/days', dayRoutes);

// Activity related routes for specific itineraries
app.use('/itineraries/:itineraryId/activities', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, activityRoutes);

// Flight related routes for specific itineraries
app.use('/itineraries/:itineraryId/flights', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, flightRoutes);

// Hotel related routes for specific itineraries
app.use('/itineraries/:itineraryId/hotels', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, hotelRoutes);

// Restaurant related routes for specific itineraries
app.use('/itineraries/:itineraryId/restaurants', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, restaurantRoutes);

// Transport related routes for specific itineraries
app.use('/itineraries/:itineraryId/transport', (req, res, next) => {
    req.itineraryId = req.params.itineraryId;
    next();
}, transportRoutes);


// Expense related routes for specific itineraries
// Have NOT implemented it yet..
app.use('/itineraries/:itineraryId/expenses', expenseRoutes);

// File upload route
app.use('/upload', uploadRoutes);


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


module.exports = app;
