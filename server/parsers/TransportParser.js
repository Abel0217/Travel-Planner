// parsers/TransportParser.js
function extractTransportDetails(text) {
    const details = {};

    const typeMatch = text.match(/Transport\s*Type:\s*([\w\s]+)/i);
    const pickupTimeMatch = text.match(/Pickup\s*Time:\s*([\w\s,]+)/i);
    const dropoffTimeMatch = text.match(/Dropoff\s*Time:\s*([\w\s,]+)/i);
    const pickupLocationMatch = text.match(/Pickup\s*Location:\s*([\w\s,]+)/i);
    const dropoffLocationMatch = text.match(/Dropoff\s*Location:\s*([\w\s,]+)/i);
    const bookingReferenceMatch = text.match(/Booking\s*Reference:\s*([\w\d-]+)/i);

    details.type = typeMatch ? typeMatch[1].trim() : undefined;
    details.pickupTime = pickupTimeMatch ? new Date(pickupTimeMatch[1].trim()).toISOString() : undefined;
    details.dropoffTime = dropoffTimeMatch ? new Date(dropoffTimeMatch[1].trim()).toISOString() : undefined;
    details.pickupLocation = pickupLocationMatch ? pickupLocationMatch[1].trim() : undefined;
    details.dropoffLocation = dropoffLocationMatch ? dropoffLocationMatch[1].trim() : undefined;
    details.bookingReference = bookingReferenceMatch ? bookingReferenceMatch[1].trim() : undefined;

    return details;
}

module.exports = { extractTransportDetails };
