function getBodyFromPayload(payload) {
    if (!payload) return '';
    let data = '';

    // Check different parts for the content, including plain text or HTML
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                data += Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                data += Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.parts && part.parts.length) {
                // Recursively check nested parts
                data += getBodyFromPayload(part);
            }
        }
    }

    // If no parts, check if the payload itself has data
    if (payload.body && payload.body.data) {
        data += Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return data;
}

function parseBookingFromEmail(email) {
    const { payload } = email;
    let extractedDetails = {
        subject: '',
        from: '',
        type: '',
        details: {},
    };

    // Extract basic information (you can refine this as needed)
    if (payload && payload.headers) {
        const subject = payload.headers.find(header => header.name === 'Subject');
        const from = payload.headers.find(header => header.name === 'From');
        extractedDetails.subject = subject ? subject.value : '';
        extractedDetails.from = from ? from.value : '';
    }

    // Extract more detailed info from the body, if available
    const body = getBodyFromPayload(payload);
    if (body) {
        // Example parsing logic with refined patterns (modify as needed)
        const hotelMatch = /Hotel\s(Name|Reservation):\s*(.*)/i.exec(body);
        const flightMatch = /Flight\s(No|Number):\s*(\w+)/i.exec(body);
        const dateMatch = /(Date|Check-In|Departure|Arrival):\s*(\d{2}\/\d{2}\/\d{4})/i.exec(body);
        const reservationIdMatch = /Reservation\sID:\s*(\w+)/i.exec(body);
        const addressMatch = /Address:\s*(.*)/i.exec(body);

        if (hotelMatch) {
            extractedDetails.type = 'Hotel';
            extractedDetails.details.hotelName = hotelMatch[2];
        } 
        if (flightMatch) {
            extractedDetails.type = 'Flight';
            extractedDetails.details.flightNumber = flightMatch[2];
        }
        if (dateMatch) {
            extractedDetails.details.date = dateMatch[2];
        }
        if (reservationIdMatch) {
            extractedDetails.details.reservationId = reservationIdMatch[1];
        }
        if (addressMatch) {
            extractedDetails.details.address = addressMatch[1];
        }
    }

    return extractedDetails;
}

module.exports = { getBodyFromPayload, parseBookingFromEmail };
