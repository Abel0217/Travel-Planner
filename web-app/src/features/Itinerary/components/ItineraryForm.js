import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import './css/ItineraryForm.css';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import AutoComplete from './AutoComplete'; // Import the AutoComplete component

const ItineraryForm = ({ itineraryToEdit, onClose, onItinerarySaved }) => {
    const [itinerary, setItinerary] = useState({
        title: '',
        destination: '',
        start_date: '',
        end_date: ''
    });

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (itineraryToEdit) {
            setItinerary({
                title: itineraryToEdit.title,
                destination: itineraryToEdit.destinations ? itineraryToEdit.destinations.trim() : '',
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

    const handleDestinationChange = (value) => {
        setItinerary(prev => ({
            ...prev,
            destination: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (itineraryToEdit) {
            setIsSaveDialogOpen(true);
        } else {
            handleSave();
        }
    };

    const handleSave = async () => {
        try {
            const { title, start_date, end_date, destination } = itinerary;
            const payload = {
                title,
                start_date,
                end_date,
                destinations: destination // Only one destination
            };

            if (itineraryToEdit) {
                await apiClient.put(`/itineraries/${itineraryToEdit.itinerary_id}`, payload);
            } else {
                await apiClient.post('/itineraries', payload);
                setIsSuccessDialogOpen(true);
            }

            if (onItinerarySaved) {
                onItinerarySaved();
            }

            setIsSaveDialogOpen(false);
            if (onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Failed to save itinerary:', error);
            setError('Failed to create itinerary. Please try again.');
        }
    };

    const handleClear = () => {
        setItinerary({
            title: '',
            destination: '',
            start_date: '',
            end_date: ''
        });
    };

    const handleSuccessClose = () => {
        setIsSuccessDialogOpen(false);
        if (onClose) {
            onClose();
        }
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
                <label htmlFor="destination">Destination</label>
                <div className="destination-input">
                    <AutoComplete
                        id="autocomplete-destination"
                        value={itinerary.destination}
                        onChange={handleDestinationChange}
                    />
                </div>

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
            <Dialog
                open={isSuccessDialogOpen}
                onClose={handleSuccessClose}
            >
                <DialogTitle>Success</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Itinerary successfully created!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSuccessClose} className="dialog-button">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
            {error && (
                <Dialog
                    open={Boolean(error)}
                    onClose={() => setError('')}
                >
                    <DialogTitle>Error</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            {error}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setError('')} className="dialog-button">
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </div>
    );
};

export default ItineraryForm;
