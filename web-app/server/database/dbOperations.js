const pool = require('./db');  // Ensure this is the correct path to your pool configuration

// Itinerary Operations
const fetchAllItineraries = async (owner_id = null) => {
    const query = owner_id ? 'SELECT * FROM core.itineraries WHERE owner_id = $1 ORDER BY created_at DESC' : 'SELECT * FROM core.itineraries ORDER BY created_at DESC';
    const values = owner_id ? [owner_id] : [];
    const { rows } = await pool.query(query, values);
    return rows;
};

const fetchItineraryById = async (itinerary_id) => {
    const query = 'SELECT * FROM core.itineraries WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows[0];
}

const addItinerary = async (data) => {
    const { owner_id, title, description, start_date, end_date, visibility, status } = data;
    const query = 'INSERT INTO core.itineraries (owner_id, title, description, start_date, end_date, visibility, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = [owner_id, title, description, start_date, end_date, visibility, status];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateItinerary = async (itinerary_id, data) => {
    const { title, description, start_date, end_date, visibility, status } = data;
    const query = 'UPDATE core.itineraries SET title = $1, description = $2, start_date = $3, end_date = $4, visibility = $5, status = $6 WHERE itinerary_id = $7 RETURNING *';
    const values = [title, description, start_date, end_date, visibility, status, itinerary_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteItinerary = async (itinerary_id) => {
    const query = 'DELETE FROM core.itineraries WHERE itinerary_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows[0];
};


// Day Operations
const fetchAllDays = async (itinerary_id = null) => {
    const query = itinerary_id ? 'SELECT * FROM core.daily WHERE itinerary_id = $1 ORDER BY date' : 'SELECT * FROM core.daily ORDER BY date';
    const values = itinerary_id ? [itinerary_id] : [];
    const { rows } = await pool.query(query, values);
    return rows;
};

const fetchDayById = async (dayId) => {
    const query = 'SELECT * FROM core.daily WHERE day_id = $1';
    const { rows } = await pool.query(query, [dayId]);
    return rows[0];
};

// Add a new day entry
const addDay = async (data) => {
    const { itinerary_id, date, summary, notes, weather } = data;
    const query = 'INSERT INTO core.daily (itinerary_id, date, summary, notes, weather) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [itinerary_id, date, summary, notes, weather];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update a day entry
const updateDay = async (dayId, data) => {
    const { itinerary_id, date, summary, notes, weather } = data;
    const query = 'UPDATE core.daily SET itinerary_id = $1, date = $2, summary = $3, notes = $4, weather = $5 WHERE day_id = $6 RETURNING *';
    const values = [itinerary_id, date, summary, notes, weather, dayId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete a day entry
const deleteDay = async (dayId) => {
    const query = 'DELETE FROM core.daily WHERE day_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [dayId]);
    return rows[0];
};

// Activity Operations
const fetchAllActivities = async (itineraryId) => {
    const query = 'SELECT * FROM core.activities WHERE itinerary_id = $1 ORDER BY day_id, start_time';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

// Fetch activities by specific day in an itinerary
const fetchActivitiesById = async (itineraryId, dayId) => {
    const query = 'SELECT * FROM core.activities WHERE itinerary_id = $1 AND day_id = $2';
    const { rows } = await pool.query(query, [itineraryId, dayId]);
    return rows;
};

// Add a new activity
const addActivity = async (itineraryId, dayId, title, description, location, activityDate, startTime, endTime, createdAt, reservationNumber) => {
    const query = `
        INSERT INTO activities (itinerary_id, day_id, title, description, location, activity_date, start_time, end_time, created_at, reservation_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const values = [itineraryId, dayId, title, description, location, activityDate, startTime, endTime, createdAt, reservationNumber];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update an existing activity
const updateActivity = async (activityId, itineraryId, dayId, title, description, location, activityDate, startTime, endTime, createdAt, reservationNumber) => {
    const query = `
        UPDATE activities SET itinerary_id = $1, day_id = $2, title = $3, description = $4, location = $5, activity_date = $6, start_time = $7, end_time = $8, created_at = $9, reservation_number = $10
        WHERE activity_id = $11 RETURNING *;
    `;
    const values = [itineraryId, dayId, title, description, location, activityDate, startTime, endTime, createdAt, reservationNumber, activityId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete an activity
const deleteActivity = async (activityId) => {
    const query = 'DELETE FROM core.activities WHERE activity_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [activityId]);
    return rows[0];
};

// Expense Operations
const fetchExpensesByItineraryId = async (itinerary_id) => {
    const query = 'SELECT * FROM core.expenses WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows;
};

const addExpense = async (itinerary_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = 'INSERT INTO core.expenses (itinerary_id, category, amount, description, expense_date) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [itinerary_id, category, amount, description, expense_date];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateExpense = async (expense_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = 'UPDATE core.expenses SET category = $1, amount = $2, description = $3, expense_date = $4 WHERE expense_id = $5 RETURNING *';
    const values = [category, amount, description, expense_date, expense_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteExpense = async (expense_id) => {
    const query = 'DELETE FROM core.expenses WHERE expense_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [expense_id]);
    return rows[0];
};

// Flight Operations
const fetchFlightsByItineraryId = async (itinerary_id) => {
    console.log("Fetching flights for itinerary ID:", itinerary_id);
    const query = 'SELECT * FROM core.flights WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itinerary_id]);
    console.log("Query:", query);
    console.log("Query Parameters:", [itinerary_id]);
    console.log("Fetched flights:", rows);
    return rows;
};

const addFlight = async (itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference) => {
    const query = `
        INSERT INTO flights (itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateFlight = async (flightId, data) => {
    const { itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference } = data;
    const query = `
        UPDATE flights
        SET itinerary_id = $1, airline = $2, flight_number = $3, departure_airport = $4, arrival_airport = $5, departure_time = $6, arrival_time = $7, booking_reference = $8
        WHERE flight_id = $9
        RETURNING *;
    `;
    const values = [itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, flightId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteFlight = async (flight_id) => {
    const query = 'DELETE FROM core.flights WHERE flight_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [flight_id]);
    return rows[0];
};

// Hotel Operations
const fetchHotelsByItineraryId = async (itinerary_id) => {
    const query = 'SELECT * FROM core.hotels WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows;
};

const addHotel = async (itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address) => {
    const query = `
        INSERT INTO hotels (itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const values = [itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateHotel = async (hotelId, data) => {
    const { itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address } = data;
    const query = `
        UPDATE core.hotels
        SET itinerary_id = $1, hotel_name = $2, check_in_date = $3, check_out_date = $4, booking_reference = $5, address = $6
        WHERE hotel_id = $7
        RETURNING *;
    `;
    const values = [itinerary_id, hotel_name, check_in_date, check_out_date, booking_reference, address, hotelId];
    const { rows } = await pool.query(query, values);
    console.log("Hotel updated:", rows);
    return rows[0];
};

const deleteHotel = async (hotel_id) => {
    const query = 'DELETE FROM core.hotels WHERE hotel_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [hotel_id]);
    return rows[0];
};


// Restaurant Operations
const fetchAllRestaurants = async (itineraryId) => {
    const query = 'SELECT * FROM core.restaurant WHERE itinerary_id = $1 ORDER BY day_id, reservation_time';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchRestaurantsById = async (itineraryId, dayId) => {
    const query = 'SELECT * FROM core.restaurant WHERE itinerary_id = $1 AND day_id = $2';
    const { rows } = await pool.query(query, [itineraryId, dayId]);
    return rows;
};

const addRestaurant = async (itineraryId, dayId, restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation) => {
    const query = `
        INSERT INTO core.restaurant (itinerary_id, day_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const values = [itineraryId, dayId, restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateRestaurant = async (reservationId, itineraryId, dayId, restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation) => {
    const query = `
        UPDATE core.restaurant SET itinerary_id = $2, day_id = $3, restaurant_name = $4, reservation_date = $5, reservation_time = $6, guest_number = $7, address = $8, booking_confirmation = $9
        WHERE reservation_id = $1 RETURNING *;
    `;
    const values = [reservationId, itineraryId, dayId, restaurantName, reservationDate, reservationTime, guestNumber, address, bookingConfirmation];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteRestaurant = async (reservationId) => {
    const query = 'DELETE FROM core.restaurant WHERE reservation_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [reservationId]);
    return rows[0];
};


// Transport Operations
const fetchAllTransports = async (itineraryId) => {
    const query = 'SELECT * FROM core.transport WHERE itinerary_id = $1 ORDER BY day_id, pickup_time';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchTransportsById = async (itineraryId, dayId) => {
    const query = 'SELECT * FROM core.transport WHERE itinerary_id = $1 AND day_id = $2';
    const { rows } = await pool.query(query, [itineraryId, dayId]);
    return rows;
};

const addTransport = async (itineraryId, dayId, type, pickupTime, dropoffTime, pickupLocation, dropoffLocation, bookingReference) => {
    const query = `
        INSERT INTO core.transport (itinerary_id, day_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const values = [itineraryId, dayId, type, pickupTime, dropoffTime, pickupLocation, dropoffLocation, bookingReference];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const updateTransport = async (transportId, itineraryId, dayId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference) => {
    const query = `
        UPDATE transport SET type = $3, pickup_time = $4, dropoff_time = $5, pickup_location = $6, dropoff_location = $7, booking_reference = $8
        WHERE transport_id = $1 AND itinerary_id = $2 AND day_id = $9 RETURNING *;
    `;
    const values = [transportId, itineraryId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference, dayId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

const deleteTransport = async (transportId) => {
    const query = 'DELETE FROM transport WHERE transport_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [transportId]);
    return rows[0];
};

module.exports = {
    fetchAllItineraries,
    fetchItineraryById,
    addItinerary,
    updateItinerary,
    deleteItinerary,
    fetchAllDays,
    fetchDayById,
    addDay,
    updateDay,
    deleteDay,
    fetchAllActivities,
    fetchActivitiesById,
    addActivity,
    updateActivity,
    deleteActivity,
    fetchExpensesByItineraryId,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchFlightsByItineraryId,
    addFlight,
    updateFlight,
    deleteFlight,
    fetchHotelsByItineraryId,
    addHotel,
    updateHotel,
    deleteHotel,
    fetchAllRestaurants,
    fetchRestaurantsById,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    fetchAllTransports,
    fetchTransportsById,
    addTransport,
    updateTransport,
    deleteTransport
};
