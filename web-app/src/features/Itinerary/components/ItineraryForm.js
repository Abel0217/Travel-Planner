import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/ItineraryForm.css';

const ItineraryForm = () => {
    const [itinerary, setItinerary] = useState({
        title: '',
        destinations: [''],
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

    const handleDestinationChange = (index, value) => {
        const newDestinations = [...itinerary.destinations];
        newDestinations[index] = value;
        setItinerary(prev => ({
            ...prev,
            destinations: newDestinations
        }));
    };

    const addDestination = () => {
        setItinerary(prev => ({
            ...prev,
            destinations: [...prev.destinations, '']
        }));
    };

    const removeDestination = (index) => {
        const newDestinations = [...itinerary.destinations];
        newDestinations.splice(index, 1);
        setItinerary(prev => ({
            ...prev,
            destinations: newDestinations
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itinerary.title || !itinerary.start_date || !itinerary.end_date || itinerary.destinations.some(dest => !dest)) {
            return;
        }
        try {
            const { title, start_date, end_date, destinations } = itinerary;
            const payload = {
                title,
                start_date,
                end_date,
                destinations: destinations.filter(dest => dest) 
            };
            await apiClient.post('/itineraries', payload);
            alert('Itinerary created successfully!');
            setItinerary({
                title: '',
                destinations: [''],
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
            destinations: [''],
            start_date: '',
            end_date: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <h2>Create New Itinerary</h2>
            <label htmlFor="title">Title</label>
            <input
                type="text"
                id="title"
                name="title"
                value={itinerary.title}
                onChange={handleChange}
                required
            />

            {itinerary.destinations.map((destination, index) => (
                <div key={index} className="destination-field">
                    <label htmlFor={`destination-${index}`}>{index === 0 ? 'Destination' : `Destination ${index + 1}`}</label>
                    <input
                        type="text"
                        id={`destination-${index}`}
                        name={`destination-${index}`}
                        value={destination}
                        onChange={e => handleDestinationChange(index, e.target.value)}
                        required={index === 0}
                    />
                    {index > 0 && (
                        <button type="button" className="remove-destination" onClick={() => removeDestination(index)}>-</button>
                    )}
                    {index === itinerary.destinations.length - 1 && (
                        <button type="button" className="add-destination" onClick={addDestination}>+</button>
                    )}
                </div>
            ))}

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

            <div className="form-buttons">
                <button type="submit" className="primary-button">Create Itinerary</button>
                <button type="button" className="secondary-button" onClick={handleClear}>Clear</button>
            </div>
        </form>
    );
};

export default ItineraryForm;
