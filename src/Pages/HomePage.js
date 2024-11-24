import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import './css/HomePage.css';
import { AuthContext } from '../Contexts/AuthContext';

import Beach from './css/Images/Beach.jpg';
import Hollywood from './css/Images/Hollywood.jpg';
import London from './css/Images/London.jpg';
import Louvre from './css/Images/Louvre.jpg';
import Mountains from './css/Images/Mountains.jpg';
import Paris from './css/Images/Paris.jpg';
import Rome from './css/Images/Rome.jpg';
import TajMahal from './css/Images/Taj Mahal.jpg';
import Toronto from './css/Images/Toronto.jpg';
import Vegas from './css/Images/Vegas.jpg';
import Venice from './css/Images/Venice.jpg';

const imageList = [
    Beach,
    Hollywood,
    London,
    Louvre,
    Mountains,
    Paris,
    Rome,
    TajMahal,
    Toronto,
    Vegas,
    Venice,
];

const HomePage = () => {
    const { currentUser } = useContext(AuthContext); 
    const [backgroundIndex, setBackgroundIndex] = useState(0);
    const [userName, setUserName] = useState({ firstName: '', lastName: '' }); 
    const navigate = useNavigate(); 

    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * imageList.length);
        setBackgroundIndex(randomIndex);
    }, []);

    useEffect(() => {
        const fetchUserName = async () => {
            try {
                if (!currentUser) {
                    console.log('No current user found.');
                    return;
                }

                console.log('Fetching user name...');
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken(); 

                if (!token) {
                    console.error('Failed to retrieve Firebase token.');
                    return;
                }

                console.log('Firebase Token:', token);
                const response = await axios.get('http://localhost:3001/users/name', {
                    headers: { Authorization: `Bearer ${token}` }, 
                });

                console.log('Response from /users/name:', response.data);
                const { first_name, last_name } = response.data;
                setUserName({ firstName: first_name, lastName: last_name });
            } catch (error) {
                console.error('Failed to fetch user name:', error);
                console.error('Error Details:', error.response?.data || error.message);
            }
        };

        fetchUserName();
    }, [currentUser]);

    return (
        <div className="homepage">
            {/* Welcome message */}
            <div className="welcome-box">
                <h1>
                    Welcome Back {userName.firstName} {userName.lastName}!
                </h1>
            </div>

            {/* Full-screen background section */}
            <div
                className="homepage-background"
                style={{ backgroundImage: `url(${imageList[backgroundIndex]})` }}
            ></div>

            {/* Quick Action Buttons */}
            <div className="action-buttons">
                <button
                    className="action-button"
                    onClick={() => navigate('/itineraries-view')}
                >
                    View Itineraries
                </button>
                <button
                    className="action-button"
                    onClick={() => navigate('/itineraries/create')}
                >
                    Create Itinerary
                </button>
                <button
                    className="action-button"
                    onClick={() => navigate('/friends')}
                >
                    Add Friends
                </button>
            </div>
        </div>
    );
};

export default HomePage;
