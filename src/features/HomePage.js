import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import './css/HomePage.css';
import { AuthContext } from '../Contexts/AuthContext';

// Importing all images
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
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Background change logic
  useEffect(() => {
    const intervalId = setInterval(() => {
      setBackgroundIndex((prevIndex) => (prevIndex + 1) % imageList.length); // Now it will rotate through all images
    }, 10000); // Adjust for number of images, changes every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Fetch upcoming itineraries
  useEffect(() => {
    const fetchItineraries = async () => {
      try {
        const response = await axios.get('/itineraries'); // Adjust your backend endpoint here if necessary
        const itineraries = response.data;

        // Filter for upcoming trips
        const upcoming = itineraries.find(itinerary => new Date(itinerary.end_date) >= new Date());
        setUpcomingTrip(upcoming || null);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch itineraries", error);
        setLoading(false);
      }
    };

    fetchItineraries();
  }, []);

  // Countdown logic for upcoming trips
  const calculateCountdown = (startDate, endDate) => {
    const today = new Date();
    const tripStartDate = new Date(startDate);
    const tripEndDate = new Date(endDate);
    const startDifference = (tripStartDate - today) / (1000 * 3600 * 24);
    const endDifference = (tripEndDate - today) / (1000 * 3600 * 24);

    if (endDifference < 0) {
      return { text: 'Trip has ended', color: 'gray' };
    } else if (startDifference === 0) {
      return { text: 'Trip starts today!', color: 'green' };
    } else if (startDifference === 1) {
      return { text: 'In 1 day', color: 'red' };
    } else if (startDifference < 0) {
      return { text: 'Trip ongoing', color: 'green' };
    }
    return { text: `In ${Math.round(startDifference)} days`, color: 'red' };
  };

  return (
    <div className="homepage">
      {/* Welcome message inside a floating box */}
      <div className="welcome-box">
        <h1>Welcome Back, {currentUser ? currentUser.name : 'Guest'}!</h1>
      </div>

      {/* Full-screen background section */}
      <div
        className="homepage-background"
        style={{ backgroundImage: `url(${imageList[backgroundIndex]})` }}
      ></div>

      {/* Fixed Upcoming Trip Card */}
      {!loading && upcomingTrip ? (
        <div className="upcoming-trip">
          <h2>Upcoming Trip</h2>
          <p>{upcomingTrip.title}</p>
          <p>{upcomingTrip.start_date} to {upcomingTrip.end_date}</p>
          <p>Destination: {upcomingTrip.destinations}</p>
          <span style={{ color: calculateCountdown(upcomingTrip.start_date, upcomingTrip.end_date).color }}>
            {calculateCountdown(upcomingTrip.start_date, upcomingTrip.end_date).text}
          </span>
        </div>
      ) : (
        <div className="upcoming-trip">
          <h2>No Upcoming Trip</h2>
        </div>
      )}
    </div>
  );
};

export default HomePage;
