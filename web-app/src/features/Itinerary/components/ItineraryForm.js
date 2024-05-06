import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';  // Update the path as necessary

const ItineraryForm = ({ onSave }) => {
    const [title, setTitle] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        apiClient.post('/itineraries', { title })
            .then(response => {
                onSave(response.data);
                setTitle('');  // Clear form after save
            })
            .catch(error => console.error('Failed to save itinerary:', error));
    };

    return (
        <form onSubmit={handleSubmit}>
            <label>
                Title:
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
            </label>
            <button type="submit">Save Itinerary</button>
        </form>
    );
};

export default ItineraryForm;
