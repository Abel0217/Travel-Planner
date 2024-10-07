import React, { useEffect, useState } from 'react';
import axios from 'axios';

const NotificationComponent = () => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await axios.get(`/api/notifications`);
                setNotifications(response.data);
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
    }, []);

    return (
        <div>
            <h2>Your Notifications</h2>
            <ul>
                {notifications.length > 0 ? (
                    notifications.map((notification) => (
                        <li key={notification.notification_id}>
                            {notification.message}
                        </li>
                    ))
                ) : (
                    <p>No notifications available</p>
                )}
            </ul>
        </div>
    );
};

export default NotificationComponent;
