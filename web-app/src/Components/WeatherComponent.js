import React, { useState, useEffect } from 'react';
import { fetchWeather } from '../api/weatherApi';

function WeatherComponent({ location }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getWeather = async () => {
      try {
        const data = await fetchWeather(location);
        setWeather(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    getWeather();
  }, [location]);

  if (loading) return <p>Loading...</p>;
  if (!weather) return <p>No weather data available</p>;

  return (
    <div>
      <h2>Weather in {weather.name}</h2>
      <p>Temperature: {weather.main.temp}°C</p>
      <p>Weather: {weather.weather[0].description}</p>
    </div>
  );
}

export default WeatherComponent;
