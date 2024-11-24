// parsers/FlightParser.js
function extractFlightDetails(text) {
    const details = {};

    // Regex patterns for extracting each field
    const airlineMatch = text.match(/(?:Airline|Flight operated by):\s*([\w\s]+)/i);
    const flightNumberMatch = text.match(/Flight\s*Number:\s*([\w\d]+)/i);
    const departureAirportMatch = text.match(/Departure\s*Airport:\s*([\w\s]+)/i);
    const arrivalAirportMatch = text.match(/Arrival\s*Airport:\s*([\w\s]+)/i);
    const departureDateMatch = text.match(/Departure\s*Date:\s*([\w\s,]+)/i);
    const departureTimeMatch = text.match(/Departure\s*Time:\s*([\d:APMapm\s]+)/i);
    const arrivalDateMatch = text.match(/Arrival\s*Date:\s*([\w\s,]+)/i);
    const arrivalTimeMatch = text.match(/Arrival\s*Time:\s*([\d:APMapm\s]+)/i);
    const bookingReferenceMatch = text.match(/Booking\s*Reference:\s*([\w\d-]+)/i);
    const passengerNameMatch = text.match(/Passenger\s*Name:\s*([\w\s]+)/i);
    const seatNumberMatch = text.match(/Seat\s*Number:\s*([\w\d]+)/i);

    details.airline = airlineMatch ? airlineMatch[1].trim() : undefined;
    details.flightNumber = flightNumberMatch ? flightNumberMatch[1].trim() : undefined;
    details.departureAirport = departureAirportMatch ? departureAirportMatch[1].trim() : undefined;
    details.arrivalAirport = arrivalAirportMatch ? arrivalAirportMatch[1].trim() : undefined;
    details.departureDate = departureDateMatch ? new Date(departureDateMatch[1].trim()).toISOString().split('T')[0] : undefined;
    details.departureTime = departureTimeMatch ? departureTimeMatch[1].trim() : undefined;
    details.arrivalDate = arrivalDateMatch ? new Date(arrivalDateMatch[1].trim()).toISOString().split('T')[0] : undefined;
    details.arrivalTime = arrivalTimeMatch ? arrivalTimeMatch[1].trim() : undefined;
    details.bookingReference = bookingReferenceMatch ? bookingReferenceMatch[1].trim() : undefined;
    details.passengerName = passengerNameMatch ? passengerNameMatch[1].trim() : undefined;
    details.seatNumber = seatNumberMatch ? seatNumberMatch[1].trim() : undefined;

    return details;
}

module.exports = { extractFlightDetails };
