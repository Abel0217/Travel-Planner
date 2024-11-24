import React, { useState, useEffect } from 'react';
import "react-datepicker/dist/react-datepicker.css";
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, IconButton } from '@mui/material';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import UploadFile from '../../Upload/UploadFile'; 
import Loading from '../Loading'; 
import './css/Forms.css';
import CloseIcon from '@mui/icons-material/Close';

function ActivityForm({ itineraryId, startDate, endDate, onClose, onActivityAdded, activityToEdit }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [activityDate, setActivityDate] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [reservationNumber, setReservationNumber] = useState('');
    const [searchBox, setSearchBox] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false); 
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false); 
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false); 
    const [error, setError] = useState('');
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingActivity, setPendingActivity] = useState(null);


    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        console.log("Itinerary Start Date:", startDate);
        console.log("Itinerary End Date:", endDate);

        setIsLoading(true);
        if (activityToEdit) {
            setTimeout(() => {
                setTitle(activityToEdit.title);
                setDescription(activityToEdit.description);
                setLocation(activityToEdit.location);
                setActivityDate(new Date(activityToEdit.activity_date));
                setStartTime(parseTime(activityToEdit.start_time));
                setEndTime(activityToEdit.end_time ? parseTime(activityToEdit.end_time) : null);
                setReservationNumber(activityToEdit.reservation_number);
                setIsLoading(false);
            }, 1000);
        } else {
            setIsLoading(false);
        }
    }, [activityToEdit]);    

    const formatDateTime = (dateTime, includeTime = false) => {
        if (!dateTime) return 'N/A';
        const options = {
            weekday: 'long', 
            year: 'numeric', 
            month: 'long',   
            day: 'numeric',  
        };
        const date = new Date(dateTime);
        let formattedDate = date.toLocaleDateString('en-US', options);
    
        if (includeTime) {
            const timeString = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true, 
            });
            formattedDate = `${formattedDate}, ${timeString}`;
        }
    
        return formattedDate;
    };
    
    const parseTime = (timeString) => {
        if (!timeString) return null;
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };
    
    const handleExtractedData = (data) => {
        setTitle(data.title || title);
        setLocation(data.location || location);
        setReservationNumber(data.reservationNumber || reservationNumber);
        if (data.activityDate) setActivityDate(new Date(data.activityDate));
        if (data.startTime) setStartTime(data.startTime);
        if (data.endTime) setEndTime(data.endTime);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const updatedActivity = {
            title,
            description,
            location,
            activity_date: activityDate.toISOString().split('T')[0], 
            start_time: startTime ? startTime.toTimeString().split(' ')[0].substring(0, 5) : null, 
            end_time: endTime ? endTime.toTimeString().split(' ')[0].substring(0, 5) : null, 
            reservation_number: reservationNumber,
            itinerary_id: itineraryId,
        };
    
        if (activityDate < new Date(startDate) || activityDate > new Date(endDate)) {
            setPendingActivity(updatedActivity);
            setShowWarningDialog(true);
        } else {
            await saveActivity(updatedActivity);
        }
    };    
    
    const saveActivity = async (activity) => {
        setIsLoading(true);
        try {
            let response;
            if (activityToEdit) {
                response = await apiClient.put(`/itineraries/${itineraryId}/activities/${activityToEdit.activity_id}`, activity);
                await updateDoc(doc(db, 'activities', activityToEdit.id), activity);
            } else {
                response = await apiClient.post(`/itineraries/${itineraryId}/activities`, activity);
                await setDoc(doc(collection(db, 'activities')), activity);
            }
    
            if (onActivityAdded) {
                onActivityAdded(response.data);
            }
    
            setIsSuccessDialogOpen(true); 
        } catch (error) {
            console.error('Failed to save activity:', error);
            setError('Failed to save activity. Please try again.');
        }
        setIsLoading(false);
    };        

    const handleClear = () => {
        setTitle('');
        setDescription('');
        setLocation('');
        setActivityDate(null);
        setStartTime(null);
        setEndTime(null);
        setReservationNumber('');
    };

    const onLoad = ref => {
        setSearchBox(ref);
    };

    const onPlacesChanged = () => {
        const places = searchBox.getPlaces();
        if (places.length > 0) {
            const place = places[0];
            setLocation(place.formatted_address);
        }
    };

    const handleSuccessClose = () => {
        setIsSuccessDialogOpen(false);
        onClose();
    };

    const handleErrorClose = () => {
        setError('');
    };

    const handleOptionsDialogOpen = () => {
        setIsOptionsDialogOpen(true);
    };

    const handleOptionsDialogClose = () => {
        setIsOptionsDialogOpen(false);
    };

    const handleEmailPopupOpen = () => {
        setIsOptionsDialogOpen(false);
        setIsEmailPopupOpen(true);
    };

    const handleUploadDialogOpen = () => {
        setIsOptionsDialogOpen(false);
        setIsUploadDialogOpen(true);
    };

    const handleUploadDialogClose = () => {
        setIsUploadDialogOpen(false);
    };

    const handleEmailPopupClose = () => {
        setIsEmailPopupOpen(false);
    };

    return (
        <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
            {isLoading && <Loading />}
            <div className="form-container full-size" style={{ position: 'relative' }}>
                <button className="back-button" onClick={onClose}>Back</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="form-title">{activityToEdit ? 'Edit Activity' : 'Add Activity'}</h2>
                    
                    <div className="upload-email-section">
                        <button type="button" onClick={handleOptionsDialogOpen} className="options-button">Select Upload Options - Coming Soon!</button>
                    </div>
                    
                    {/* Divider positioned below the Select Options button */}
                    <div className="or-divider">or</div>

                    <label>Title:
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required />
                    </label>
                    <label>Location:
                        <StandaloneSearchBox onLoad={onLoad} onPlacesChanged={onPlacesChanged}>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Enter location"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>
                    <div className="date-fields">
                    <label>Activity Date:
                        <DatePicker
                            selected={activityDate}
                            onChange={date => setActivityDate(date)}
                            minDate={new Date(startDate)}
                            maxDate={new Date(endDate)}
                            dateFormat="yyyy-MM-dd"
                        />
                    </label>
                    <label>Start Time:
                        <DatePicker
                            selected={startTime}
                            onChange={date => setStartTime(date)}
                            showTimeSelect
                            showTimeSelectOnly
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="HH:mm"
                            timeCaption="Time"
                        />
                    </label>
                    <label>End Time:
                        <DatePicker
                            selected={endTime}
                            onChange={date => setEndTime(date)}
                            showTimeSelect
                            showTimeSelectOnly
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="HH:mm"
                            timeCaption="Time"
                            placeholderText="Optional" 
                            className="time-picker"
                        />
                    </label>
                    </div>
                    <label>Reservation Number:
                        <input type="text" value={reservationNumber} onChange={e => setReservationNumber(e.target.value)} maxLength={50} />
                    </label>
                    <label>Description:
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows="5"
                            maxLength={500}
                            style={{ width: '100%' }}
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{activityToEdit ? 'Save Changes' : 'Add Activity'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                {/* Warning Dialog */}
                <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)}>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            This activity falls outside your itinerary dates. Do you wish to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowWarningDialog(false)}>Back</Button>
                        <Button onClick={() => {
                            setShowWarningDialog(false);
                            saveActivity(pendingActivity); 
                        }} color="primary">
                            Yes
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={isSuccessDialogOpen} onClose={handleSuccessClose}>
                    <DialogTitle>Success</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Activity successfully {activityToEdit ? 'updated' : 'added'}!
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleSuccessClose} className="dialog-button">Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Error Dialog */}
                <Dialog open={Boolean(error)} onClose={handleErrorClose}>
                    <DialogTitle>Error</DialogTitle>
                    <DialogContent>
                        <DialogContentText>{error}</DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleErrorClose} className="dialog-button">Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Options Dialog */}
                <Dialog open={isOptionsDialogOpen} onClose={handleOptionsDialogClose} classes={{ paper: 'dialog-content-wide' }}>
                    <DialogTitle style={{ textAlign: 'center' }}>Select Options</DialogTitle>
                    <DialogContent>
                        <Button onClick={handleUploadDialogOpen} className="dialog-button">Upload File</Button>
                        <Button onClick={handleEmailPopupOpen} className="dialog-button">Email Us Your Booking</Button>
                    </DialogContent>
                </Dialog>


                {/* Upload File Popup */}
                <Dialog open={isUploadDialogOpen} onClose={handleUploadDialogClose} classes={{ paper: 'dialog-content-wide' }}>
                    <DialogTitle>Upload Your File</DialogTitle>
                    <DialogContent>
                        <UploadFile onExtractedData={handleExtractedData} />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleUploadDialogClose} className="dialog-button">Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Email Us Popup */}
                <Dialog open={isEmailPopupOpen} onClose={handleEmailPopupClose} classes={{ paper: 'dialog-content-wide' }}>
                    <DialogTitle>
                        Forward Your Booking
                        <IconButton onClick={handleEmailPopupClose} className="close-icon">
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText className="dialog-content-text">
                            Please forward your booking confirmation emails to <br />
                            <strong>bookings@yourdomain.com</strong>.
                            <br />We will extract the details and update your itinerary automatically.
                        </DialogContentText>
                    </DialogContent>
                </Dialog>
            </div>
        </LoadScript>

    );
}

export default ActivityForm;
