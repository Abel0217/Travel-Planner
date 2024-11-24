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

function HotelForm({ itineraryId, startDate, endDate, onClose, onHotelAdded, hotelToEdit }) {
    const [hotelName, setHotelName] = useState('');
    const [checkInDate, setCheckInDate] = useState(null);
    const [checkOutDate, setCheckOutDate] = useState(null);    
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');
    const [searchBox, setSearchBox] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
    const [error, setError] = useState('');
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingHotel, setPendingHotel] = useState(null);    
    const [itineraryStart, setItineraryStart] = useState(null);
    const [itineraryEnd, setItineraryEnd] = useState(null);

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        console.log("Itinerary Start Date (prop):", startDate);
        console.log("Itinerary End Date (prop):", endDate);

        if (hotelToEdit) {
            setHotelName(hotelToEdit.hotel_name);
            setCheckInDate(new Date(hotelToEdit.check_in_date));
            setCheckOutDate(new Date(hotelToEdit.check_out_date));
            setAddress(hotelToEdit.address);
            setBookingConfirmation(hotelToEdit.booking_confirmation);
        }
    }, [hotelToEdit]);

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
        setHotelName(data.hotelName || hotelName);
        setAddress(data.address || address);
        setBookingConfirmation(data.bookingConfirmation || bookingConfirmation);

        if (data.checkInDate) {
            const parsedCheckInDate = new Date(data.checkInDate);
            if (!isNaN(parsedCheckInDate)) setCheckInDate(parsedCheckInDate);
        }

        if (data.checkOutDate) {
            const parsedCheckOutDate = new Date(data.checkOutDate);
            if (!isNaN(parsedCheckOutDate)) setCheckOutDate(parsedCheckOutDate);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const updatedHotel = {
            hotel_name: hotelName,
            check_in_date: checkInDate.toISOString().split('T')[0],
            check_out_date: checkOutDate.toISOString().split('T')[0],
            address,
            booking_confirmation: bookingConfirmation,
            itinerary_id: itineraryId
        };
    
        const itineraryStart = new Date(startDate);
        const itineraryEnd = new Date(endDate);
    
        if (
            isNaN(itineraryStart.getTime()) || isNaN(itineraryEnd.getTime()) ||
            checkInDate < itineraryStart || checkInDate > itineraryEnd ||
            checkOutDate < itineraryStart || checkOutDate > itineraryEnd
        ) {
            console.log("Warning: At least one date is outside the itinerary range.");
            setPendingHotel(updatedHotel);   
            setShowWarningDialog(true);      
        } else {
            console.log("All dates are within the itinerary range. Proceeding to save.");
            await saveHotel(updatedHotel);
        }
    };    

    const saveHotel = async (hotel) => {
        setLoading(true);
    
        try {
            let response;
            if (hotelToEdit) {
                response = await apiClient.put(`/itineraries/${itineraryId}/hotels/${hotelToEdit.hotel_id}`, hotel);
                const hotelRef = doc(db, 'hotels', hotelToEdit.id);
                await updateDoc(hotelRef, hotel);
            } else {
                response = await apiClient.post(`/itineraries/${itineraryId}/hotels`, hotel);
                const newDocRef = doc(collection(db, 'hotels'));
                await setDoc(newDocRef, hotel);
            }
    
            onHotelAdded(response.data);
            setIsSuccessDialogOpen(true); 
        } catch (error) {
            console.error('Failed to save hotel:', error);
            setError('Failed to save hotel. Please try again.');
        } finally {
            setLoading(false);
        }
    };     

    const handleWarningClose = () => {
        setShowWarningDialog(false);
        setPendingHotel(null); 
    };
    
    const handleConfirmAddOutsideDates = () => {
        setShowWarningDialog(false);
        saveHotel(pendingHotel); 
    };      
    
    const handleClear = () => {
        setHotelName('');
        setCheckInDate(null);
        setCheckOutDate(null);
        setAddress('');
        setBookingConfirmation('');
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

    const onLoad = ref => {
        setSearchBox(ref);
    };

    const onPlacesChanged = () => {
        const places = searchBox.getPlaces();
        if (places.length > 0) {
            const place = places[0];
            setAddress(place.formatted_address);
        }
    };

    return (
        <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
            {loading && <Loading />}
            <div className="form-container full-size" style={{ position: 'relative' }}>
                <button className="back-button" onClick={onClose}>Back</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="form-title">{hotelToEdit ? 'Edit Hotel' : 'Add Hotel'}</h2>

                    <div className="upload-email-section">
                        <button type="button" onClick={handleOptionsDialogOpen} className="options-button">Select Upload Options - Coming Soon!</button>
                    </div>

                    <div className="or-divider">or</div>

                    <label>Hotel Name:
                        <input
                            type="text"
                            value={hotelName}
                            onChange={e => setHotelName(e.target.value)}
                            placeholderText="Enter Hotel Name"
                            maxLength={255}
                            required
                        />
                    </label>
                    <div className="date-fields">
                    <label>Check-in Date:
                        <DatePicker
                        selected={checkInDate}
                        onChange={(date) => setCheckInDate(date)}
                        minDate={itineraryStart}
                        maxDate={itineraryEnd}
                        placeholderText="Select Check-in Date"
                        dateFormat="yyyy-MM-dd"
                        />
                    </label>
                    <label>Check-out Date:
                    <DatePicker
                        selected={checkOutDate}
                        onChange={(date) => setCheckOutDate(date)}
                        minDate={itineraryStart}
                        maxDate={itineraryEnd}
                        placeholderText="Select Check-out Date"
                        dateFormat="yyyy-MM-dd"
                    />
                    </label>
                    </div>
                    <label>Address:
                        <StandaloneSearchBox onLoad={onLoad} onPlacesChanged={onPlacesChanged}>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Enter address"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>
                    <label>Booking Confirmation:
                        <input
                            type="text"
                            value={bookingConfirmation}
                            onChange={e => setBookingConfirmation(e.target.value)}
                            maxLength={100}
                            required
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{hotelToEdit ? 'Save Changes' : 'Add Hotel'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                {/* Warning Dialog */}
                <Dialog open={showWarningDialog} onClose={handleWarningClose}>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            The check-in and check-out dates are outside the itinerary dates. Do you want to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleWarningClose} className="dialog-button">Back</Button>
                        <Button onClick={handleConfirmAddOutsideDates} color="primary" className="dialog-button">
                            Proceed
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={isSuccessDialogOpen} onClose={handleSuccessClose}>
                    <DialogTitle>Success</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Hotel successfully {hotelToEdit ? 'updated' : 'added'}!
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

export default HotelForm;