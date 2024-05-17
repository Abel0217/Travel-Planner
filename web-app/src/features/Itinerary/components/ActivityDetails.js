import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import ActivityForm from './ActivityForm';

function ActivityDetails({ itineraryId }) {
    const [activities, setActivities] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchActivities();
    }, [itineraryId]);

    const fetchActivities = async () => {
        try {
            const response = await apiClient.get(`/itineraries/${itineraryId}/activities`);
            setActivities(response.data);
            setError('');
        } catch (error) {
            console.error('Failed to fetch activities:', error);
            setError('Failed to fetch activities');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleActivityAdded = (newActivity) => {
        setActivities([...activities, newActivity]);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Activity Details</h2>
            <div className="card-container">
                {activities.map(activity => (
                    <div key={activity.activity_id} className="details-card">
                        <h3 className="details-card-title">{activity.title}</h3>
                        <p className="details-card-info"><span className="field-title">Location:</span> {activity.location}</p>
                        <p className="details-card-info"><span className="field-title">Date:</span> {formatDate(activity.activity_date)}</p>
                        <p className="details-card-info"><span className="field-title">Start Time:</span> {activity.start_time}</p>
                        <p className="details-card-info"><span className="field-title">End Time:</span> {activity.end_time}</p>
                    </div>
                ))}
                <div className="add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <ActivityForm itineraryId={itineraryId} onClose={() => setIsModalOpen(false)} onActivityAdded={handleActivityAdded} />
            )}
        </div>
    );
}

export default ActivityDetails;
