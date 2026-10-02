const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('./firebaseAdmin');

const express = require('express');
const cors = require('cors');
const pool = require('./database/db');
const { ensureAiChatTables } = require('./database/ensureAiChatTables');
const { ensureExpenseTables } = require('./database/ensureExpenseTables');
const { ensureNotificationTables } = require('./database/ensureNotificationTables');
const { runScheduledTripMail } = require('./services/tripMail');
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
const notificationRoutes = require('./routes/notificationRoutes'); 
const usersRoute = require('./routes/userRoutes'); 
const friendsRoutes = require('./routes/friendsRoutes'); 
const sharingRoutes = require('./routes/sharingRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.use('/ai', aiChatRoutes);

app.use('/expenses', expenseRoutes);

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true, database: 'connected' });
    } catch (error) {
        res.status(503).json({ ok: false, database: 'disconnected', error: error.message });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await ensureAiChatTables();
        await ensureExpenseTables();
        await ensureNotificationTables();
        console.log('AI chat and expense tables are ready');
        runScheduledTripMail();
        setInterval(runScheduledTripMail, 30 * 60 * 1000);
    } catch (error) {
        console.warn('Could not ensure AI chat tables (is PostgreSQL running?):', error.message);
    }
});

module.exports = app;