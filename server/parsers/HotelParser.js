// parsers/HotelParser.js
function extractHotelDetails(text) {
    const details = {};

    // Extract Hotel Name (common patterns like "Hotel XYZ" or "Booking at Hotel XYZ")
    const hotelNameMatch = text.match(/(?:Hotel\s+|Booking\s+at\s+)([\w\s]+)/i);
    details.hotelName = hotelNameMatch ? hotelNameMatch[1].trim() : undefined;

    // Extract Check-In Date
    const checkInMatch = text.match(/Check-in\s+Date:\s*([\w\s,]+)/i) || text.match(/Arrival\s+Date:\s*([\w\s,]+)/i);
    details.checkInDate = checkInMatch ? new Date(checkInMatch[1].trim()).toISOString().split('T')[0] : undefined;

    // Extract Check-Out Date
    const checkOutMatch = text.match(/Check-out\s+Date:\s*([\w\s,]+)/i) || text.match(/Departure\s+Date:\s*([\w\s,]+)/i);
    details.checkOutDate = checkOutMatch ? new Date(checkOutMatch[1].trim()).toISOString().split('T')[0] : undefined;

    // Extract Address (look for typical address patterns)
    const addressMatch = text.match(/Address:\s*([\w\s,]+)/i) || text.match(/Location:\s*([\w\s,]+)/i);
    details.address = addressMatch ? addressMatch[1].trim() : undefined;

    // Extract Booking Confirmation Number
    const bookingConfirmationMatch = text.match(/Confirmation\s+Number:\s*([\w\d-]+)/i) || text.match(/Booking\s+ID:\s*([\w\d-]+)/i);
    details.bookingConfirmation = bookingConfirmationMatch ? bookingConfirmationMatch[1].trim() : undefined;

    return details;
}

module.exports = { extractHotelDetails };
