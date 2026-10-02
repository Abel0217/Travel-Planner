const { isoDate, time24, afterLabel, confirmationCode, allIsoDates } = require('./fieldUtils');

function extractFlightDetails(text) {
  const source = text || '';
  const details = {};
  const dates = allIsoDates(source);
  const departBlock = source.match(/depart(?:ure|ing|s)?[^\n]{0,90}/i);
  const arriveBlock = source.match(/arriv(?:al|ing|es)?[^\n]{0,90}/i);
  const flightMatch = source.match(/\b(?:flight\s*(?:number|no\.?|#)?\s*[:#-]?\s*)?([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*(\d{2,4})\b/);

  details.airline = afterLabel(source, ['Airline', 'Operated by', 'Flight operated by']);
  details.flightNumber = (afterLabel(source, ['Flight Number', 'Flight No', 'Flight #']) || '').replace(/\s+/g, '').toUpperCase() || undefined;
  if (!details.flightNumber && flightMatch && /flight|depart|airline|seat|passenger|confirmation/i.test(source)) {
    details.flightNumber = `${flightMatch[1]}${flightMatch[2]}`.toUpperCase();
  }
  details.departureAirport = afterLabel(source, ['Departure Airport', 'Departing from', 'Departs from', 'Origin']);
  details.arrivalAirport = afterLabel(source, ['Arrival Airport', 'Arriving at', 'Arrives at', 'Destination']);
  details.passengerName = afterLabel(source, ['Passenger Name', 'Passenger', 'Traveler', 'Traveller']);
  details.seatNumber = (source.match(/\bseat\s*(?:number)?\s*[:#-]?\s*(\d{1,2}[A-K])\b/i) || [])[1];
  if (details.seatNumber) details.seatNumber = details.seatNumber.toUpperCase();
  details.bookingReference = confirmationCode(source);
  details.departureDate = isoDate(afterLabel(source, ['Departure Date'])) || (departBlock && isoDate(departBlock[0])) || dates[0];
  details.arrivalDate = isoDate(afterLabel(source, ['Arrival Date'])) || (arriveBlock && isoDate(arriveBlock[0])) || dates[1] || dates[0];
  details.departureTime = time24(afterLabel(source, ['Departure Time', 'Departs'])) || (departBlock && time24(departBlock[0]));
  details.arrivalTime = time24(afterLabel(source, ['Arrival Time', 'Arrives'])) || (arriveBlock && time24(arriveBlock[0]));

  return details;
}

module.exports = { extractFlightDetails };
