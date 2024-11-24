import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, IconButton } from '@mui/material';
import UploadFile from '../../Upload/UploadFile';
import Loading from '../Loading';
import CloseIcon from '@mui/icons-material/Close';

function RestaurantForm({ itineraryId, startDate, endDate, onClose, onRestaurantAdded, restaurantToEdit }) {
    const initialDate = startDate ? new Date(startDate) : new Date();
    const [restaurantName, setRestaurantName] = useState('');
    const [reservationDate, setReservationDate] = useState(null);
    const [reservationTime, setReservationTime] = useState('');
    const [guestNumber, setGuestNumber] = useState('');
    const [address, setAddress] = useState('');
    const [bookingConfirmation, setBookingConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
    const [error, setError] = useState('');
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingRestaurant, setPendingRestaurant] = useState(null);
    const [isLoading, setIsLoading] = useState(false); 
    const [searchBox, setSearchBox] = useState(null); 
    const [itineraryStart, setItineraryStart] = useState(null);
    const [itineraryEnd, setItineraryEnd] = useState(null);
    
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        setIsLoading(true);
        if (restaurantToEdit) {
            setTimeout(() => {
                setRestaurantName(restaurantToEdit.restaurant_name);
                setReservationDate(new Date(restaurantToEdit.reservation_date));
                setReservationTime(restaurantToEdit.reservation_time);
                setGuestNumber(restaurantToEdit.guest_number);
                setAddress(restaurantToEdit.address);
                setBookingConfirmation(restaurantToEdit.booking_confirmation);
                setIsLoading(false);
            }, 1000);
        } else {
            setIsLoading(false);
        }
    }, [restaurantToEdit]);   
    
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
        setRestaurantName(data.restaurantName || restaurantName);

        if (data.reservationDate) {
            const parsedReservationDate = new Date(data.reservationDate);
            if (!isNaN(parsedReservationDate)) setReservationDate(parsedReservationDate);
        }

        if (data.reservationTime) {
            setReservationTime(data.reservationTime);
        }

        setGuestNumber(data.guestNumber || guestNumber);
        setAddress(data.address || address);
        setBookingConfirmation(data.bookingConfirmation || bookingConfirmation);
    };

    const onLoad = (ref) => {
        setSearchBox(ref); 
    };
    
    const onPlacesChanged = () => {
        const places = searchBox.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            setAddress(place.formatted_address); 
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const updatedRestaurant = {
            restaurant_name: restaurantName,
            reservation_date: reservationDate.toISOString().split('T')[0],
            reservation_time: reservationTime,
            guest_number: guestNumber,
            address: address,
            booking_confirmation: bookingConfirmation,
            itinerary_id: itineraryId
        };
    
        const itineraryStart = new Date(startDate);
        const itineraryEnd = new Date(endDate);
    
        if (
            isNaN(itineraryStart.getTime()) || isNaN(itineraryEnd.getTime()) ||
            reservationDate < itineraryStart || reservationDate > itineraryEnd
        ) {
            console.log("Warning: Reservation date is outside the itinerary range.");
            setPendingRestaurant(updatedRestaurant);   
            setShowWarningDialog(true);                
        } else {
            await saveRestaurant(updatedRestaurant);
        }
    };    
    
    const saveRestaurant = async (restaurant) => {
        setIsLoading(true);
        try {
            let response;
            if (restaurantToEdit) {
                response = await apiClient.put(`/itineraries/${itineraryId}/restaurants/${restaurantToEdit.reservation_id}`, restaurant);
                const restaurantRef = doc(db, 'restaurants', restaurantToEdit.id);
                await updateDoc(restaurantRef, restaurant);
            } else {
                response = await apiClient.post(`/itineraries/${itineraryId}/restaurants`, restaurant);
                const newDocRef = doc(collection(db, 'restaurants'));
                await setDoc(newDocRef, restaurant);
            }
            onRestaurantAdded(response.data);
            setIsSuccessDialogOpen(true); 
        } catch (error) {
            console.error('Failed to save restaurant:', error);
            setError('Failed to save restaurant. Please try again.');
        }
        setIsLoading(false);
    };    
    
    const handleClear = () => {
        setRestaurantName('');
        setReservationDate(null);
        setReservationTime('');
        setGuestNumber('');
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

    return (
        <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
            {loading && <Loading />}
            <div className="form-container full-size">
                <button className="back-button" onClick={onClose}>Back</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="form-title">{restaurantToEdit ? 'Edit Restaurant' : 'Add Restaurant'}</h2>

                    <div className="upload-email-section">
                        <button type="button" onClick={handleOptionsDialogOpen} className="options-button">Select Upload Options - Coming Soon!</button>
                    </div>

                    <div className="or-divider">or</div>

                    <label>Restaurant Name:
                        <input type="text" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} required />
                    </label>
                    <div className="date-fields">
                        <label>Reservation Date:
                        <DatePicker
                            selected={reservationDate}
                            onChange={date => setReservationDate(date)}
                            minDate={itineraryStart}
                            maxDate={itineraryEnd}
                            placeholderText="Reservation Date"
                            dateFormat="yyyy-MM-dd"
                        />
                        </label>
                        <label>Reservation Time:
                            <input type="time" value={reservationTime} onChange={e => setReservationTime(e.target.value)} required />
                        </label>
                        <label>Number of Guests:
                            <input 
                                type="text" 
                                value={guestNumber} 
                                onChange={e => setGuestNumber(e.target.value)} 
                                required 
                                placeholder="Enter number of guests"
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
                        <input type="text" value={bookingConfirmation} onChange={e => setBookingConfirmation(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{restaurantToEdit ? 'Save Changes' : 'Add Restaurant'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                {/* Warning Dialog */}
                <Dialog open={showWarningDialog} onClose={() => setShowWarningDialog(false)}>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            The reservation date is outside the itinerary dates. Do you want to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setShowWarningDialog(false)} className="dialog-button">Back</Button>
                        <Button onClick={() => { 
                            saveRestaurant(pendingRestaurant); 
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
                            Restaurant successfully {restaurantToEdit ? 'updated' : 'added'}!
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

export default RestaurantForm;
