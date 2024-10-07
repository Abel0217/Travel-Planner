import React, { useState } from 'react';
import { searchPlaces } from '../api/placesApi';
import { LoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import Map from '../api/mapsApi'; // Ensure this is the correct path

const Places = () => {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('37.7749,-122.4194'); // Default to San Francisco
  const [radius, setRadius] = useState(1000); // Default to 1 km
  const [places, setPlaces] = useState([]);
  const [searchBox, setSearchBox] = useState(null);
  const [markers, setMarkers] = useState([]);

  const apiKey = 'AIzaSyDka0NQRQUGYEq-AFevr3UaEVe4R5Uz0qE'; // Your API key

  const handleSearch = async () => {
    try {
      const results = await searchPlaces(query, location, radius);
      setPlaces(results);
      setMarkers(results.map(place => ({
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      })));
    } catch (error) {
      console.error('Error searching places:', error);
    }
  };

  const onLoad = ref => {
    setSearchBox(ref);
  };

  const onPlacesChanged = () => {
    const places = searchBox.getPlaces();
    if (places.length > 0) {
      const place = places[0];
      setLocation(`${place.geometry.location.lat()},${place.geometry.location.lng()}`);
      setQuery(place.name);
      handleSearch();
    }
  };

  return (
    <div>
      <h2>Find Places</h2>
      <LoadScript googleMapsApiKey={apiKey} libraries={['places']}>
        <StandaloneSearchBox onLoad={onLoad} onPlacesChanged={onPlacesChanged}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter search term"
            style={{
              boxSizing: 'border-box',
              border: '1px solid transparent',
              width: '240px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '3px',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              fontSize: '14px',
              outline: 'none',
              textOverflow: 'ellipses'
            }}
          />
        </StandaloneSearchBox>
      </LoadScript>
      <button onClick={handleSearch}>Search</button>
      <div>
        {places.map(place => (
          <div key={place.place_id}>
            <h3>{place.name}</h3>
            <p>{place.formatted_address}</p>
          </div>
        ))}
      </div>
      <Map markers={markers} />
    </div>
  );
};

export default Places;
