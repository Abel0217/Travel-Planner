import React, { useState } from 'react';
import { getEvents } from '../api/seatGeekApi';

const EventFinder = () => {
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState([]);

  const handleSearch = async () => {
    try {
      const results = await getEvents(query);
      setEvents(results);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  return (
    <div>
      <h2>Find Events</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for events"
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        {events.map(event => (
          <div key={event.id}>
            <h3>{event.title}</h3>
            <p>{event.venue.name} - {event.datetime_local}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventFinder;
