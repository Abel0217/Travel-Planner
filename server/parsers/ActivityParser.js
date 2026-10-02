const { isoDate, time24, afterLabel, confirmationCode, allIsoDates } = require('./fieldUtils');

function extractActivityDetails(text) {
  const source = text || '';
  const dates = allIsoDates(source);
  const details = {};

  details.title = afterLabel(source, ['Activity Title', 'Event Title', 'Reservation Title', 'Event', 'Activity', 'Attraction', 'Tour']);
  details.location = afterLabel(source, ['Location', 'Venue', 'Address', 'Meeting point']);
  details.activityDate = isoDate(afterLabel(source, ['Activity Date', 'Event Date', 'Date'])) || dates[0];
  details.startTime = time24(afterLabel(source, ['Start Time', 'Starts', 'Time']));
  details.endTime = time24(afterLabel(source, ['End Time', 'Ends']));
  details.reservationNumber = confirmationCode(source);
  details.description = afterLabel(source, ['Description', 'Notes']);

  return details;
}

module.exports = { extractActivityDetails };
