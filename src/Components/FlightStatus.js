import React, { useState } from 'react';
import { getFlightStatus } from '../api/flightStatusApi';

const FlightStatus = () => {
  const [flightNumber, setFlightNumber] = useState('');
  const [flightStatus, setFlightStatus] = useState(null);

  const handleSearch = async () => {
    try {
      const results = await getFlightStatus(flightNumber);
      setFlightStatus(results[0]);
    } catch (error) {
      console.error('Error fetching flight status:', error);
    }
  };

  return (
    <div>
      <h2>Flight Status</h2>
      <input
        type="text"
        value={flightNumber}
        onChange={(e) => setFlightNumber(e.target.value)}
        placeholder="Enter flight number"
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        {flightStatus && (
          <div>
            <h3>{flightStatus.airline.name} - {flightStatus.flight.iata}</h3>
            <p>Status: {flightStatus.flight_status}</p>
            <p>Departure: {flightStatus.departure.iata} - {flightStatus.departure.estimated}</p>
            <p>Arrival: {flightStatus.arrival.iata} - {flightStatus.arrival.estimated}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlightStatus;
