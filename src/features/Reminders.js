import React, { useEffect, useState } from 'react';
import './css/Reminders.css'; // Add styling later
import apiClient from '../api/apiClient'; // Assuming you have an apiClient set up for backend requests

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const response = await apiClient.get('/notifications');
        setReminders(response.data);
      } catch (error) {
        console.error('Failed to fetch reminders', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="reminders-page">
      <h1>Your Reminders</h1>
      {reminders.length === 0 ? (
        <p>No current reminders.</p>
      ) : (
        <ul>
          {reminders.map(reminder => (
            <li key={reminder.id}>
              <p>{reminder.message}</p>
              <span>{new Date(reminder.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Reminders;
