// parsers/ActivityParser.js
function extractActivityDetails(text) {
    const details = {};

    // Extract Title (e.g., "Event: Dinner at Eiffel Tower")
    const titleMatch = text.match(/(?:Event|Activity|Reservation)\s+Title:\s*([\w\s]+)/i);
    details.title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract Location (search for keywords that hint at places)
    const locationMatch = text.match(/Location:\s*([\w\s,]+)/i) || text.match(/Venue:\s*([\w\s,]+)/i);
    details.location = locationMatch ? locationMatch[1].trim() : undefined;

    // Extract Activity Date
    const activityDateMatch = text.match(/Activity\s+Date:\s*([\w\s,]+)/i) || text.match(/Date:\s*([\w\s,]+)/i);
    details.activityDate = activityDateMatch ? new Date(activityDateMatch[1].trim()).toISOString().split('T')[0] : undefined;

    // Extract Start Time
    const startTimeMatch = text.match(/Start\s+Time:\s*([\d:APMapm\s]+)/i);
    details.startTime = startTimeMatch ? startTimeMatch[1].trim() : undefined;

    // Extract End Time
    const endTimeMatch = text.match(/End\s+Time:\s*([\d:APMapm\s]+)/i);
    details.endTime = endTimeMatch ? endTimeMatch[1].trim() : undefined;

    // Extract Reservation Number
    const reservationNumberMatch = text.match(/Reservation\s+Number:\s*([\w\d-]+)/i);
    details.reservationNumber = reservationNumberMatch ? reservationNumberMatch[1].trim() : undefined;

    // Extract Description (look for typical descriptions if available)
    const descriptionMatch = text.match(/Description:\s*([\w\s,]+)/i);
    details.description = descriptionMatch ? descriptionMatch[1].trim() : undefined;

    return details;
}

module.exports = { extractActivityDetails };
