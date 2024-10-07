import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import './css/DetailsCard.css';
import ActivityForm from './ActivityForm';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from '../../../firebaseConfig';

function ActivityDetails({ itineraryId }) {
    const [activities, setActivities] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState('');
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        if (!itineraryId) {
            console.error('Itinerary ID is undefined');
            setError('Itinerary ID is undefined or not provided');
            return;
        }
        fetchActivities();
        setupFirestoreListeners();
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

    const setupFirestoreListeners = () => {
        const activitiesQuery = query(collection(db, 'activities'), where('itineraryId', '==', itineraryId));
        
        onSnapshot(activitiesQuery, (snapshot) => {
            const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActivities(activities);
        });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatTime = (timeString) => {
        if (!timeString) {
            return 'Invalid Time';
        }
        const [hours, minutes] = timeString.split(':');
        return `${hours}:${minutes}`;
    };

    const handleActivityAdded = (newActivity) => {
        if (selectedActivity) {
            setActivities(activities.map(activity =>
                activity.activity_id === newActivity.activity_id ? newActivity : activity
            ));
        } else {
            setActivities([...activities, newActivity]);
        }
    };

    const handleEditActivity = (activity) => {
        setSelectedActivity(activity);
        setIsModalOpen(true);
    };

    const handleViewActivity = (activity) => {
        console.log('View activity:', activity);
    };

    const handleDeleteActivity = async () => {
        try {
            await apiClient.delete(`/itineraries/${itineraryId}/activities/${selectedActivity.activity_id}`);
            setActivities(activities.filter(activity => activity.activity_id !== selectedActivity.activity_id));
            setIsDeleteDialogOpen(false);
            setSelectedActivity(null);
        } catch (error) {
            console.error('Failed to delete activity:', error);
        }
    };

    const handleOpenDeleteDialog = (activity) => {
        setSelectedActivity(activity);
        setIsDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setIsDeleteDialogOpen(false);
        setSelectedActivity(null);
    };

    if (error) return <div>{error}</div>;

    return (
        <div>
            <h2>Activity Details</h2>
            <div className="card-container">
                {activities.map(activity => (
                    <div key={activity.activity_id} className="details-card">
                        <div>
                            <h3 className="details-card-title">{activity.title}</h3>
                            <p className="details-card-info"><span className="field-title">Location:</span> {activity.location}</p>
                            <p className="details-card-info"><span className="field-title">Date:</span> {formatDate(activity.activity_date)}</p>
                            <p className="details-card-info"><span className="field-title">Start Time:</span> {formatTime(activity.start_time)}</p>
                            {activity.end_time && <p className="details-card-info"><span className="field-title">End Time:</span> {formatTime(activity.end_time)}</p>}
                        </div>
                        <div className="details-card-footer">
                            <Button size="small" onClick={() => handleEditActivity(activity)}>Edit</Button>
                            <Button size="small" onClick={() => handleViewActivity(activity)}>View</Button>
                            <Button size="small" color="secondary" onClick={() => handleOpenDeleteDialog(activity)}>Delete</Button>
                        </div>
                    </div>
                ))}
                <div className="details-card add-card" onClick={() => setIsModalOpen(true)}>
                    <div className="add-card-icon">+</div>
                </div>
            </div>
            {isModalOpen && (
                <ActivityForm
                    itineraryId={itineraryId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedActivity(null);
                    }}
                    onActivityAdded={handleActivityAdded}
                    activityToEdit={selectedActivity}
                />
            )}
            <Dialog
                open={isDeleteDialogOpen}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the activity "{selectedActivity?.title}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteActivity} color="secondary">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ActivityDetails;
