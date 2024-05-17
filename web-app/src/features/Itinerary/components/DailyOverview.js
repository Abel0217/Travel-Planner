import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../../api/apiClient'; // Adjust the import path as needed
import { format, eachDayOfInterval } from 'date-fns';

const DailyOverview = () => {
    const { itineraryId } = useParams();
    const [days, setDays] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchItineraryDetails = async () => {
            try {
                const response = await apiClient.get(`/itineraries/${itineraryId}`);
                const itinerary = response.data;
                setStartDate(itinerary.startDate);
                setEndDate(itinerary.endDate);

                const days = eachDayOfInterval({
                    start: new Date(itinerary.startDate),
                    end: new Date(itinerary.endDate)
                });

                const daysWithActivities = await Promise.all(days.map(async (day) => {
                    const response = await apiClient.get(`/itineraries/${itineraryId}/activities?date=${format(day, 'yyyy-MM-dd')}`);
                    return {
                        date: day,
                        activities: response.data
                    };
                }));

                setDays(daysWithActivities);
            } catch (error) {
                console.error('Error fetching itinerary details', error);
            }
        };

        fetchItineraryDetails();
    }, [itineraryId]);

    return (
        <div>
            <h2>Daily Overview</h2>
            <div>
                {days.map((day, index) => (
                    <div key={index}>
                        <h3>{format(day.date, 'EEEE, MMMM do')}</h3>
                        {day.activities.length > 0 ? (
                            day.activities.map((activity, actIndex) => (
                                <div key={actIndex}>
                                    <p>{activity.name}</p>
                                    <p>{activity.time}</p>
                                </div>
                            ))
                        ) : (
                            <p>No activities</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailyOverview;
