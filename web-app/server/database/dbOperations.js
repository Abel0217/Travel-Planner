const pool = require('./db');  

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

const fetchDaysByItineraryId = async (itinerary_id) => {
    const query = `
        SELECT d.*, 
        json_agg(a.*) AS activities,
        json_agg(f.*) AS flights,
        json_agg(h.*) AS hotels,
        json_agg(r.*) AS restaurants,
        json_agg(t.*) AS transport
        FROM core.daily d
        LEFT JOIN core.activities a ON d.day_id = a.day_id
        LEFT JOIN core.flights f ON d.day_id = f.day_id
        LEFT JOIN core.hotels h ON d.day_id = h.day_id
        LEFT JOIN core.restaurant r ON d.day_id = r.day_id
        LEFT JOIN core.transport t ON d.day_id = t.day_id
        WHERE d.itinerary_id = $1
        GROUP BY d.day_id
        ORDER BY d.date;
    `;
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows;
};

// Add itinerary
const addItinerary = async (data) => {
    const { title, start_date, end_date } = data;
    const query = 'INSERT INTO core.itineraries (title, start_date, end_date) VALUES ($1, $2, $3) RETURNING *';
    const values = [title, start_date, end_date];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update itinerary
const updateItinerary = async (itinerary_id, data) => {
    const { title, description, start_date, end_date, visibility, status } = data;
    const query = 'UPDATE core.itineraries SET title = $1, description = $2, start_date = $3, end_date = $4, visibility = $5, status = $6 WHERE itinerary_id = $7 RETURNING *';
    const values = [title, description, start_date, end_date, visibility, status, itinerary_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete itinerary
const deleteItinerary = async (itinerary_id) => {
    const query = 'DELETE FROM core.itineraries WHERE itinerary_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [itinerary_id]);
    return rows[0];
};

const generateDaysForItinerary = async (itinerary_id, start_date, end_date) => {
    const query = `
        INSERT INTO core.daily (itinerary_id, date, day_id)
        SELECT $1, date, row_number() OVER (ORDER BY date)
        FROM generate_series($2::date, $3::date, '1 day'::interval) AS date;
    `;
    const values = [itinerary_id, start_date, end_date];
    await pool.query(query, values);
};

const fetchDayIdByDate = async (itinerary_id, date) => {
    const query = 'SELECT day_id FROM core.daily WHERE itinerary_id = $1 AND date = $2';
    const values = [itinerary_id, date];
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        throw new Error('Failed to fetch day ID');
    }
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

// Add New Day 
const addDay = async (data) => {
    const { itinerary_id, date, day_id } = data;
    const query = 'INSERT INTO core.daily (itinerary_id, date, day_id) VALUES ($1, $2, $3) RETURNING *';
    const values = [itinerary_id, date, day_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// update Day 
const updateDay = async (dayId, data) => {
    const { itinerary_id, date, summary, notes, weather } = data;
    const query = 'UPDATE core.daily SET itinerary_id = $1, date = $2, summary = $3, notes = $4, weather = $5 WHERE day_id = $6 RETURNING *';
    const values = [itinerary_id, date, summary, notes, weather, dayId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Day 
const deleteDay = async (dayId) => {
    const query = 'DELETE FROM core.daily WHERE day_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [dayId]);
    return rows[0];
};


// Activity Operations
const fetchAllActivities = async (itineraryId) => {
    const query = 'SELECT * FROM core.activities WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchActivitiesByDateRange = async (itineraryId, startDate, endDate) => {
    const query = `
        SELECT * FROM core.activities
        WHERE itinerary_id = $1 AND activity_date::date BETWEEN $2::date AND $3::date
        ORDER BY activity_date, start_time;
    `;
    const values = [itineraryId, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Activity 
const addActivity = async (itineraryId, title, description, location, activityDate, startTime, endTime, reservationNumber) => {
    const query = `
        INSERT INTO core.activities (itinerary_id, title, description, location, activity_date, start_time, end_time, reservation_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const values = [itineraryId, title, description, location, activityDate, startTime, endTime, reservationNumber];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Activity 
const updateActivity = async (activityId, itineraryId, title, description, location, activityDate, startTime, endTime, reservationNumber) => {
    const query = `
        UPDATE core.activities
        SET title = $2, description = $3, location = $4, activity_date = $5, start_time = $6, end_time = $7, reservation_number = $8
        WHERE activity_id = $1 AND itinerary_id = $9
        RETURNING *;
    `;
    const values = [activityId, title, description, location, activityDate, startTime, endTime, reservationNumber, itineraryId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Activity 
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

// Add Expense 
const addExpense = async (itinerary_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = 'INSERT INTO core.expenses (itinerary_id, category, amount, description, expense_date) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [itinerary_id, category, amount, description, expense_date];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Expense 
const updateExpense = async (expense_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = 'UPDATE core.expenses SET category = $1, amount = $2, description = $3, expense_date = $4 WHERE expense_id = $5 RETURNING *';
    const values = [category, amount, description, expense_date, expense_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Expense 
const deleteExpense = async (expense_id) => {
    const query = 'DELETE FROM core.expenses WHERE expense_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [expense_id]);
    return rows[0];
};


// Flight Operations
const fetchFlightsByItineraryId = async (itineraryId) => {
    const query = 'SELECT * FROM core.flights WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchFlightsByDateRange = async (itineraryId, startDate, endDate) => {
    const query = `
        SELECT * FROM core.flights 
        WHERE itinerary_id = $1 AND departure_time::date BETWEEN $2::date AND $3::date
        ORDER BY departure_time;
    `;
    const values = [itineraryId, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Flight
const addFlight = async (itineraryId, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference) => {
    const query = `
        INSERT INTO core.flights (itinerary_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const values = [itineraryId, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Flight
const updateFlight = async (flightId, itineraryId, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference) => {
    const query = `
        UPDATE core.flights
        SET airline = $2, flight_number = $3, departure_airport = $4, arrival_airport = $5, departure_time = $6, arrival_time = $7, booking_reference = $8
        WHERE flight_id = $1 AND itinerary_id = $9
        RETURNING *;
    `;
    const values = [flightId, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, itineraryId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Flight
const deleteFlight = async (flightId) => {
    const query = 'DELETE FROM core.flights WHERE flight_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [flightId]);
    return rows[0];
};


// Hotel Operations
const fetchHotelsByItineraryId = async (itineraryId) => {
    const query = 'SELECT * FROM core.hotels WHERE itinerary_id = $1';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchHotelsByDateRange = async (itineraryId, startDate, endDate) => {
    const query = `
        SELECT * FROM core.hotels
        WHERE itinerary_id = $1 AND check_in_date::date <= $2::date AND check_out_date::date >= $3::date
        ORDER BY check_in_date;
    `;
    const values = [itineraryId, endDate, startDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Hotel
const addHotel = async (itineraryId, hotel_name, check_in_date, check_out_date, address, booking_confirmation) => {
    const query = `
        INSERT INTO core.hotels (itinerary_id, hotel_name, check_in_date, check_out_date, address, booking_confirmation)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
    `;
    const values = [itineraryId, hotel_name, check_in_date, check_out_date, address, booking_confirmation];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Hotel
const updateHotel = async (hotelId, itineraryId, hotel_name, check_in_date, check_out_date, address, booking_confirmation) => {
    const query = `
        UPDATE core.hotels
        SET hotel_name = $2, check_in_date = $3, check_out_date = $4, address = $5, booking_confirmation = $6
        WHERE hotel_id = $1 AND itinerary_id = $7
        RETURNING *;
    `;
    const values = [hotelId, hotel_name, check_in_date, check_out_date, address, booking_confirmation, itineraryId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Hotel
const deleteHotel = async (hotelId) => {
    const query = 'DELETE FROM core.hotels WHERE hotel_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [hotelId]);
    return rows[0];
};

// Restaurant Operations
const fetchRestaurantsByItineraryId = async (itineraryId) => {
    const query = 'SELECT * FROM core.restaurant WHERE itinerary_id = $1 ORDER BY reservation_date, reservation_time';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchRestaurantsByDateRange = async (itineraryId, startDate, endDate) => {
    const query = `
        SELECT * FROM core.restaurant
        WHERE itinerary_id = $1 AND reservation_date::date BETWEEN $2::date AND $3::date
        ORDER BY reservation_date, reservation_time;
    `;
    const values = [itineraryId, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Restaurant
const addRestaurant = async (itineraryId, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation) => {
    const query = `
        INSERT INTO core.restaurant (itinerary_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const values = [itineraryId, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Restaurant
const updateRestaurant = async (reservationId, itineraryId, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation) => {
    const query = `
        UPDATE core.restaurant 
        SET restaurant_name = $2, reservation_date = $3, reservation_time = $4, guest_number = $5, address = $6, booking_confirmation = $7
        WHERE reservation_id = $1 AND itinerary_id = $8
        RETURNING *;
    `;
    const values = [reservationId, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation, itineraryId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Restaurant
const deleteRestaurant = async (reservationId) => {
    const query = 'DELETE FROM core.restaurant WHERE reservation_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [reservationId]);
    return rows[0];
};

// Transport Operations
const fetchTransportsByItineraryId = async (itineraryId) => {
    const query = 'SELECT * FROM core.transport WHERE itinerary_id = $1 ORDER BY pickup_time';
    const { rows } = await pool.query(query, [itineraryId]);
    return rows;
};

const fetchTransportsByDateRange = async (itineraryId, startDate, endDate) => {
    const query = `
        SELECT * FROM core.transport
        WHERE itinerary_id = $1 AND pickup_time::date BETWEEN $2::date AND $3::date
        ORDER BY pickup_time;
    `;
    const values = [itineraryId, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Transport
const addTransport = async (itineraryId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference) => {
    const query = `
        INSERT INTO core.transport (itinerary_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const values = [itineraryId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update Transport
const updateTransport = async (transportId, itineraryId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference) => {
    const query = `
        UPDATE core.transport 
        SET type = $2, pickup_time = $3, dropoff_time = $4, pickup_location = $5, dropoff_location = $6, booking_reference = $7
        WHERE transport_id = $1 AND itinerary_id = $8
        RETURNING *;
    `;
    const values = [transportId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference, itineraryId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Transport
const deleteTransport = async (transportId) => {
    const query = 'DELETE FROM core.transport WHERE transport_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [transportId]);
    return rows[0];
};


module.exports = {
    fetchAllItineraries,
    fetchItineraryById,
    fetchDaysByItineraryId,
    addItinerary,
    updateItinerary,
    deleteItinerary,
    generateDaysForItinerary,
    fetchDayIdByDate,
    fetchAllDays,
    fetchDayById,
    addDay,
    updateDay,
    deleteDay,
    fetchAllActivities,
    fetchActivitiesByDateRange,
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
    fetchRestaurantsByItineraryId,
    fetchRestaurantsByDateRange,
    addRestaurant,
    updateRestaurant,
    deleteRestaurant,
    fetchTransportsByItineraryId,
    fetchTransportsByDateRange,
    addTransport,
    updateTransport,
    deleteTransport
};
