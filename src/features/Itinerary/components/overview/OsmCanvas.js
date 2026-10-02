import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DAY_COLORS, TYPE_META } from './overviewModel';
import { PIN_HEIGHT, PIN_WIDTH, pinSvg } from '../../../../utils/tripGeo';

// The free map used whenever Google Maps is not available. It draws exactly the same
// pins (colour = type, symbol = which kind, badge = day or stop) as the Google one.
const TILES = {
  roadmap: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
  hybrid: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri',
    maxZoom: 18,
  },
};

const buildIcon = (pin, active, badge) => {
  const meta = TYPE_META[pin.item.type];
  const scale = active ? 1.2 : 0.88;
  const width = Math.round(PIN_WIDTH * scale);
  const height = Math.round(PIN_HEIGHT * scale);
  const svg = pinSvg({ color: meta.color, glyph: pin.item.icon || pin.item.type, badge })
    .replace(`width="${PIN_WIDTH}" height="${PIN_HEIGHT}"`, `width="${width}" height="${height}"`);
  return L.divIcon({
    html: svg,
    className: 'ov-osm-pin',
    iconSize: [width, height],
    iconAnchor: [Math.round(19 * scale), Math.round(50 * scale)],
  });
};

function OsmCanvas({ pins, routes, selectedId, selected, onSelect, mapType, center, fitKey, focusDay, trace }) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const layerRef = useRef(null);
  const traceRef = useRef(null);
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const map = L.map(hostRef.current, { zoomControl: true, attributionControl: true });
    map.setView(center ? [center.lat, center.lng] : [20, 0], center ? 12 : 2);
    layerRef.current = L.layerGroup().addTo(map);
    traceRef.current = L.layerGroup().addTo(map);
    map.on('click', () => selectRef.current(null));
    mapRef.current = map;

    const settle = window.setTimeout(() => map.invalidateSize(), 60);
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(hostRef.current);
    }
    return () => {
      window.clearTimeout(settle);
      if (observer) observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      layerRef.current = null;
      traceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const tiles = TILES[mapType] || TILES.roadmap;
    tileRef.current = L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: tiles.maxZoom }).addTo(map);
  }, [mapType]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    routes.forEach((route) => {
      L.polyline(route.path.map((point) => [point.lat, point.lng]), {
        color: DAY_COLORS[route.day.index % DAY_COLORS.length],
        weight: 3,
        opacity: 0.85,
        dashArray: '2 8',
        lineCap: 'round',
        interactive: false,
      }).addTo(layer);
    });

    pins.forEach((pin) => {
      const active = pin.item.id === selectedId;
      const badge = focusDay === 'all' ? (pin.item.dayNum || '') : (pin.item.order || '');
      const marker = L.marker([pin.position.lat, pin.position.lng], {
        icon: buildIcon(pin, active, badge),
        title: `${pin.item.title}${pin.item.timeLabel ? ` · ${pin.item.timeLabel}` : ''}`,
        zIndexOffset: active ? 1000 : 0,
        keyboard: true,
      });
      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        selectRef.current(pin.item.id);
      });
      marker.addTo(layer);
    });
  }, [pins, routes, selectedId, focusDay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pins.length === 0) {
      if (center) map.setView([center.lat, center.lng], 12);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].position.lat, pins[0].position.lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(pins.map((pin) => [pin.position.lat, pin.position.lng])),
      { paddingTopLeft: [40, 70], paddingBottomRight: [130, 60], maxZoom: 16 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    map.setView([selected.position.lat, selected.position.lng], Math.max(map.getZoom(), 15), { animate: true });
  }, [selected]);

  // A route picked in the Directions panel: a solid line with a start and an end dot.
  useEffect(() => {
    const layer = traceRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!trace || !trace.path || trace.path.length < 2) return;
    const points = trace.path.map((point) => [point.lat, point.lng]);
    L.polyline(points, { color: '#ffffff', weight: 9, opacity: 0.9, lineCap: 'round', interactive: false }).addTo(layer);
    L.polyline(points, {
      color: '#222946', weight: 5, opacity: 0.95, lineCap: 'round', interactive: false,
      dashArray: trace.mode === 'walk' ? '1 9' : null,
    }).addTo(layer);
    L.circleMarker([trace.from.position.lat, trace.from.position.lng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#222946', fillOpacity: 1, interactive: false }).addTo(layer);
    L.circleMarker([trace.to.position.lat, trace.to.position.lng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#f3ab03', fillOpacity: 1, interactive: false }).addTo(layer);
    map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [60, 70], paddingBottomRight: [150, 180], maxZoom: 17 });
  }, [trace]);

  return <div ref={hostRef} className="ov-osm" />;
}

export default OsmCanvas;
