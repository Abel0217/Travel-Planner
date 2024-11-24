function parseFlightDetails(text) {
    const parsedData = {};

    const airlineMatch = text.match(/(?:Airline|Carrier):?\s*(.*)/i);
    const flightNumberMatch = text.match(/(?:Flight Number|Flight No|Flight|No\.):?\s*(\w+)/i);
    const departureAirportMatch = text.match(/(?:Departure|Departing From):?\s*(.*)/i);
    const arrivalAirportMatch = text.match(/(?:Arrival|Arriving To|To):?\s*(.*)/i);
    const departureDateMatch = text.match(/(?:Departure Date|Date):?\s*(\d{1,2} \w+ \d{4}|\d{2}\/\d{2}\/\d{4})/i);
    const arrivalDateMatch = text.match(/(?:Arrival Date|Date):?\s*(\d{1,2} \w+ \d{4}|\d{2}\/\d{2}\/\d{4})/i);
    const bookingReferenceMatch = text.match(/(?:Reference|Booking Ref|Ref):?\s*(\w+)/i);

    parsedData.airline = airlineMatch ? airlineMatch[1].trim() : '';
    parsedData.flightNumber = flightNumberMatch ? flightNumberMatch[1].trim() : '';
    parsedData.departureAirport = departureAirportMatch ? departureAirportMatch[1].trim() : '';
    parsedData.arrivalAirport = arrivalAirportMatch ? arrivalAirportMatch[1].trim() : '';

    parsedData.departureDate = departureDateMatch ? new Date(departureDateMatch[1].trim()) : '';
    parsedData.arrivalDate = arrivalDateMatch ? new Date(arrivalDateMatch[1].trim()) : '';
    parsedData.bookingReference = bookingReferenceMatch ? bookingReferenceMatch[1].trim() : '';

    return parsedData;
}

module.exports = { parseFlightDetails };
