import React, { useState } from 'react';

const SearchFilter = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        onSearch(event.target.value);
    };

    return (
        <div>
            <input
                type="text"
                placeholder="Search itineraries..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
        </div>
    );
};

export default SearchFilter;
