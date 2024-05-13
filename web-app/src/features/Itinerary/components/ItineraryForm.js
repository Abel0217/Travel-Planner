import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';  
import './css/ItineraryForm.css';

const ItineraryForm = () => {
    const [itinerary, setItinerary] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItinerary(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itinerary.title || !itinerary.start_date || !itinerary.end_date) {
            // Handle error state if needed
            return;
        }
        try {
            await apiClient.post('/itineraries', itinerary);
            alert('Itinerary created successfully!');
            setItinerary({
                title: '',
                description: '',
                start_date: '',
                end_date: ''
            });
        } catch (error) {
            console.error('Failed to create itinerary:', error);
            alert('Failed to create itinerary');
        }
    };

    const handleClear = () => {
        setItinerary({
            title: '',
            description: '',
            start_date: '',
            end_date: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="title">Title</label>
            <input
                type="text"
                id="title"
                name="title"
                value={itinerary.title}
                onChange={handleChange}
                required
            />

            <label htmlFor="description">Description</label>
            <input
                type="text"
                id="description"
                name="description"
                value={itinerary.description}
                onChange={handleChange}
                placeholder="Optional"
            />

            <label htmlFor="start_date">Start Date</label>
            <input
                type="date"
                id="start_date"
                name="start_date"
                value={itinerary.start_date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
            />

            <label htmlFor="end_date">End Date</label>
            <input
                type="date"
                id="end_date"
                name="end_date"
                value={itinerary.end_date}
                onChange={handleChange}
                min={itinerary.start_date || new Date().toISOString().split('T')[0]}
                required
            />

            <button type="submit">Create Itinerary</button>
            <button type="button" onClick={handleClear}>Clear</button>
        </form>
    );
};

export default ItineraryForm;
