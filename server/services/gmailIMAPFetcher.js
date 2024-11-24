const { extractFlightDetails } = require('../parsers/FlightParser');
const { extractHotelDetails } = require('../parsers/HotelParser');
const { extractActivityDetails } = require('../parsers/ActivityParser');
const { extractTransportDetails } = require('../parsers/TransportParser');
const { extractRestaurantDetails } = require('../parsers/RestaurantParser');

function parseBasedOnEmailType(text, type) {
    switch (type) {
        case 'flight':
            return extractFlightDetails(text);
        case 'hotel':
            return extractHotelDetails(text);
        case 'activity':
            return extractActivityDetails(text);
        case 'transport':
            return extractTransportDetails(text);
        case 'restaurant':
            return extractRestaurantDetails(text);
        default:
            return {}; 
    }
}
