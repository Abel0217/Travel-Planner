-- Itineraries table
CREATE TABLE core.itineraries (
    itinerary_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    owner_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table
CREATE TABLE core.activities (
    activity_id SERIAL PRIMARY KEY,
    itinerary_id INTEGER REFERENCES core.itineraries(itinerary_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    activity_date DATE,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE core.expenses (
    expense_id SERIAL PRIMARY KEY,
    itinerary_id INTEGER REFERENCES core.itineraries(itinerary_id),
    category VARCHAR(100),
    amount DECIMAL(10, 2),
    description TEXT,
    expense_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
