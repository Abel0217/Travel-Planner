import React, { useEffect, useRef, useState } from 'react';
import { Autocomplete } from '@react-google-maps/api';

function PlaceSuggest({
  value,
  onChange,
  onPlace,
  placeholder,
  types,
  countryIso,
  disabled,
}) {
  const autocomplete = useRef(null);
  const [mapsReady, setMapsReady] = useState(() => Boolean(window.google?.maps?.places));

  useEffect(() => {
    if (mapsReady) return undefined;
    const timer = window.setInterval(() => {
      if (window.google?.maps?.places) {
        setMapsReady(true);
        window.clearInterval(timer);
      }
    }, 150);
    return () => window.clearInterval(timer);
  }, [mapsReady]);

  const handlePlaceChanged = () => {
    const instance = autocomplete.current;
    if (!instance) return;
    const place = instance.getPlace();
    if (!place || !place.address_components) return;
    onPlace(place);
  };

  const input = (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
    />
  );

  if (!mapsReady) {
    return <div className="place-suggest">{input}</div>;
  }

  return (
    <Autocomplete
      onLoad={(instance) => {
        autocomplete.current = instance;
      }}
      onPlaceChanged={handlePlaceChanged}
      options={{
        types,
        fields: ['address_components', 'formatted_address', 'name'],
        ...(countryIso ? { componentRestrictions: { country: countryIso } } : {}),
      }}
    >
      {input}
    </Autocomplete>
  );
}

export default PlaceSuggest;
