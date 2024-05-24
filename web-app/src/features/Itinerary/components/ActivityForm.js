import React, { useState } from 'react';
import apiClient from '../../../api/apiClient';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './css/Forms.css';

function ActivityForm({ itineraryId, startDate, endDate, onClose, onActivityAdded }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [activityDate, setActivityDate] = useState(new Date());
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [reservationNumber, setReservationNumber] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newActivity = {
            title,
            description,
            location,
            activity_date: activityDate.toISOString().split('T')[0], // Just the date part
            start_time: startTime.toTimeString().split(' ')[0].substring(0, 5), // Time in HH:MM
            end_time: endTime.toTimeString().split(' ')[0].substring(0, 5), // Time in HH:MM
            reservation_number: reservationNumber,
            itinerary_id: itineraryId
        };

        try {
            const response = await apiClient.post(`/itineraries/${itineraryId}/activities`, newActivity);
            onActivityAdded(response.data);
            onClose();
        } catch (error) {
            console.error('Failed to add activity:', error);
        }
    };

    const handleClear = () => {
        setTitle('');
        setDescription('');
        setLocation('');
        setActivityDate(new Date());
        setStartTime(new Date());
        setEndTime(new Date());
        setReservationNumber('');
    };

    return (
        <div className="form-modal">
            <div className="form-container">
                <h2 className="form-title">Add Activity</h2>
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
                            required
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit">Add Activity</button>
                        <button type="button" onClick={handleClear}>Clear</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ActivityForm;
