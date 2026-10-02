const { isoDate, time24, afterLabel, confirmationCode, allIsoDates } = require('./fieldUtils');

function extractRestaurantDetails(text) {
  const source = text || '';
  const dates = allIsoDates(source);
  const guests = source.match(/(?:number of guests|guests?|party of|party size|covers)\s*[:#-]?\s*(\d{1,2})\b/i);
  const reserved = source.match(/(?:reservation at|reserved at|table at)\s+([^\n]{2,60})/i);
  const details = {};

  details.restaurantName = afterLabel(source, ['Restaurant Name', 'Restaurant']) || (reserved && reserved[1].trim());
  details.reservationDate = isoDate(afterLabel(source, ['Reservation Date', 'Date'])) || dates[0];
  details.reservationTime = time24(afterLabel(source, ['Reservation Time', 'Time'])) || time24(source);
  details.guestNumber = guests ? guests[1] : undefined;
  details.address = afterLabel(source, ['Address', 'Location']);
  details.bookingConfirmation = confirmationCode(source);

  return details;
}

module.exports = { extractRestaurantDetails };
