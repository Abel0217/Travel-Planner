const pool = require('./db');  

// Itinerary Operations
// Fetch all itineraries
const fetchAllItineraries = async (owner_id) => {
    const query = 'SELECT * FROM core.itineraries WHERE owner_id = $1 ORDER BY created_at DESC';
    console.log('Running query for owner:', owner_id); // Log the owner_id
    const { rows } = await pool.query(query, [owner_id]);
    console.log('Query result:', rows); // Log query result
    return rows;
};

// Fetch itineraries by ID
const fetchItineraryById = async (itinerary_id, owner_id) => {
    const query = 'SELECT * FROM core.itineraries WHERE itinerary_id = $1 AND owner_id = $2';
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows[0]; 
};


const fetchDaysByItineraryId = async (itinerary_id, owner_id) => {
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
        JOIN core.itineraries i ON i.itinerary_id = d.itinerary_id
        WHERE d.itinerary_id = $1 AND i.owner_id = $2
        GROUP BY d.day_id
        ORDER BY d.date;
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};


// Add itinerary
const addItinerary = async (data) => {
    const { owner_id, title, start_date, end_date, destinations } = data;

    // Insert the new itinerary into the database
    const insertItineraryQuery = `
        INSERT INTO core.itineraries (owner_id, title, start_date, end_date, destinations)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const itineraryValues = [owner_id, title, start_date, end_date, destinations];
    const { rows } = await pool.query(insertItineraryQuery, itineraryValues);
    const itinerary = rows[0];

    // Automatically assign host role to the itinerary creator
    const addHostRoleQuery = `
        INSERT INTO core.roles (itinerary_id, user_id, role)
        VALUES ($1, $2, 'host');
    `;
    await pool.query(addHostRoleQuery, [itinerary.itinerary_id, owner_id]);

    return itinerary;
};


// Update itinerary
const updateItinerary = async (itinerary_id, owner_id, data) => {
    const { title, start_date, end_date } = data;
    
    const query = `
        UPDATE core.itineraries 
        SET title = $1, start_date = $2, end_date = $3 
        WHERE itinerary_id = $4 AND owner_id = $5 
        RETURNING *;
    `;
    const values = [title, start_date, end_date, itinerary_id, owner_id];

    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error updating itinerary:', error);
        throw new Error('Failed to update itinerary');
    }
};

// Delete itinerary
const deleteItinerary = async (itinerary_id, owner_id) => {
    const query = 'DELETE FROM core.itineraries WHERE itinerary_id = $1 AND owner_id = $2 RETURNING *';
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
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
const fetchAllDays = async (itinerary_id, owner_id) => {
    const query = `
        SELECT * 
        FROM core.daily d
        JOIN core.itineraries i ON d.itinerary_id = i.itinerary_id
        WHERE d.itinerary_id = $1 AND i.owner_id = $2
        ORDER BY d.date
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

const fetchDayById = async (dayId, owner_id) => {
    const query = `
        SELECT d.* 
        FROM core.daily d
        JOIN core.itineraries i ON d.itinerary_id = i.itinerary_id
        WHERE d.day_id = $1 AND i.owner_id = $2
    `;
    const { rows } = await pool.query(query, [dayId, owner_id]);
    return rows[0];
};

// Add New Day 
const addDay = async (data) => {
    const { itinerary_id, date, day_id, owner_id } = data;
    const query = `
        INSERT INTO core.daily (itinerary_id, date, day_id)
        SELECT $1, $2, $3
        FROM core.itineraries 
        WHERE itinerary_id = $1 AND owner_id = $4 
        RETURNING *;
    `;
    const values = [itinerary_id, date, day_id, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// update Day 
const updateDay = async (dayId, owner_id, data) => {
    const { itinerary_id, date, summary, notes, weather } = data;
    const query = `
        UPDATE core.daily d
        SET itinerary_id = $1, date = $2, summary = $3, notes = $4, weather = $5
        FROM core.itineraries i
        WHERE d.day_id = $6 AND d.itinerary_id = i.itinerary_id AND i.owner_id = $7
        RETURNING d.*;
    `;
    const values = [itinerary_id, date, summary, notes, weather, dayId, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Day 
const deleteDay = async (dayId, owner_id) => {
    const query = `
        DELETE FROM core.daily d
        USING core.itineraries i
        WHERE d.day_id = $1 AND d.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING d.*;
    `;
    const { rows } = await pool.query(query, [dayId, owner_id]);
    return rows[0];
};

// Activity Operations
const fetchAllActivities = async (itinerary_id, owner_id) => {
    const query = `
        SELECT a.* 
        FROM core.activities a
        JOIN core.itineraries i ON a.itinerary_id = i.itinerary_id
        WHERE a.itinerary_id = $1 AND i.owner_id = $2;
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};


const fetchActivitiesByDateRange = async (itineraryId, owner_id, startDate, endDate) => {
    const query = `
        SELECT a.* 
        FROM core.activities a
        JOIN core.itineraries i ON a.itinerary_id = i.itinerary_id
        WHERE a.itinerary_id = $1 
        AND i.owner_id = $2
        AND a.activity_date::date BETWEEN $3::date AND $4::date
        ORDER BY a.activity_date, a.start_time;
    `;
    const values = [itineraryId, owner_id, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Activity 
const addActivity = async (itinerary_id, owner_id, title, description, location, activity_date, start_time, end_time, reservation_number) => {
    const query = `
        INSERT INTO core.activities (itinerary_id, owner_id, title, description, location, activity_date, start_time, end_time, reservation_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *;
    `;
    const values = [itinerary_id, owner_id, title, description, location, activity_date, start_time, end_time, reservation_number];
    const { rows } = await pool.query(query, values);
    return rows[0];
};


// Update Activity 
const updateActivity = async (activityId, itineraryId, owner_id, title, description, location, activityDate, startTime, endTime, reservationNumber) => {
    const query = `
        UPDATE core.activities a
        SET title = $2, description = $3, location = $4, activity_date = $5, start_time = $6, end_time = $7, reservation_number = $8
        FROM core.itineraries i
        WHERE a.activity_id = $1 AND a.itinerary_id = i.itinerary_id AND i.owner_id = $9
        RETURNING a.*;
    `;
    const values = [activityId, title, description, location, activityDate, startTime, endTime, reservationNumber, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Activity 
const deleteActivity = async (activityId, owner_id) => {
    const query = `
        DELETE FROM core.activities a
        USING core.itineraries i
        WHERE a.activity_id = $1 AND a.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING a.*;
    `;
    const { rows } = await pool.query(query, [activityId, owner_id]);
    return rows[0];
};

// Fetch expenses by itinerary ID and owner ID
const fetchExpensesByItineraryId = async (itinerary_id, owner_id) => {
    const query = `
        SELECT e.*
        FROM core.expenses e
        JOIN core.itineraries i ON e.itinerary_id = i.itinerary_id
        WHERE e.itinerary_id = $1 AND i.owner_id = $2
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

// Add Expense for a specific itinerary and owner
const addExpense = async (itinerary_id, owner_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = `
        INSERT INTO core.expenses (itinerary_id, category, amount, description, expense_date)
        SELECT $1, $2, $3, $4, $5
        FROM core.itineraries i
        WHERE i.itinerary_id = $1 AND i.owner_id = $6
        RETURNING *;
    `;
    const values = [itinerary_id, category, amount, description, expense_date, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update an expense for a specific owner
const updateExpense = async (expense_id, owner_id, data) => {
    const { category, amount, description, expense_date } = data;
    const query = `
        UPDATE core.expenses e
        SET category = $1, amount = $2, description = $3, expense_date = $4
        FROM core.itineraries i
        WHERE e.expense_id = $5 AND e.itinerary_id = i.itinerary_id AND i.owner_id = $6
        RETURNING e.*;
    `;
    const values = [category, amount, description, expense_date, expense_id, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete an expense by its ID and owner ID
const deleteExpense = async (expense_id, owner_id) => {
    const query = `
        DELETE FROM core.expenses e
        USING core.itineraries i
        WHERE e.expense_id = $1 AND e.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING e.*;
    `;
    const { rows } = await pool.query(query, [expense_id, owner_id]);
    return rows[0];
};


// Fetch all flights by itinerary ID and owner ID
const fetchFlightsByItineraryId = async (itinerary_id, owner_id) => {
    const query = `
        SELECT f.*
        FROM core.flights f
        JOIN core.itineraries i ON f.itinerary_id = i.itinerary_id
        WHERE f.itinerary_id = $1 AND i.owner_id = $2
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

// Fetch flights by date range
const fetchFlightsByDateRange = async (itineraryId, owner_id, startDate, endDate) => {
    const query = `
        SELECT f.*
        FROM core.flights f
        JOIN core.itineraries i ON f.itinerary_id = i.itinerary_id
        WHERE f.itinerary_id = $1 AND i.owner_id = $2
        AND f.departure_time::date BETWEEN $3::date AND $4::date
        ORDER BY f.departure_time;
    `;
    const values = [itineraryId, owner_id, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add Flight
const addFlight = async (itineraryId, owner_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number) => {
    const query = `
        INSERT INTO core.flights (itinerary_id, owner_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
    `;
    const values = [itineraryId, owner_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number];
    const { rows } = await pool.query(query, values);
    return rows[0];
};


// Update Flight
const updateFlight = async (flightId, itineraryId, owner_id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number) => {
    const query = `
        UPDATE core.flights f
        SET airline = $2, flight_number = $3, departure_airport = $4, arrival_airport = $5, departure_time = $6, arrival_time = $7, booking_reference = $8, passenger_name = $9, seat_number = $10
        FROM core.itineraries i
        WHERE f.flight_id = $1 AND f.itinerary_id = i.itinerary_id AND i.owner_id = $11
        RETURNING f.*;
    `;
    const values = [flightId, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, booking_reference, passenger_name, seat_number, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete Flight
const deleteFlight = async (flightId, owner_id) => {
    const query = `
        DELETE FROM core.flights f
        USING core.itineraries i
        WHERE f.flight_id = $1 AND f.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING f.*;
    `;
    const { rows } = await pool.query(query, [flightId, owner_id]);
    return rows[0];
};


// Fetch all hotels by itinerary ID and owner ID
const fetchHotelsByItineraryId = async (itinerary_id, owner_id) => {
    const query = `
        SELECT h.*
        FROM core.hotels h
        JOIN core.itineraries i ON h.itinerary_id = i.itinerary_id
        WHERE h.itinerary_id = $1 AND i.owner_id = $2;
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

// Fetch hotels by date range and owner ID
const fetchHotelsByDateRange = async (itineraryId, owner_id, startDate, endDate) => {
    const query = `
        SELECT h.*
        FROM core.hotels h
        JOIN core.itineraries i ON h.itinerary_id = i.itinerary_id
        WHERE h.itinerary_id = $1 AND i.owner_id = $2
        AND h.check_in_date::date <= $3::date AND h.check_out_date::date >= $4::date
        ORDER BY h.check_in_date;
    `;
    const values = [itineraryId, owner_id, endDate, startDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add a new hotel
const addHotel = async (itineraryId, owner_id, hotel_name, check_in_date, check_out_date, address, booking_confirmation) => {
    const query = `
        INSERT INTO core.hotels (itinerary_id, hotel_name, check_in_date, check_out_date, address, booking_confirmation)
        SELECT $1, $2, $3, $4, $5, $6
        FROM core.itineraries i
        WHERE i.itinerary_id = $1 AND i.owner_id = $7
        RETURNING *;
    `;
    const values = [itineraryId, hotel_name, check_in_date, check_out_date, address, booking_confirmation, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update an existing hotel
const updateHotel = async (hotelId, itineraryId, owner_id, hotel_name, check_in_date, check_out_date, address, booking_confirmation) => {
    const query = `
        UPDATE core.hotels h
        SET hotel_name = $2, check_in_date = $3, check_out_date = $4, address = $5, booking_confirmation = $6
        FROM core.itineraries i
        WHERE h.hotel_id = $1 AND h.itinerary_id = i.itinerary_id AND i.owner_id = $7
        RETURNING h.*;
    `;
    const values = [hotelId, hotel_name, check_in_date, check_out_date, address, booking_confirmation, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete a hotel
const deleteHotel = async (hotelId, owner_id) => {
    const query = `
        DELETE FROM core.hotels h
        USING core.itineraries i
        WHERE h.hotel_id = $1 AND h.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING h.*;
    `;
    const { rows } = await pool.query(query, [hotelId, owner_id]);
    return rows[0];
};

// Fetch all restaurants by itinerary ID and owner ID
const fetchRestaurantsByItineraryId = async (itinerary_id, owner_id) => {
    const query = `
        SELECT r.*
        FROM core.restaurant r
        JOIN core.itineraries i ON r.itinerary_id = i.itinerary_id
        WHERE r.itinerary_id = $1 AND i.owner_id = $2
        ORDER BY r.reservation_date, r.reservation_time;
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

// Fetch restaurants by date range and owner ID
const fetchRestaurantsByDateRange = async (itineraryId, owner_id, startDate, endDate) => {
    const query = `
        SELECT r.*
        FROM core.restaurant r
        JOIN core.itineraries i ON r.itinerary_id = i.itinerary_id
        WHERE r.itinerary_id = $1 AND i.owner_id = $2
        AND r.reservation_date::date BETWEEN $3::date AND $4::date
        ORDER BY r.reservation_date, r.reservation_time;
    `;
    const values = [itineraryId, owner_id, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add a new restaurant reservation
const addRestaurant = async (itinerary_id, owner_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation) => {
    const query = `
        INSERT INTO core.restaurant (itinerary_id, owner_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [itinerary_id, owner_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update an existing restaurant reservation
const updateRestaurant = async (reservationId, itineraryId, owner_id, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation) => {
    const query = `
        UPDATE core.restaurant r
        SET restaurant_name = $2, reservation_date = $3, reservation_time = $4, guest_number = $5, address = $6, booking_confirmation = $7
        FROM core.itineraries i
        WHERE r.reservation_id = $1 AND r.itinerary_id = i.itinerary_id AND i.owner_id = $8
        RETURNING r.*;
    `;
    const values = [reservationId, restaurant_name, reservation_date, reservation_time, guest_number, address, booking_confirmation, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete a restaurant reservation
const deleteRestaurant = async (reservationId, owner_id) => {
    const query = `
        DELETE FROM core.restaurant r
        USING core.itineraries i
        WHERE r.reservation_id = $1 AND r.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING r.*;
    `;
    const { rows } = await pool.query(query, [reservationId, owner_id]);
    return rows[0];
};


// Fetch all transports by itinerary ID and owner ID
const fetchTransportsByItineraryId = async (itinerary_id, owner_id) => {
    const query = `
        SELECT t.*
        FROM core.transport t
        JOIN core.itineraries i ON t.itinerary_id = i.itinerary_id
        WHERE t.itinerary_id = $1 AND i.owner_id = $2
        ORDER BY t.pickup_time;
    `;
    const { rows } = await pool.query(query, [itinerary_id, owner_id]);
    return rows;
};

// Fetch transports by date range
const fetchTransportsByDateRange = async (itineraryId, owner_id, startDate, endDate) => {
    const query = `
        SELECT t.*
        FROM core.transport t
        JOIN core.itineraries i ON t.itinerary_id = i.itinerary_id
        WHERE t.itinerary_id = $1 AND i.owner_id = $2
        AND t.pickup_time::date BETWEEN $3::date AND $4::date
        ORDER BY t.pickup_time;
    `;
    const values = [itineraryId, owner_id, startDate, endDate];
    const { rows } = await pool.query(query, values);
    return rows;
};

// Add a new transport
const addTransport = async (itinerary_id, owner_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference) => {
    const query = `
        INSERT INTO core.transport (itinerary_id, owner_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
    `;
    const values = [itinerary_id, owner_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update an existing transport
const updateTransport = async (transportId, itineraryId, owner_id, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference) => {
    const query = `
        UPDATE core.transport t
        SET type = $2, pickup_time = $3, dropoff_time = $4, pickup_location = $5, dropoff_location = $6, booking_reference = $7
        FROM core.itineraries i
        WHERE t.transport_id = $1 AND t.itinerary_id = i.itinerary_id AND i.owner_id = $8
        RETURNING t.*;
    `;
    const values = [transportId, type, pickup_time, dropoff_time, pickup_location, dropoff_location, booking_reference, owner_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Delete a transport
const deleteTransport = async (transportId, owner_id) => {
    const query = `
        DELETE FROM core.transport t
        USING core.itineraries i
        WHERE t.transport_id = $1 AND t.itinerary_id = i.itinerary_id AND i.owner_id = $2
        RETURNING t.*;
    `;
    const { rows } = await pool.query(query, [transportId, owner_id]);
    return rows[0];
};


// User Operations
// Add a new user to PostgreSQL
const createUser = async ({ uid, email, first_name, last_name, profile_picture }) => {
    const query = `
        INSERT INTO core.users (uid, email, first_name, last_name, profile_picture)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`;
    const values = [uid, email, first_name, last_name, profile_picture];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Update user details (name, date of birth, profile picture)
const updateUserDetails = async ({ uid, first_name, last_name }) => {
    const query = `
        UPDATE core.users
        SET first_name = COALESCE($1, first_name), 
            last_name = COALESCE($2, last_name)
        WHERE uid = $3
        RETURNING *;
    `;
    const values = [first_name, last_name, uid];

    console.log('Executing query with values:', values);
    try {
        const { rows } = await pool.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error executing query:', error);
        throw new Error('Failed to update user details.');
    }
};

// Fetch user details (for viewing profile)
const fetchUserProfile = async (uid) => {
    const query = `SELECT * FROM core.users WHERE uid = $1`;
    const { rows } = await pool.query(query, [uid]);
    return rows[0];
};

// Fetch user by UID
const fetchUserByUid = async (uid) => {
    const query = 'SELECT * FROM core.users WHERE uid = $1';
    const { rows } = await pool.query(query, [uid]);
    return rows[0];
};

// Fetch only first name and last name 
const fetchUserName = async (uid) => {
    const query = 'SELECT first_name, last_name FROM core.users WHERE uid = $1';
    const { rows } = await pool.query(query, [uid]);
    return rows[0];
};

const updateProfilePicture = async (userId, avatarUrl) => {
    try {
        const query = `
            UPDATE core.users
            SET profile_picture = $1
            WHERE uid = $2;
        `;
        const values = [avatarUrl, userId];
        await pool.query(query, values);

        console.log(`Profile picture updated for user ID: ${userId}`);
        return { success: true, message: "Profile picture updated successfully." };
    } catch (error) {
        console.error("Error updating profile picture:", error);
        throw error;
    }
};


// Friends Operations
// Fetch user by email (for searching a friend by email)
const getUserByEmail = async (email) => {
    const query = `SELECT * FROM core.users WHERE email = $1`; 
    const values = [email];

    try {
        const { rows } = await pool.query(query, values);
        return rows[0]; 
    } catch (error) {
        console.error('Database query failed:', error.message);
        throw new Error('Failed to search for user.');
    }
};

// Create a new friend request
const createFriendRequest = async (requester_id, requestee_id) => {
    const query = `
        INSERT INTO core.friend_requests (requester_id, requestee_id, status)
        VALUES ($1, $2, 'pending')
        RETURNING *;
    `;
    const values = [requester_id, requestee_id];

    try {
        const { rows } = await pool.query(query, values);
        console.log(`Friend request created from ${requester_id} to ${requestee_id}`);
        return rows[0];
    } catch (error) {
        console.error(`Database error while creating friend request from ${requester_id} to ${requestee_id}:`, error.message);
        throw new Error('Failed to create friend request.');
    }
};

// Cancel Friend Request
const cancelFriendRequest = async (requester_uid, requestee_uid) => {
    const query = `
        DELETE FROM core.friend_requests
        WHERE requester_id = $1 AND requestee_id = $2;
    `;
    const values = [requester_uid, requestee_uid];

    try {
        await pool.query(query, values);
    } catch (error) {
        console.error('Database error while canceling friend request:', error.message);
        throw new Error('Failed to cancel friend request.');
    }
};

// Update friend request status (Accept or Reject)
const updateFriendRequestStatus = async (request_id, status) => {
    const query = `
        UPDATE core.friend_requests
        SET status = $1
        WHERE request_id = $2
        RETURNING *;
    `;
    const values = [status, request_id];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Fetch friend requests for a user
const fetchFriendRequests = async (user_id, type) => {
    const column = type === 'sent' ? 'requester_id' : 'requestee_id';
    const query = `
        SELECT * FROM core.friend_requests
        WHERE ${column} = $1 AND status = 'pending';
    `;
    const { rows } = await pool.query(query, [user_id]);
    return rows;
};

// Create a friendship between two users
const createFriendship = async (uid_1, uid_2) => {
    const query = `
        INSERT INTO core.friends (uid_1, uid_2)
        VALUES ($1, $2), ($2, $1)  -- Make sure to create two-way friendships if needed
        RETURNING *;
    `;
    const values = [uid_1, uid_2];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Fetch a list of friends for a user
const fetchUserFriends = async (uid) => {
    const query = `
        SELECT u.uid, u.first_name, u.last_name, u.profile_picture
        FROM core.friends f
        JOIN core.users u ON (f.uid_2 = u.uid)
        WHERE f.uid_1 = $1
        UNION
        SELECT u.uid, u.first_name, u.last_name, u.profile_picture
        FROM core.friends f
        JOIN core.users u ON (f.uid_1 = u.uid)
        WHERE f.uid_2 = $1;
    `;
    const values = [uid];
    try {
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error('Error fetching user friends:', error);
        throw new Error('Failed to fetch user friends.');
    }
};

// Check if two users are already friends
const checkFriendshipExists = async (requester_uid, requestee_uid) => {
    const query = `
        SELECT 1 FROM core.friends
        WHERE (uid_1 = $1 AND uid_2 = $2) OR (uid_1 = $2 AND uid_2 = $1);
    `;
    const values = [requester_uid, requestee_uid];

    try {
        const { rowCount } = await pool.query(query, values);
        return rowCount > 0; 
    } catch (error) {
        console.error(`Database error in checkFriendshipExists for ${requester_uid} and ${requestee_uid}:`, error.message);
        throw new Error('Failed to check for existing friendship.');
    }
};

// Fetch incoming friend requests
const fetchIncomingRequests = async (uid) => {
    const query = `
        SELECT r.request_id, u.first_name, u.last_name, u.profile_picture, r.created_at
        FROM core.friend_requests r
        JOIN core.users u ON r.requester_id = u.uid
        WHERE r.requestee_id = $1 AND r.status = 'pending';
    `;
    const values = [uid];
    try {
        console.log(`Fetching incoming requests for UID: ${uid}`);
        const result = await pool.query(query, values);
        console.log(`Received ${result.rows.length} incoming requests.`);
        return result.rows;
    } catch (error) {
        console.error('Error fetching incoming friend requests:', error.message);
        throw new Error('Failed to fetch incoming friend requests.');
    }
};

// Fetch outgoing friend requests
const fetchOutgoingRequests = async (uid) => {
    const query = `
        SELECT r.request_id, r.requestee_id, u.profile_picture, u.first_name, u.last_name
        FROM core.friend_requests r
        JOIN core.users u ON r.requestee_id = u.uid
        WHERE r.requester_id = $1 AND r.status = 'pending';
    `;
    const values = [uid];
    try {
        const { rows } = await pool.query(query, values);
        return rows;
    } catch (error) {
        console.error('Error fetching outgoing friend requests:', error.message);
        throw new Error('Failed to fetch outgoing friend requests.');
    }
};

// Remove Friend From Friends List
const removeFriend = async (uid1, uid2) => {
    const query = `
        DELETE FROM core.friends
        WHERE (uid_1 = $1 AND uid_2 = $2) OR (uid_1 = $2 AND uid_2 = $1);
    `;
    const values = [uid1, uid2];

    try {
        await pool.query(query, values);
        console.log(`Friend relationship between ${uid1} and ${uid2} removed`);
    } catch (error) {
        console.error('Database error while removing friend:', error.message);
        throw new Error('Failed to remove friend.');
    }
};

// Invitation Operations
// Create an invitation entry
const createInvitation = async (itineraryId, inviterId, friendId) => {
    const query = `
        INSERT INTO core.invitations (itinerary_id, inviter_id, invitee_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *;
    `;
    const values = [itineraryId, inviterId, friendId];

    try {
        console.log(`Creating invitation for itineraryId ${itineraryId}, inviterId ${inviterId}, friendId ${friendId}`);
        const result = await pool.query(query, values);

        // Log the result of the invitation creation
        console.log('Invitation created successfully:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error('Error in createInvitation:', error.message, error.stack);
        throw new Error('Failed to create invitation.');
    }
};

// Fetch all pending invitations for a specific user
const fetchUserInvitations = async (userId) => {
    const query = `
        SELECT 
            inv.id AS invitation_id, 
            inv.itinerary_id, 
            it.title AS itinerary_title, 
            inv.status, 
            inv.invited_at,
            u.first_name AS inviter_first_name,
            u.last_name AS inviter_last_name,
            u.profile_picture AS inviter_profile_picture
        FROM core.invitations inv
        JOIN core.itineraries it ON inv.itinerary_id = it.itinerary_id
        JOIN core.users u ON u.uid = inv.inviter_id
        WHERE inv.invitee_id = $1 AND inv.status = 'pending';
    `;

    try {
        console.log(`Running fetchUserInvitations for userId: ${userId}`); // Log userId
        const { rows } = await pool.query(query, [userId]);
        
        // Log the fetched rows to verify the data returned from the query
        console.log(`Fetched invitations for user ${userId}:`, rows);

        return rows;
    } catch (error) {
        // Log the error with a detailed message and stack trace for better debugging
        console.error('Error executing fetchUserInvitations query:', error.message, error.stack);

        // Throw the error with a detailed message for further handling
        throw new Error(`Failed to fetch invitations for user ${userId}: ${error.message}`);
    }
};


// Accept an invitation and add the user as a guest in the itinerary
// Accept an invitation and add the user as a guest in the itinerary
const acceptInvitation = async (invitationId, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Find and accept the invitation
        const updateInvitationQuery = `
            UPDATE core.invitations
            SET status = 'accepted'
            WHERE id = $1 AND invitee_id = $2
            RETURNING itinerary_id;
        `;
        const { rows: invitationRows } = await client.query(updateInvitationQuery, [invitationId, userId]);

        const itineraryId = invitationRows[0]?.itinerary_id;
        if (!itineraryId) {
            throw new Error('Invitation not found or already accepted');
        }

        // Step 2: Add to shared table
        const addToSharedTableQuery = `
            INSERT INTO core.shared (itinerary_id, guest_id)
            VALUES ($1, $2)
            ON CONFLICT (itinerary_id, guest_id) DO NOTHING;
        `;
        await client.query(addToSharedTableQuery, [itineraryId, userId]);

        // Step 3: Delete the invitation entry
        const deleteInvitationQuery = `
            DELETE FROM core.invitations
            WHERE id = $1;
        `;
        await client.query(deleteInvitationQuery, [invitationId]);

        await client.query('COMMIT');
        return { message: 'Invitation accepted and invitation entry removed.' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw new Error('Failed to accept invitation');
    } finally {
        client.release();
    }
};

// Decline an invitation
// Decline an invitation by removing the invitation entry
const declineInvitation = async (invitationId, userId) => {
    const query = `
        DELETE FROM core.invitations
        WHERE id = $1 AND invitee_id = $2
        RETURNING *;
    `;

    try {
        const { rows } = await pool.query(query, [invitationId, userId]);
        if (rows.length === 0) {
            throw new Error('Invitation not found or already deleted');
        }
        return { message: 'Invitation declined and removed' };
    } catch (error) {
        throw new Error('Failed to decline invitation');
    }
};


// Fetch pending itinerary invitations for a user
const fetchPendingInvitations = async (userId) => {
    const query = `
        SELECT i.itinerary_id, i.title, inv.inviter_id, u.first_name AS inviter_first_name, u.last_name AS inviter_last_name
        FROM core.invitations inv
        JOIN core.itineraries i ON i.itinerary_id = inv.itinerary_id
        JOIN core.users u ON u.uid = inv.inviter_id
        WHERE inv.invitee_id = $1 AND inv.status = 'pending';
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
};

const fetchItineraryParticipants = async (itineraryId) => {
    const query = `
        SELECT 
            u.uid AS user_id, 
            u.first_name, 
            u.last_name, 
            u.profile_picture
        FROM core.shared s
        JOIN core.users u ON s.guest_id = u.uid
        WHERE s.itinerary_id = $1;
    `;

    try {
        const { rows } = await pool.query(query, [itineraryId]);
        return rows; // Array of participant details
    } catch (error) {
        console.error('Error fetching itinerary participants:', error);
        throw error;
    }
};

const fetchUserSharedItineraries = async (userId) => {
    console.log('Fetching shared itineraries for user_id:', userId);

    const query = `
        SELECT i.*, s.guest_id
        FROM core.shared s
        JOIN core.itineraries i ON s.itinerary_id = i.itinerary_id
        WHERE s.guest_id = $1;
    `;

    try {
        const { rows } = await pool.query(query, [userId]);
        console.log('Shared itineraries fetched successfully:', rows);
        return rows;
    } catch (error) {
        console.error('Error in fetchUserSharedItineraries:', error.message);
        throw error;
    }
};

const fetchAllUserItineraries = async (userId) => {
    const query = `
        SELECT it.*, 'owned' AS type
        FROM core.itineraries it
        WHERE it.owner_id = $1
        UNION
        SELECT it.*, 'shared' AS type
        FROM core.itineraries it
        JOIN core.shared s ON it.itinerary_id = s.itinerary_id
        WHERE s.guest_id = $1;
    `;

    try {
        const { rows } = await pool.query(query, [userId]);
        return rows;
    } catch (error) {
        console.error('Error fetching all user itineraries:', error.message);
        throw error;
    }
};


module.exports = {
    pool,
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
    deleteTransport,
    createUser,
    updateUserDetails,
    fetchUserProfile,
    fetchUserByUid,
    fetchUserName,
    updateProfilePicture,
    getUserByEmail,
    createFriendRequest,
    cancelFriendRequest,
    updateFriendRequestStatus,
    fetchFriendRequests,
    createFriendship,
    fetchUserFriends,
    checkFriendshipExists,
    fetchIncomingRequests,
    fetchOutgoingRequests,
    removeFriend,
    createInvitation,
    acceptInvitation,
    declineInvitation,
    fetchUserInvitations,
    fetchPendingInvitations,
    fetchItineraryParticipants,
    fetchUserSharedItineraries,
    fetchAllUserItineraries
};