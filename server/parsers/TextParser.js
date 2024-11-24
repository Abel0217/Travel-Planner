/**
 * Extract general details from a given text to identify the reservation type.
 * Enhanced with more refined keywords and patterns for better accuracy.
 * @param {string} text - The input text to analyze.
 * @returns {Object} - Detected reservation type.
 */
function extractGeneralDetails(text) {
    const generalDetails = {
        detectedType: '',
    };

    // Normalize text to lowercase for case-insensitive matching
    const normalizedText = text.toLowerCase();

    // Refined regex patterns and keyword matching to identify reservation types
    const patterns = {
        flight: /\b(flight|boarding|airline|depart|arrival|gate|pnr|eticket|check-in)\b/,
        hotel: /\b(hotel|check-in|check-out|stay|booking|lodging|reservation number)\b/,
        restaurant: /\b(restaurant|dining|dinner|lunch|table|reservation|booking)\b/,
        transport: /\b(car rental|rental|taxi|bus|train|pickup|dropoff|ride)\b/,
        activity: /\b(tour|excursion|activity|adventure|experience|event)\b/,
    };

    // Determine detected type based on regex matching
    if (patterns.flight.test(normalizedText)) {
        generalDetails.detectedType = 'flight';
    } else if (patterns.hotel.test(normalizedText)) {
        generalDetails.detectedType = 'hotel';
    } else if (patterns.restaurant.test(normalizedText)) {
        generalDetails.detectedType = 'restaurant';
    } else if (patterns.transport.test(normalizedText)) {
        generalDetails.detectedType = 'transport';
    } else if (patterns.activity.test(normalizedText)) {
        generalDetails.detectedType = 'activity';
    } else {
        generalDetails.detectedType = 'unknown';
    }

    console.log(`Detected Reservation Type: ${generalDetails.detectedType}`);
    return generalDetails;
}

module.exports = { extractGeneralDetails };
