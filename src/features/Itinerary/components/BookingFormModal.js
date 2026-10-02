import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ActivityForm from './ActivityForm';
import HotelForm from './HotelForm';
import FlightForm from './FlightForm';
import RestaurantForm from './RestaurantForm';
import TransportForm from './TransportForm';
import './css/BookingFormModal.css';

// One pop-up for every booking form.
//  - `prefill` pre-fills what we already know (name, address, date, time), so a suggestion becomes a booking in one step.
//  - `edit` opens the same form on an existing booking.
function BookingFormModal({ type: startType, itineraryId, startDate, endDate, prefill, edit, note, onClose, onAdded }) {
  const [picked, setPicked] = useState(null);
  const type = picked || startType;
  const switching = picked && picked !== startType;
  useEffect(() => {
    if (!type) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [type, onClose]);

  if (!type) return null;
  const common = {
    itineraryId, startDate, endDate, prefill: switching ? undefined : prefill, onClose, onSwitch: edit ? undefined : setPicked,
  };
  let form = null;
  if (type === 'activity') form = <ActivityForm {...common} activityToEdit={edit} onActivityAdded={onAdded} />;
  if (type === 'hotel') form = <HotelForm {...common} hotelToEdit={edit} onHotelAdded={onAdded} />;
  if (type === 'flight') form = <FlightForm {...common} flightToEdit={edit} onFlightAdded={onAdded} />;
  if (type === 'restaurant') form = <RestaurantForm {...common} restaurantToEdit={edit} onRestaurantAdded={onAdded} />;
  if (type === 'transport') form = <TransportForm {...common} transportToEdit={edit} onTransportAdded={onAdded} />;
  if (!form) return null;

  return createPortal(
    <div className="bfm-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="bfm-sheet" role="dialog" aria-modal="true">
        {note ? <p className="bfm-note">{note}</p> : null}
        {form}
      </div>
    </div>,
    document.body
  );
}

export default BookingFormModal;
