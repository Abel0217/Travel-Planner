import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import UploadFile from '../../Upload/UploadFile'; 
import Loading from '../Loading'; 
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, IconButton } from '@mui/material'; 
import CloseIcon from '@mui/icons-material/Close'; 

function TransportForm({ itineraryId, startDate, endDate, onClose, onTransportAdded, transportToEdit }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [type, setType] = useState('');
    const [pickupTime, setPickupTime] = useState(null);
    const [dropoffTime, setDropoffTime] = useState(null);
    const [pickupLocation, setPickupLocation] = useState('');
    const [dropoffLocation, setDropoffLocation] = useState('');
    const [bookingReference, setBookingReference] = useState('');
    const [pickupSearchBox, setPickupSearchBox] = useState(null);
    const [dropoffSearchBox, setDropoffSearchBox] = useState(null);
    const [isLoading, setIsLoading] = useState(false); 
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false); 
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false); 
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false); 
    const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false); 
    const [error, setError] = useState(''); 
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingTransport, setPendingTransport] = useState(null);
    const [itineraryStart, setItineraryStart] = useState(null);
    const [itineraryEnd, setItineraryEnd] = useState(null);
    
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        setIsLoading(true); 
        if (transportToEdit) {
            setTimeout(() => {
                setType(transportToEdit.type);
                setPickupTime(new Date(transportToEdit.pickup_time));
                setDropoffTime(new Date(transportToEdit.dropoff_time));
                setPickupLocation(transportToEdit.pickup_location);
                setDropoffLocation(transportToEdit.dropoff_location);
                setBookingReference(transportToEdit.booking_reference);
                setIsLoading(false); 
            }, 1000); 
        } else {
            setIsLoading(false); 
        }
    }, [transportToEdit]);

    useEffect(() => {
        const fetchItineraryDates = async () => {
            try {
                const response = await apiClient.get(`/itineraries/${itineraryId}`);
                const itinerary = response.data;
    
                if (itinerary) {
                    console.log("Fetched Itinerary Data:", itinerary);
                    setItineraryStart(new Date(itinerary.start_date));
                    setItineraryEnd(new Date(itinerary.end_date));
                } else {
                    console.error("No itinerary found for ID:", itineraryId);
                }
            } catch (error) {
                console.error("Error fetching itinerary dates:", error);
            }
        };
    
        if (itineraryId) {
            fetchItineraryDates();
        }
    }, [itineraryId]);    

    const handleExtractedData = (data) => {
        setType(data.type || type);
        setPickupLocation(data.pickupLocation || pickupLocation);
        setDropoffLocation(data.dropoffLocation || dropoffLocation);
        setBookingReference(data.bookingReference || bookingReference);
        if (data.pickupTime) setPickupTime(new Date(data.pickupTime));
        if (data.dropoffTime) setDropoffTime(new Date(data.dropoffTime));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
    
        const updatedTransport = {
            type,
            pickup_time: pickupTime.toISOString(),
            dropoff_time: dropoffTime.toISOString(),
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            booking_reference: bookingReference,
            itinerary_id: itineraryId
        };
    
        const itineraryStart = new Date(startDate);
        const itineraryEnd = new Date(endDate);
    
        if (
            isNaN(itineraryStart.getTime()) || isNaN(itineraryEnd.getTime()) ||
            pickupTime < itineraryStart || pickupTime > itineraryEnd ||
            dropoffTime < itineraryStart || dropoffTime > itineraryEnd
        ) {
            console.log("Warning: Pickup or dropoff time is outside the itinerary range.");
            setPendingTransport(updatedTransport);
            setShowWarningDialog(true);  
        } else {
            await saveTransport(updatedTransport);
        }
    
        setIsLoading(false);
    };

    const saveTransport = async (transport) => {
        try {
            if (transportToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/transport/${transportToEdit.transport_id}`, transport);
                onTransportAdded(response.data);
                await updateDoc(doc(db, 'transports', transportToEdit.id), transport);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/transport`, transport);
                onTransportAdded(response.data);
                await setDoc(doc(collection(db, 'transports')), transport);
            }
            setIsSuccessDialogOpen(true);  
        } catch (error) {
            console.error('Failed to save transport:', error);
            setError('Failed to save transport. Please try again.');
        }
    };    
    

    const handleClear = () => {
        setType('');
        setPickupTime(null);
        setDropoffTime(null);
        setPickupLocation('');
        setDropoffLocation('');
        setBookingReference('');
    };

    const onPickupLoad = ref => {
        setPickupSearchBox(ref);
    };

    const onDropoffLoad = ref => {
        setDropoffSearchBox(ref);
    };

    const onPickupPlaceChanged = () => {
        const places = pickupSearchBox.getPlaces();
        if (places.length > 0) {
            const place = places[0];
            setPickupLocation(place.formatted_address);
        }
    };

    const onDropoffPlaceChanged = () => {
        const places = dropoffSearchBox.getPlaces();
        if (places.length > 0) {
            const place = places[0];
            setDropoffLocation(place.formatted_address);
        }
    };

    const handleOptionsDialogOpen = () => {
        setIsOptionsDialogOpen(true);
    };

    const handleOptionsDialogClose = () => {
        setIsOptionsDialogOpen(false);
    };

    const handleUploadDialogOpen = () => {
        setIsOptionsDialogOpen(false);
        setIsUploadDialogOpen(true);
    };

    const handleUploadDialogClose = () => {
        setIsUploadDialogOpen(false);
    };

    const handleEmailPopupOpen = () => {
        setIsOptionsDialogOpen(false);
        setIsEmailPopupOpen(true);
    };

    const handleEmailPopupClose = () => {
        setIsEmailPopupOpen(false);
    };

    const handleSuccessClose = () => {
        setIsSuccessDialogOpen(false);
        onClose();
    };

    const handleErrorClose = () => {
        setError('');
    };

    return (
        <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
            {isLoading && <Loading />} {/* Show loading component if loading */}
            <div className="form-container full-size">
                <button className="back-button" onClick={onClose}>Back</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="form-title">{transportToEdit ? 'Edit Transportation' : 'Add Transportation'}</h2>

                    {/* Options Button */}
                    <div className="upload-email-section">
                        <button type="button" onClick={handleOptionsDialogOpen} className="options-button">Select Upload Options - Coming Soon!</button>
                    </div>

                    {/* Divider */}
                    <div className="or-divider">or</div>

                    <label>Method of Transportation:</label>
                    <select 
                        value={type} 
                        onChange={e => setType(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="" disabled>Select Method</option>
                        <option value="Plane">Plane</option>
                        <option value="Train">Train</option>
                        <option value="Bus">Bus</option>
                        <option value="Taxi">Taxi</option>
                        <option value="Other">Other</option>
                    </select>
                    <div className="date-fields">
                        <label>Pickup Time:
                        <DatePicker
                            selected={pickupTime}
                            onChange={date => setPickupTime(date)}
                            minDate={itineraryStart}
                            maxDate={itineraryEnd}
                            placeholderText="Pickup Date & Time"
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                        />
                        </label>
                        <label>Dropoff Time:
                        <DatePicker
                            selected={dropoffTime}
                            onChange={date => setDropoffTime(date)}
                            minDate={itineraryStart}
                            maxDate={itineraryEnd}
                            placeholderText="Dropoff Date & Time"
                            showTimeSelect
                            dateFormat="MMMM d, yyyy h:mm aa"
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            timeCaption="Time"
                        />
                        </label>
                    </div>
                    <label>Pickup Location:
                        <StandaloneSearchBox onLoad={onPickupLoad} onPlacesChanged={onPickupPlaceChanged}>
                            <input
                                type="text"
                                value={pickupLocation}
                                onChange={e => setPickupLocation(e.target.value)}
                                placeholder="Enter pickup location"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>
                    <label>Dropoff Location:
                        <StandaloneSearchBox onLoad={onDropoffLoad} onPlacesChanged={onDropoffPlaceChanged}>
                            <input
                                type="text"
                                value={dropoffLocation}
                                onChange={e => setDropoffLocation(e.target.value)}
                                placeholder="Enter dropoff location"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>
                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{transportToEdit ? 'Save Changes' : 'Add Transport'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                {/* Warning Dialog */}
                <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)}>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            The pickup or dropoff time is outside the itinerary dates. Do you want to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowWarningDialog(false)} className="dialog-button">Back</Button>
                        <Button onClick={() => {
                            saveTransport(pendingTransport);
                            setShowWarningDialog(false);
                        }} className="dialog-button">
                            Proceed
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={isSuccessDialogOpen} onClose={handleSuccessClose}>
                    <DialogTitle>Success</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Transport successfully {transportToEdit ? 'updated' : 'added'}!
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

export default TransportForm;
