import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function ActivityForm({ itineraryId, startDate, endDate, onClose, onActivityAdded, activityToEdit }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [activityDate, setActivityDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(null);
    const [reservationNumber, setReservationNumber] = useState('');

    useEffect(() => {
        if (activityToEdit) {
            setTitle(activityToEdit.title);
            setDescription(activityToEdit.description);
            setLocation(activityToEdit.location);
            setActivityDate(new Date(activityToEdit.activity_date));
            setStartTime(parseTime(activityToEdit.start_time));
            setEndTime(activityToEdit.end_time ? parseTime(activityToEdit.end_time) : null);
            setReservationNumber(activityToEdit.reservation_number);
        }
    }, [activityToEdit]);

    const parseTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(hours, minutes);
        return date;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const updatedActivity = {
            title,
            description,
            location,
            activity_date: activityDate.toISOString().split('T')[0],
            start_time: startTime.toTimeString().split(' ')[0].substring(0, 5),
            end_time: endTime ? endTime.toTimeString().split(' ')[0].substring(0, 5) : null,
            reservation_number: reservationNumber,
            itinerary_id: itineraryId
        };

        try {
            if (activityToEdit) {
                const response = await apiClient.put(`/itineraries/${itineraryId}/activities/${activityToEdit.activity_id}`, updatedActivity);
                onActivityAdded(response.data);
                
                // Update Firestore
                const activityRef = doc(db, 'activities', activityToEdit.id);
                await updateDoc(activityRef, updatedActivity);
            } else {
                const response = await apiClient.post(`/itineraries/${itineraryId}/activities`, updatedActivity);
                onActivityAdded(response.data);
                
                // Add to Firestore
                const newDocRef = doc(collection(db, 'activities'));
                await setDoc(newDocRef, updatedActivity);
            }
        } catch (error) {
            console.error('Failed to save activity:', error);
        }
        onClose();  // Ensure the form closes after saving
    };

    const handleClear = () => {
        setTitle('');
        setDescription('');
        setLocation('');
        setActivityDate(new Date());
        setStartTime(new Date());
        setEndTime(null);
        setReservationNumber('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">{activityToEdit ? 'Edit Activity' : 'Add Activity'}</h2>
                <button className="close-button" onClick={onClose}>×</button>
                <form onSubmit={handleSubmit}>
                    <label>Title:
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                    </label>
                    <label>Location:
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} required />
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
                                isClearable
                            />
                        </label>
                    </div>
                    <label>Reservation Number:
                        <input type="text" value={reservationNumber} onChange={e => setReservationNumber(e.target.value)} />
                    </label>
                    <label>Description:
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows="5"
                            style={{ width: '100%' }}
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">{activityToEdit ? 'Save Changes' : 'Add Activity'}</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ActivityForm;
