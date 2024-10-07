import React, { useState } from 'react';
import { getEstimates } from '../api/uberApi';

const UberEstimates = () => {
  const [startLocation, setStartLocation] = useState({ latitude: 37.7749, longitude: -122.4194 }); // San Francisco
  const [endLocation, setEndLocation] = useState({ latitude: 37.7849, longitude: -122.4094 });
  const [estimates, setEstimates] = useState([]);

  const handleGetEstimates = async () => {
    try {
      const results = await getEstimates(startLocation.latitude, startLocation.longitude, endLocation.latitude, endLocation.longitude);
      setEstimates(results);
    } catch (error) {
      console.error('Error fetching Uber estimates:', error);
    }
  };

  return (
    <div>
      <h2>Uber Estimates</h2>
      <button onClick={handleGetEstimates}>Get Estimates</button>
      <div>
        {estimates.map(estimate => (
          <div key={estimate.product_id}>
            <p>Product: {estimate.localized_display_name}</p>
            <p>Estimate: {estimate.estimate}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UberEstimates;
