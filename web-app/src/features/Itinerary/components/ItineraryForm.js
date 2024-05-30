import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import './css/ItineraryForm.css';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';

const ItineraryForm = ({ itineraryToEdit, onClose, onItinerarySaved }) => {
    const [itinerary, setItinerary] = useState({
        title: '',
        destinations: [''],
        start_date: '',
        end_date: ''
    });

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

    useEffect(() => {
        if (itineraryToEdit) {
            setItinerary({
                title: itineraryToEdit.title,
                destinations: itineraryToEdit.destinations || [''],
                start_date: itineraryToEdit.start_date,
                end_date: itineraryToEdit.end_date
            });
        }
    }, [itineraryToEdit]);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaveDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const { title, start_date, end_date, destinations } = itinerary;
            const payload = {
                title,
                start_date,
                end_date,
                destinations: destinations.filter(dest => dest)
            };

            if (itineraryToEdit) {
                await apiClient.put(`/itineraries/${itineraryToEdit.itinerary_id}`, payload);
            } else {
                await apiClient.post('/itineraries', payload);
            }

            onItinerarySaved();
            setIsSaveDialogOpen(false);
            onClose();
        } catch (error) {
            console.error('Failed to save itinerary:', error);
            alert('Failed to save itinerary');
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
        <div>
            <form onSubmit={handleSubmit} noValidate>
                <h2>{itineraryToEdit ? 'Edit Itinerary' : 'Create New Itinerary'}</h2>
                {itineraryToEdit && <button type="button" className="close-icon" onClick={onClose}>×</button>}
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
                        <div className="destination-input">
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
                    <button type="submit" className="primary-button">{itineraryToEdit ? 'Save Changes' : 'Create Itinerary'}</button>
                    <button type="button" className="secondary-button" onClick={handleClear}>Clear</button>
                </div>
            </form>
            <Dialog
                open={isSaveDialogOpen}
                onClose={() => setIsSaveDialogOpen(false)}
            >
                <DialogTitle>Confirm Save</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to save changes? This may affect the itinerary plan.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsSaveDialogOpen(false)} className="dialog-button">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="dialog-button">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ItineraryForm;
