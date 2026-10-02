import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import apiClient from '../../../api/apiClient';
import TripMap from './overview/TripMap';
import { buildDays } from './overview/overviewModel';
import { geocodeQuery } from '../../../utils/tripGeo';
import useMapProvider from '../../../utils/useMapProvider';
import './css/TripOverview.css';

const LIBRARIES = ['places'];
const EMPTY = { activities: [], hotels: [], flights: [], restaurants: [], transport: [] };

// The map shown above the Bookings and My Bookings tabs. It uses the very same pins as the
// Overview, and it refreshes as soon as a booking is added, changed or removed (refreshKey).
const MapComponent = ({ center, itineraryId, destination, startDate, endDate, refreshKey = 0 }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });
  const provider = useMapProvider(loadError);
  const ready = isLoaded || Boolean(loadError) || provider === 'osm';

  const [data, setData] = useState(EMPTY);
  const [geo, setGeo] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const geoRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    if (!itineraryId) return undefined;
    const get = (path) => apiClient.get(`/itineraries/${itineraryId}/${path}`).then((response) => response.data || []).catch(() => []);
    Promise.all([get('activities'), get('hotels'), get('flights'), get('restaurants'), get('transport')])
      .then(([activities, hotels, flights, restaurants, transport]) => {
        if (!cancelled) setData({ activities, hotels, flights, restaurants, transport });
      });
    return () => { cancelled = true; };
  }, [itineraryId, refreshKey]);

  const { days } = useMemo(
    () => buildDays({ startDate, endDate, destination, data }),
    [startDate, endDate, destination, data]
  );

  const queries = useMemo(
    () => [...new Set(days.flatMap((day) => [...day.items.map((item) => item.query), day.staying?.query]).filter(Boolean))],
    [days]
  );
  const queriesKey = queries.join('||');

  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const need = queries.filter((place) => !(place in geoRef.current));
    if (need.length === 0) {
      setGeo({ ...geoRef.current });
      return undefined;
    }
    (async () => {
      for (let i = 0; i < need.length; i += 4) {
        const chunk = need.slice(i, i + 4);
        // eslint-disable-next-line no-await-in-loop
        const found = await Promise.all(chunk.map((place) => geocodeQuery(place, center)));
        if (cancelled) return;
        chunk.forEach((place, index) => { geoRef.current[place] = found[index]; });
        setGeo({ ...geoRef.current });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, queriesKey, provider]);

  if (!center) {
    return <div className="map-placeholder">Map will appear once the destination loads.</div>;
  }
  if (provider !== 'osm' && !isLoaded) {
    return <div className="map-placeholder">Loading Map…</div>;
  }

  return (
    <div className="trip-overview trip-map-block">
      <div className="trip-map-frame">
        <TripMap
          days={days}
          focusDay="all"
          selectedId={selectedId}
          onSelect={setSelectedId}
          geo={geo}
          center={center}
          engine={provider}
        />
      </div>
    </div>
  );
};

export default MapComponent;
