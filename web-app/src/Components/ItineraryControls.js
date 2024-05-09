// src/Components/ItineraryControls.js
import React, { useState } from 'react';

const ItineraryControls = ({ onSearch, onSort, onFilter }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        onSearch(e.target.value);
    };

    const handleSortChange = (e) => {
        onSort(e.target.value);
    };

    const handleFilterChange = (e) => {
        onFilter(e.target.value);
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Search itineraries..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
            <select onChange={handleSortChange}>
                <option value="date">Date</option>
                <option value="title">Title</option>
            </select>
            <select onChange={handleFilterChange}>
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
            </select>
        </div>
    );
};

export default ItineraryControls;
