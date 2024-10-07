import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import './css/ItineraryForm.css';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import AutoComplete from './AutoComplete'; // Import the AutoComplete component
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
    const [isDestinationValid, setIsDestinationValid] = useState(false);

    useEffect(() => {
        if (itineraryToEdit) {
            setItinerary({
                title: itineraryToEdit.title,
                destination: itineraryToEdit.destinations ? itineraryToEdit.destinations.trim() : '',
                start_date: itineraryToEdit.start_date,
                end_date: itineraryToEdit.end_date
            });
            setIsDestinationValid(true); // Set valid initially if editing
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

    const handleStartDateChange = (date) => {
        setItinerary(prev => ({
            ...prev,
            start_date: date
        }));
    };

    const handleEndDateChange = (date) => {
        setItinerary(prev => ({
            ...prev,
            end_date: date
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isDestinationValid) {
            setError('Please select a valid destination from the suggestions.');
            return;
        }
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
                destinations: destination 
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
            setError('Failed to save itinerary. Please try again.');
        }
    };

    const handleClear = () => {
        setItinerary({
            title: '',
            destination: '',
            start_date: '',
            end_date: ''
        });
        setIsDestinationValid(false);
    };

    const handleSuccessClose = () => {
        setIsSuccessDialogOpen(false);
        if (onClose) {
            onClose();
        }
    };

    return (
        <div className="popup-form">
            {/* Adding inline style for .pac-container */}
            <style>{`
                .pac-container {
                    z-index: 10000 !important;
                }
            `}</style>
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
                    {itineraryToEdit ? (
                        <input
                            type="text"
                            id="destination"
                            name="destination"
                            value={itinerary.destination}
                            disabled
                            style={{ backgroundColor: '#f0f0f0', color: '#999' }}
                        />
                    ) : (
                        <AutoComplete
                            id="autocomplete-destination"
                            value={itinerary.destination}
                            onChange={handleDestinationChange}
                            setIsValid={setIsDestinationValid}
                        />
                    )}
                </div>
                {error && <div className="error-message">{error}</div>}

                <label htmlFor="start_date">Start Date</label>
                <DatePicker
                    selected={itinerary.start_date ? new Date(itinerary.start_date) : null}
                    onChange={handleStartDateChange}
                    minDate={new Date()}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="yyyy-mm-dd"
                    required
                />

                <label htmlFor="end_date">End Date</label>
                <DatePicker
                    selected={itinerary.end_date ? new Date(itinerary.end_date) : null}
                    onChange={handleEndDateChange}
                    minDate={itinerary.start_date ? new Date(itinerary.start_date) : new Date()}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="yyyy-mm-dd"
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
