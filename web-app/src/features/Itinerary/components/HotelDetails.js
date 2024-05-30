import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import HotelForm from './HotelForm';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function HotelDetails({ itineraryId }) {
    const [hotels, setHotels] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchHotels();
        setupFirestoreListeners();
    }, [itineraryId]);

    const fetchHotels = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/hotels`);
            setHotels(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch hotels', error);
            setError('Failed to fetch hotels');
        }
    };

    const setupFirestoreListeners = () => {
        const hotelsQuery = query(collection(db, 'hotels'), where('itineraryId', '==', itineraryId));
        
        onSnapshot(hotelsQuery, (snapshot) => {
            const hotels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHotels(hotels);
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleHotelAdded = (newHotel) => {
        if (selectedHotel) {
            setHotels(hotels.map(hotel =>
                hotel.hotel_id === newHotel.hotel_id ? newHotel : hotel
            ));
        } else {
            setHotels([...hotels, newHotel]);
        }
    };

    const handleEditHotel = (hotel) => {
        setSelectedHotel(hotel);
        setIsModalOpen(true);
    };

    const handleViewHotel = (hotel) => {
        console.log('View hotel:', hotel);
    };

    const handleDeleteHotel = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/hotels/${selectedHotel.hotel_id}`);
            setHotels(hotels.filter(hotel => hotel.hotel_id !== selectedHotel.hotel_id));
            setIsDeleteDialogOpen(false);
            setSelectedHotel(null);
        } catch (error) {
            console.error('Failed to delete hotel:', error);
        }
    };

    const handleOpenDeleteDialog = (hotel) => {
        setSelectedHotel(hotel);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedHotel(null);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Hotel Details</h2>
            <div className="card-container">
                {hotels.map(hotel => (
                    <div key={hotel.hotel_id} className="details-card">
                        <div>
                            <h3 className="details-card-title">{hotel.hotel_name}</h3>
                            <p className="details-card-info"><span className="field-title">Check-in Date:</span> {formatDate(hotel.check_in_date)}</p>
                            <p className="details-card-info"><span className="field-title">Check-out Date:</span> {formatDate(hotel.check_out_date)}</p>
                            <p className="details-card-info"><span className="field-title">Address:</span> {hotel.address}</p>
                            <p className="details-card-info"><span className="field-title">Booking Confirmation:</span> {hotel.booking_confirmation}</p>
                        </div>
                        <div className="details-card-footer">
                            <Button size="small" onClick={() => handleEditHotel(hotel)}>Edit</Button>
                            <Button size="small" onClick={() => handleViewHotel(hotel)}>View</Button>
                            <Button size="small" color="secondary" onClick={() => handleOpenDeleteDialog(hotel)}>Delete</Button>
                        </div>
                    </div>
                ))}
                <div className="details-card add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <HotelForm
                    itineraryId={itineraryId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedHotel(null);
                    }}
                    onHotelAdded={handleHotelAdded}
                    hotelToEdit={selectedHotel}
                />
            )}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the hotel "{selectedHotel?.hotel_name}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteHotel} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default HotelDetails;
