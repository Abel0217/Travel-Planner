const express = require('express');
const cors = require('cors');
const pool = require('./database/db'); 
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();

// Route imports
const itineraryRoutes = require('./routes/itineraryRoutes');
const dayRoutes = require('./routes/dayRoutes');
const activityRoutes = require('./routes/activityRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const flightRoutes = require('./routes/flightRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const transportRoutes = require('./routes/transportRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); 
const usersRoute = require('./routes/userRoutes'); 
const friendsRoutes = require('./routes/friendsRoutes'); 
const sharingRoutes = require('./routes/sharingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use(cors());
app.use(express.json());

// Itinerary routes
app.use('/itineraries', itineraryRoutes);

// Day routes
app.use('/days', dayRoutes);

// Activity related routes for specific itineraries
app.use('/itineraries/:itineraryId/activities', activityRoutes);

// Flight related routes for specific itineraries
app.use('/itineraries/:itineraryId/flights', flightRoutes);

// Hotel related routes for specific itineraries
app.use('/itineraries/:itineraryId/hotels', hotelRoutes);

// Restaurant related routes for specific itineraries
app.use('/itineraries/:itineraryId/restaurants', restaurantRoutes);

// Transport related routes for specific itineraries
app.use('/itineraries/:itineraryId/transport', transportRoutes);

// Notifications Related Routes
app.use('/notifications', notificationRoutes); 

// User Related Routes
app.use('/users', usersRoute);

// Friends Related Routes
app.use('/friends', friendsRoutes);

// Sharing Itinerary Routes
app.use('/sharing', sharingRoutes);

// Upload Related Routes
app.use('/upload', uploadRoutes);

// Expense Related Routes 
// Have NOT implemented it yet..
app.use('/itineraries/:itineraryId/expenses', expenseRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;