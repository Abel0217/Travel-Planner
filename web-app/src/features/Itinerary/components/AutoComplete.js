import React, { useState, useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';

const libraries = ["places"];

const AutoComplete = ({ id, value, onChange }) => {
  const [inputValue, setInputValue] = useState(value || "");
  const autocompleteRef = useRef(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (isLoaded && !autocompleteRef.current) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        document.getElementById(id),
        {
          types: ["(cities)"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
          setInputValue(place.formatted_address);
        }
      });
    }
  }, [isLoaded, onChange, id]);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  return (
    <input
      id={id}
      value={inputValue}
      onChange={(e) => {
        setInputValue(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="Enter a destination"
      style={{ width: "100%", padding: "8px", fontSize: "16px" }}
    />
  );
};

export default AutoComplete;
