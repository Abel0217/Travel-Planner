// parsers/RestaurantParser.js
function extractRestaurantDetails(text) {
    const details = {};

    const restaurantNameMatch = text.match(/Restaurant\s*Name:\s*([\w\s]+)/i);
    const reservationDateMatch = text.match(/Reservation\s*Date:\s*([\w\s,]+)/i);
    const reservationTimeMatch = text.match(/Reservation\s*Time:\s*([\d:APMapm\s]+)/i);
    const guestNumberMatch = text.match(/Guests:\s*([\d]+)/i);
    const addressMatch = text.match(/Address:\s*([\w\s,]+)/i);
    const bookingConfirmationMatch = text.match(/Booking\s*Confirmation:\s*([\w\d-]+)/i);

    details.restaurantName = restaurantNameMatch ? restaurantNameMatch[1].trim() : undefined;
    details.reservationDate = reservationDateMatch ? new Date(reservationDateMatch[1].trim()).toISOString().split('T')[0] : undefined;
    details.reservationTime = reservationTimeMatch ? reservationTimeMatch[1].trim() : undefined;
    details.guestNumber = guestNumberMatch ? guestNumberMatch[1].trim() : undefined;
    details.address = addressMatch ? addressMatch[1].trim() : undefined;
    details.bookingConfirmation = bookingConfirmationMatch ? bookingConfirmationMatch[1].trim() : undefined;

    return details;
}

module.exports = { extractRestaurantDetails };
