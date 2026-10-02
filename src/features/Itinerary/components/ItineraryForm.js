import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import './css/ItineraryForm.css';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AutoComplete from './AutoComplete';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { randomLocalSceneryIndex, sceneryImages, useHeldCrossfade } from '../../../utils/scenery';

const ItineraryForm = ({ itineraryToEdit, onClose, onItinerarySaved }) => {
    const [itinerary, setItinerary] = useState({
        title: '',
        destination: '',
        start_date: '',
        end_date: ''
    });

    const [createdItinerary, setCreatedItinerary] = useState(null);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [error, setError] = useState('');
    const [isDestinationValid, setIsDestinationValid] = useState(false);
    const [startSlide] = useState(() => randomLocalSceneryIndex());
    const scenery = useHeldCrossfade({ initialIndex: startSlide, intervalMs: 16000 });
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        if (itineraryToEdit) return;
        const destination = (searchParams.get('destination') || '').trim();
        const title = (searchParams.get('title') || '').trim();
        if (!destination && !title) return;
        setItinerary((prev) => ({
            ...prev,
            destination: destination || prev.destination,
            title: title || prev.title,
        }));
        if (destination) setIsDestinationValid(true);
    }, [itineraryToEdit, searchParams]);

    useEffect(() => {
        if (itineraryToEdit) {
            setItinerary({
                title: itineraryToEdit.title,
                destination: (itineraryToEdit.destinations || itineraryToEdit.fullDestination || '').trim(),
                start_date: itineraryToEdit.start_date,
                end_date: itineraryToEdit.end_date
            });
            setIsDestinationValid(true); 
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

    const parseLocalDate = (value) => {
        if (!value) return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        const isoDay = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoDay) {
            return new Date(Number(isoDay[1]), Number(isoDay[2]) - 1, Number(isoDay[3]));
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    };

    const toDateValue = (value) => {
        if (!value) return null;
        const text = String(value);
        const isoDay = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoDay) return isoDay[1];
        const date = parseLocalDate(value);
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!itineraryToEdit && !isDestinationValid) {
            setError('Please select a city from the suggestions.');
            return;
        }
        handleSave();
    };

    const handleSave = async () => {
        try {
            setError('');
            const { title, start_date, end_date, destination } = itinerary;
            const payload = {
                title: String(title || '').trim(),
                start_date: toDateValue(start_date),
                end_date: toDateValue(end_date),
                destinations: String(destination || itineraryToEdit?.destinations || itineraryToEdit?.fullDestination || '').trim()
            };

            if (!payload.title || !payload.start_date || !payload.end_date || !payload.destinations) {
                setError('Title, city, and dates are required.');
                return;
            }

            if (itineraryToEdit) {
                await apiClient.put(`/itineraries/${itineraryToEdit.itinerary_id}`, payload);
            } else {
                const response = await apiClient.post('/itineraries', payload);
                setCreatedItinerary(response.data);
                setIsSuccessDialogOpen(true);
            }

            if (onItinerarySaved) {
                onItinerarySaved();
            }

            if (itineraryToEdit && onClose) {
                onClose();
            }
        } catch (error) {
            console.error('Failed to save itinerary:', error);
            setError(error.response?.data?.error || 'Failed to save itinerary. Please try again.');
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
        navigate('/itineraries-view');
    };
    
    return (
        <div className={itineraryToEdit ? 'edit-itinerary-wrap' : 'create-itinerary-page'}>
            {!itineraryToEdit ? (
                <div className="create-carousel" style={{ backgroundImage: `url(${sceneryImages[scenery.base]})` }}>
                    {sceneryImages.map((image, index) => (
                        <div
                            key={image}
                            className={`create-carousel-slide${index === scenery.base ? ' is-base' : ''}${index === scenery.incoming ? ' is-incoming' : ''}`}
                            style={{ backgroundImage: `url(${image})` }}
                        />
                    ))}
                </div>
            ) : null}
        <div className="popup-form">
            <form onSubmit={handleSubmit} noValidate>
                <h2>{itineraryToEdit ? 'Edit Itinerary' : 'Create New Itinerary'}</h2>
                <label htmlFor="title">Title</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={itinerary.title}
                    onChange={handleChange}
                    required
                />
                <label htmlFor="destination">City</label>
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
                    selected={parseLocalDate(itinerary.start_date)}
                    onChange={handleStartDateChange}
                    minDate={itineraryToEdit ? undefined : new Date()}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="yyyy-mm-dd"
                    required
                />

                <label htmlFor="end_date">End Date</label>
                <DatePicker
                    selected={parseLocalDate(itinerary.end_date)}
                    onChange={handleEndDateChange}
                    minDate={parseLocalDate(itinerary.start_date) || (itineraryToEdit ? undefined : new Date())}
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
                open={isSuccessDialogOpen}
                onClose={handleSuccessClose}
                disableEnforceFocus
            >
                <DialogTitle>Success!</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {createdItinerary?.title || 'Your trip'} is ready and can be viewed in View Itineraries.
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
        </div>
    );
};

export default ItineraryForm;
