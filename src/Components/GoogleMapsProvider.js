import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES = ['places'];

function GoogleMapsProvider({ children }) {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });
  return children;
}

export default GoogleMapsProvider;
