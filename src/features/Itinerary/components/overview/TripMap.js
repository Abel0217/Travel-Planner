import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import OsmCanvas from './OsmCanvas';
import { DAY_COLORS, TYPE_META, formatDay } from './overviewModel';
import { Glyph } from './glyphs';
import { directionsUrl, formatDistance, formatMinutes, haversineKm, pinIcon, placeUrl, walkInfo } from '../../../../utils/tripGeo';

const MAP_STYLE = { width: '100%', height: '100%' };

const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  clickableIcons: true,
  gestureHandling: 'cooperative',
};

const FILTERS = ['stay', 'food', 'activity', 'flight', 'transport'];

function TripMap({ days, focusDay, selectedId, onSelect, geo, center, engine = 'google', trace = null, onDirections = null }) {
  const useGoogle = engine === 'google';
  const mapRef = useRef(null);
  const [mapType, setMapType] = useState('roadmap');
  const [hidden, setHidden] = useState({});

  // Every pin that should be on the map right now.
  const pins = useMemo(() => {
    const list = [];
    const seenStays = new Set();
    days.forEach((day) => {
      if (focusDay !== 'all' && day.key !== focusDay) return;
      day.items.forEach((item) => {
        const position = geo[item.query];
        if (!position) return;
        // a hotel appears once, even if it has a check-in and a check-out
        if (item.type === 'stay') {
          if (seenStays.has(item.stayId)) return;
          seenStays.add(item.stayId);
        }
        list.push({ item, position, day });
      });
      // the hotel you sleep in is useful context even on a day with no check-in
      if (focusDay !== 'all' && day.staying && !seenStays.has(day.staying.id)) {
        const position = geo[day.staying.query];
        if (position) {
          seenStays.add(day.staying.id);
          list.push({
            item: {
              id: `${day.staying.id}-base`,
              type: 'stay',
              title: day.staying.name,
              address: day.staying.address,
              query: day.staying.query,
              tag: 'Your Base',
              subtitle: '',
              details: [],
              timeLabel: '',
              order: 0,
              stayId: day.staying.id,
              dayKey: day.key,
            },
            position,
            day,
          });
        }
      }
    });
    return list.filter((pin) => !hidden[pin.item.type]);
  }, [days, focusDay, geo, hidden]);

  // Dashed walking line between the numbered stops of each visible day.
  const routes = useMemo(() => {
    const byDay = new Map();
    pins.forEach((pin) => {
      if (pin.item.type !== 'activity' && pin.item.type !== 'food') return;
      if (!byDay.has(pin.day.key)) byDay.set(pin.day.key, { day: pin.day, path: [] });
      byDay.get(pin.day.key).path.push(pin.position);
    });
    return [...byDay.values()].filter((route) => route.path.length > 1);
  }, [pins]);

  const fit = useCallback(() => {
    const map = mapRef.current;
    if (!useGoogle || !map || !window.google?.maps) return;
    if (pins.length === 0) {
      if (center) {
        map.setCenter(center);
        map.setZoom(12);
      }
      return;
    }
    if (pins.length === 1) {
      map.setCenter(pins[0].position);
      map.setZoom(15);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    pins.forEach((pin) => bounds.extend(pin.position));
    map.fitBounds(bounds, { top: 70, right: 130, bottom: 60, left: 40 });
  }, [pins, center]);

  // Re-frame when the visible set changes (new day, filters, pins arriving).
  const pinsKey = pins.map((pin) => pin.item.id).join('|');
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinsKey, focusDay]);

  // Frame a route picked in the Directions panel.
  useEffect(() => {
    if (!useGoogle || !trace || !mapRef.current || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    trace.path.forEach((point) => bounds.extend(point));
    mapRef.current.fitBounds(bounds, { top: 70, right: 150, bottom: 180, left: 60 });
  }, [trace, useGoogle]);

  const selected = pins.find((pin) => pin.item.id === selectedId)
    || pins.find((pin) => pin.item.stayId && selectedId && selectedId.startsWith(pin.item.stayId))
    || null;

  // Selecting something from the list glides the map to it.
  useEffect(() => {
    if (!useGoogle || !selected || !mapRef.current) return;
    mapRef.current.panTo(selected.position);
    if ((mapRef.current.getZoom() || 0) < 14) mapRef.current.setZoom(15);
  }, [selected]);

  const hotelPin = selected && selected.item.type !== 'stay'
    ? pins.find((pin) => pin.item.type === 'stay' && pin.day.key === selected.day.key)
    : null;
  const fromHotel = hotelPin ? walkInfo(hotelPin.position, selected.position) : null;
  const straight = hotelPin ? haversineKm(hotelPin.position, selected.position) : null;

  const missing = useMemo(() => {
    let count = 0;
    days.forEach((day) => {
      if (focusDay !== 'all' && day.key !== focusDay) return;
      day.items.forEach((item) => {
        if (item.query && geo[item.query] === null) count += 1;
      });
    });
    return count;
  }, [days, focusDay, geo]);

  return (
    <div className="ov-map">
      {!useGoogle ? (
        <OsmCanvas
          pins={pins}
          routes={routes}
          selectedId={selectedId}
          selected={selected}
          onSelect={onSelect}
          mapType={mapType}
          center={center}
          fitKey={`${pinsKey}|${focusDay}`}
          focusDay={focusDay}
          trace={trace}
        />
      ) : (
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={center || undefined}
        zoom={12}
        options={{ ...MAP_OPTIONS, mapTypeId: mapType }}
        onLoad={(map) => { mapRef.current = map; fit(); }}
        onUnmount={() => { mapRef.current = null; }}
        onClick={() => onSelect(null)}
      >
        {routes.map((route) => (
          <Polyline
            key={route.day.key}
            path={route.path}
            options={{
              strokeOpacity: 0,
              clickable: false,
              icons: [{
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.85,
                  strokeColor: DAY_COLORS[route.day.index % DAY_COLORS.length],
                  strokeWeight: 3,
                  scale: 3,
                },
                offset: '0',
                repeat: '14px',
              }],
            }}
          />
        ))}
        {trace && trace.path.length > 1 ? (
          <>
            <Polyline path={trace.path} options={{ strokeColor: '#ffffff', strokeOpacity: 0.9, strokeWeight: 9, clickable: false, zIndex: 5 }} />
            <Polyline path={trace.path} options={{ strokeColor: '#222946', strokeOpacity: 0.95, strokeWeight: 5, clickable: false, zIndex: 6 }} />
          </>
        ) : null}
        {pins.map((pin) => {
          const meta = TYPE_META[pin.item.type];
          const active = pin.item.id === selectedId;
          return (
            <Marker
              key={pin.item.id}
              position={pin.position}
              title={`${pin.item.title}${pin.item.timeLabel ? ` · ${pin.item.timeLabel}` : ''}`}
              icon={pinIcon({
                color: meta.color,
                glyph: pin.item.icon || pin.item.type,
                badge: focusDay === 'all' ? (pin.item.dayNum || '') : (pin.item.order || ''),
                scale: active ? 1.2 : 0.88,
              })}
              zIndex={active ? 1000 : pin.item.order || 1}
              onClick={() => onSelect(pin.item.id)}
            />
          );
        })}
      </GoogleMap>
      )}

      <div className="ov-map-switch" role="group" aria-label="Map Type">
        <button type="button" className={mapType === 'roadmap' ? 'is-on' : ''} onClick={() => setMapType('roadmap')}>Map</button>
        <button type="button" className={mapType === 'hybrid' ? 'is-on' : ''} onClick={() => setMapType('hybrid')}>Satellite</button>
      </div>

      <div className="ov-map-legend" role="group" aria-label="Pin Types">
        {FILTERS.map((type) => (
          <button
            key={type}
            type="button"
            className={`ov-filter${hidden[type] ? ' is-off' : ''}`}
            style={{ '--pin': TYPE_META[type].color }}
            onClick={() => setHidden((current) => ({ ...current, [type]: !current[type] }))}
            aria-pressed={!hidden[type]}
            title={`${hidden[type] ? 'Show' : 'Hide'} ${TYPE_META[type].label} Pins`}
          >
            <span className="ov-filter-dot"><Glyph name={type} size={13} /></span>
            {TYPE_META[type].label}
          </button>
        ))}
      </div>

      {pins.length === 0 ? (
        <div className="ov-map-empty">
          <strong>No Pins Yet</strong>
          <span>Bookings with an address appear here as pins, so you can see how far apart everything is.</span>
        </div>
      ) : null}

      {missing > 0 ? (
        <div className="ov-map-note">
          {missing} {missing === 1 ? 'booking' : 'bookings'} could not be placed. Check the address.
        </div>
      ) : null}

      {selected ? (
        <div className="ov-map-card" style={{ '--pin': TYPE_META[selected.item.type].color }}>
          <button type="button" className="ov-map-card-close" onClick={() => onSelect(null)} aria-label="Close">×</button>
          <span className="ov-map-card-type">
            <Glyph name={selected.item.icon || selected.item.type} size={14} />
            {TYPE_META[selected.item.type].label}
            {selected.item.tag ? ` · ${selected.item.tag}` : ''}
            {selected.day.inTrip ? ` · Day ${selected.day.num}` : ''}
          </span>
          <strong>{selected.item.title}</strong>
          <p>
            {formatDay(selected.day.key, { weekday: 'short', month: 'short', day: 'numeric' })}
            {selected.item.timeLabel ? ` · ${selected.item.timeLabel}` : ''}
          </p>
          {selected.item.address ? <p className="ov-map-card-address">{selected.item.address}</p> : null}
          {fromHotel ? (
            <p className="ov-map-card-hotel">
              {formatDistance(straight)} from {hotelPin.item.title} · about {formatMinutes(fromHotel.minutes)} on foot
            </p>
          ) : null}
          <div className="ov-map-card-actions">
            {onDirections ? (
              <button type="button" className="ov-map-card-go" onClick={() => onDirections(selected.item, selected.day)}>Directions</button>
            ) : (
              <a href={directionsUrl(selected.item.query, hotelPin?.item.query)} target="_blank" rel="noopener noreferrer">Directions</a>
            )}
            <a href={placeUrl(selected.item.query)} target="_blank" rel="noopener noreferrer" className="is-quiet">Open In Google Maps</a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TripMap;
