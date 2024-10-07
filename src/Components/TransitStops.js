import React, { useState } from 'react';
import { getTransitStops } from '../api/transitlandApi';

const TransitStops = () => {
  const [location, setLocation] = useState({ latitude: 37.7749, longitude: -122.4194 }); 
  const [radius, setRadius] = useState(500); 
  const [stops, setStops] = useState([]);

  const handleGetStops = async () => {
    try {
      const results = await getTransitStops(location.latitude, location.longitude, radius);
      setStops(results);
    } catch (error) {
      console.error('Error fetching transit stops:', error);
    }
  };

  return (
    <div>
      <h2>Transit Stops</h2>
      <button onClick={handleGetStops}>Get Stops</button>
      <div>
        {stops.map(stop => (
          <div key={stop.onestop_id}>
            <p>Stop Name: {stop.name}</p>
            <p>Stop ID: {stop.onestop_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransitStops;
