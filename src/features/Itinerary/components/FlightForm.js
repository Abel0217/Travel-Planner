import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import apiClient from '../../../api/apiClient';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';
import './css/Forms.css';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import UploadFile from '../../Upload/UploadFile';
import Loading from '../Loading';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

function FlightForm({ itineraryId, onClose, onFlightAdded, flightToEdit }) {
    const [airline, setAirline] = useState('');
    const [flightNumber, setFlightNumber] = useState('');
    const [departureAirport, setDepartureAirport] = useState('');
    const [arrivalAirport, setArrivalAirport] = useState('');
    const [departureDate, setDepartureDate] = useState(null);
    const [departureTime, setDepartureTime] = useState('');
    const [arrivalDate, setArrivalDate] = useState(null);
    const [arrivalTime, setArrivalTime] = useState('');
    const [bookingReference, setBookingReference] = useState('');
    const [departureSearchBox, setDepartureSearchBox] = useState(null);
    const [arrivalSearchBox, setArrivalSearchBox] = useState(null);
    const [passengerName, setPassengerName] = useState('');
    const [seatNumber, setSeatNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
    const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
    const [error, setError] = useState('');
    const [showWarningDialog, setShowWarningDialog] = useState(false);
    const [pendingFlight, setPendingFlight] = useState(null);
    const [itineraryStart, setItineraryStart] = useState(null);
    const [itineraryEnd, setItineraryEnd] = useState(null);
    
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (flightToEdit) {
            setAirline(flightToEdit.airline);
            setFlightNumber(flightToEdit.flight_number);
            setDepartureAirport(flightToEdit.departure_airport);
            setArrivalAirport(flightToEdit.arrival_airport);
            setDepartureDate(new Date(flightToEdit.departure_time));
            setDepartureTime(new Date(flightToEdit.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setArrivalDate(new Date(flightToEdit.arrival_time));
            setArrivalTime(new Date(flightToEdit.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setBookingReference(flightToEdit.booking_reference);
            setPassengerName(flightToEdit.passenger_name);
            setSeatNumber(flightToEdit.seat_number);
        }
    }, [flightToEdit]);

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
        setAirline(data.airline || airline);
        setFlightNumber(data.flightNumber || flightNumber);
        setDepartureAirport(data.departureAirport || departureAirport);
        setArrivalAirport(data.arrivalAirport || arrivalAirport);

        if (data.departureDate) {
            const parsedDepartureDate = new Date(data.departureDate);
            if (!isNaN(parsedDepartureDate)) setDepartureDate(parsedDepartureDate);
        }

        if (data.departureTime) {
            setDepartureTime(data.departureTime);
        }

        if (data.arrivalDate) {
            const parsedArrivalDate = new Date(data.arrivalDate);
            if (!isNaN(parsedArrivalDate)) setArrivalDate(parsedArrivalDate);
        }

        if (data.arrivalTime) {
            setArrivalTime(data.arrivalTime);
        }

        setBookingReference(data.bookingReference || bookingReference);
        setPassengerName(data.passengerName || passengerName);
        setSeatNumber(data.seatNumber || seatNumber);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        const updatedFlight = {
            airline,
            flight_number: flightNumber,
            departure_airport: departureAirport,
            arrival_airport: arrivalAirport,
            departure_time: new Date(`${departureDate.toLocaleDateString()} ${departureTime}`).toISOString(),
            arrival_time: new Date(`${arrivalDate.toLocaleDateString()} ${arrivalTime}`).toISOString(),
            booking_reference: bookingReference,
            passenger_name: passengerName,
            seat_number: seatNumber,
            itinerary_id: itineraryId
        };
    
        setPendingFlight(updatedFlight);
        setShowWarningDialog(true);
    };
    
    const saveFlight = async (flight) => {
        setLoading(true);
        try {
            let response;
            if (flightToEdit) {
                response = await apiClient.put(`/itineraries/${itineraryId}/flights/${flightToEdit.flight_id}`, flight);
                const flightRef = doc(db, 'flights', flightToEdit.id);
                await updateDoc(flightRef, flight);
            } else {
                response = await apiClient.post(`/itineraries/${itineraryId}/flights`, flight);
                const newDocRef = doc(collection(db, 'flights'));
                await setDoc(newDocRef, flight);
            }
    
            onFlightAdded(response.data);
            setIsSuccessDialogOpen(true);
        } catch (error) {
            console.error('Failed to save flight:', error);
            setError('Failed to save flight. Please try again.');
        } finally {
            setLoading(false);
        }
    };    

    const handleClear = () => {
        setAirline('');
        setFlightNumber('');
        setDepartureAirport('');
        setArrivalAirport('');
        setDepartureDate(null);
        setDepartureTime('');
        setArrivalDate(null);
        setArrivalTime('');
        setBookingReference('');
    };

    const handleWarningClose = () => {
        setShowWarningDialog(false);
        setPendingFlight(null);
    };
    
    const handleConfirmAddOutsideDates = () => {
        setShowWarningDialog(false);
        saveFlight(pendingFlight);
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

    const onDepartureLoad = ref => {
        setDepartureSearchBox(ref);
    };

    const onDeparturePlaceChanged = () => {
        const places = departureSearchBox.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            setDepartureAirport(place.name);
        }
    };

    const onArrivalLoad = ref => {
        setArrivalSearchBox(ref);
    };

    const onArrivalPlaceChanged = () => {
        const places = arrivalSearchBox.getPlaces();
        if (places && places.length > 0) {
            const place = places[0];
            setArrivalAirport(place.name);
        }
    };

    return (
        <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
            {loading && <Loading />}
            <div className="form-container">
                <button className="back-button" onClick={onClose}>Back</button>
                <form onSubmit={handleSubmit}>
                    <h2 className="form-title">{flightToEdit ? 'Edit Flight' : 'Add Flight'}</h2>

                    <div className="upload-email-section">
                        <button type="button" onClick={handleOptionsDialogOpen} className="options-button">Select Upload Options - Coming Soon!</button>
                    </div>

                    <div className="or-divider">or</div>

                    <label>Passenger Name:
                        <input
                            type="text"
                            value={passengerName}
                            onChange={(e) => setPassengerName(e.target.value)}
                            placeholder="Enter Passenger Full Name"
                            required
                        />
                    </label>
                    <label>Airline:
                        <input type="text" value={airline} onChange={(e) => setAirline(e.target.value)} required />
                    </label>
                    <div className="flight-flex-container">
                        <label>Flight Number:
                            <input
                                type="text"
                                value={flightNumber}
                                onChange={(e) => setFlightNumber(e.target.value)}
                                placeholderText="Enter Flight Number"
                                required
                            />
                        </label>
                        <label>Seat Number:
                            <input
                                type="text"
                                value={seatNumber}
                                onChange={(e) => setSeatNumber(e.target.value)}
                                placeholder="Seat Number (e.g., 12A)"
                            />
                        </label>
                    </div>
                    <label>Departure Airport:
                        <StandaloneSearchBox
                            onLoad={onDepartureLoad}
                            onPlacesChanged={onDeparturePlaceChanged}
                            options={{ types: ['airport'] }}
                        >
                            <input
                                type="text"
                                value={departureAirport}
                                onChange={e => setDepartureAirport(e.target.value)}
                                placeholder="Enter Departure Airport"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>
                    <label>Arrival Airport:
                        <StandaloneSearchBox
                            onLoad={onArrivalLoad}
                            onPlacesChanged={onArrivalPlaceChanged}
                            options={{ types: ['airport'] }}
                        >
                            <input
                                type="text"
                                value={arrivalAirport}
                                onChange={e => setArrivalAirport(e.target.value)}
                                placeholder="Enter Arrival Airport"
                                required
                            />
                        </StandaloneSearchBox>
                    </label>

                    <div className="date-time-container">
                        <div className="date-time-section">
                            <div className="date-time-row">
                                <div>
                                    <label>Departure Date:</label>
                                    <DatePicker
                                        selected={departureDate}
                                        onChange={(date) => setDepartureDate(date)}
                                        minDate={itineraryStart}
                                        maxDate={itineraryEnd}
                                        placeholderText="Select Departure Date"
                                        dateFormat="MMMM d, yyyy"
                                    />
                                </div>
                                <div>
                                    <label>Time:</label>
                                    <input
                                        type="time"
                                        value={departureTime}
                                        onChange={(e) => setDepartureTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="date-time-section">
                            <div className="date-time-row">
                                <div>
                                    <label>Arrival Date:</label>
                                    <DatePicker
                                        selected={arrivalDate}
                                        onChange={(date) => setArrivalDate(date)}
                                        minDate={itineraryStart}
                                        maxDate={itineraryEnd}
                                        placeholderText="Select Arrival Date"
                                        dateFormat="MMMM d, yyyy"
                                    />
                                </div>
                                <div>
                                    <label>Time:</label>
                                    <input
                                        type="time"
                                        value={arrivalTime}
                                        onChange={(e) => setArrivalTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <label>Booking Reference:
                        <input type="text" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} required />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{flightToEdit ? 'Save Changes' : 'Add Flight'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>

                {/* Warning Dialog */}
                <Dialog open={showWarningDialog} onClose={handleWarningClose}>
                    <DialogTitle>Warning</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            The selected dates are outside the itinerary range. Do you want to proceed?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleWarningClose} color="primary">Cancel</Button>
                        <Button onClick={handleConfirmAddOutsideDates} color="primary">Yes, Proceed</Button>
                    </DialogActions>
                </Dialog>

                {/* Success Dialog */}
                <Dialog open={isSuccessDialogOpen} onClose={handleSuccessClose}>
                    <DialogTitle>Success</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Flight successfully {flightToEdit ? 'updated' : 'added'}!
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

export default FlightForm;
