const { isoDate, afterLabel, confirmationCode, allIsoDates } = require('./fieldUtils');

function extractHotelDetails(text) {
  const source = text || '';
  const dates = allIsoDates(source);
  const named = source.match(/\b((?:The\s+)?[A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,5}\s+(?:Hotel|Inn|Resort|Suites|Lodge))\b/);
  const details = {};

  details.hotelName = afterLabel(source, ['Hotel Name', 'Property', 'Accommodation']) || (named && named[1]);
  details.checkInDate = isoDate(afterLabel(source, ['Check-in Date', 'Check in', 'Check-in', 'Arrival'])) || dates[0];
  details.checkOutDate = isoDate(afterLabel(source, ['Check-out Date', 'Check out', 'Check-out', 'Departure'])) || dates[1];
  details.address = afterLabel(source, ['Address', 'Location']);
  details.bookingConfirmation = confirmationCode(source);

  return details;
}

module.exports = { extractHotelDetails };
