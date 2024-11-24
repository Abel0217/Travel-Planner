const { extractFlightDetails } = require('../parsers/FlightParser');
const { extractHotelDetails } = require('../parsers/HotelParser');
const { extractTransportDetails } = require('../parsers/TransportParser');
const { extractActivityDetails } = require('../parsers/ActivityParser');
const { extractRestaurantDetails } = require('../parsers/RestaurantParser');
const { extractTextFromPdf, extractTextFromImage } = require('../credentials/visionIntegration');

/**
 * Determines the booking type based on email content.
 * @param {string} emailText - The text of the email.
 * @returns {string} The type of booking ('flight', 'hotel', 'transport', etc.)
 */
function determineBookingType(emailText) {
    if (emailText.includes('Flight') || emailText.includes('Airline')) {
        return 'flight';
    } else if (emailText.includes('Hotel') || emailText.includes('Reservation')) {
        return 'hotel';
    } else if (emailText.includes('Car Rental') || emailText.includes('Train')) {
        return 'transport';
    } else if (emailText.includes('Tour') || emailText.includes('Activity')) {
        return 'activity';
    } else if (emailText.includes('Restaurant') || emailText.includes('Booking')) {
        return 'restaurant';
    }
    return 'general';
}

/**
 * Processes an email and extracts relevant booking information.
 * Also processes attachments like PDFs and images to supplement data.
 * @param {string} emailText - The text of the email.
 * @param {Array} attachments - List of attachments with file paths and types.
 * @returns {Object} Combined booking details from email and attachments.
 */
async function processEmail(emailText, attachments = []) {
    const bookingType = determineBookingType(emailText);
    let extractedDetails = {};

    switch (bookingType) {
        case 'flight':
            extractedDetails = extractFlightDetails(emailText);
            break;
        case 'hotel':
            extractedDetails = extractHotelDetails(emailText);
            break;
        case 'transport':
            extractedDetails = extractTransportDetails(emailText);
            break;
        case 'activity':
            extractedDetails = extractActivityDetails(emailText);
            break;
        case 'restaurant':
            extractedDetails = extractRestaurantDetails(emailText);
            break;
        default:
            extractedDetails = parseWithNLP(emailText);
            break;
    }

    const nlpExtracted = parseWithNLP(emailText);
    extractedDetails = { ...extractedDetails, ...nlpExtracted };

    for (const attachment of attachments) {
        let text;
        try {
            if (attachment.type === 'pdf') {
                text = await extractTextFromPdf(attachment.path);
            } else if (attachment.type === 'image') {
                text = await extractTextFromImage(attachment.path);
            }

            if (text) {
                const attachmentType = determineBookingType(text);
                let attachmentDetails = {};

                switch (attachmentType) {
                    case 'flight':
                        attachmentDetails = extractFlightDetails(text);
                        break;
                    case 'hotel':
                        attachmentDetails = extractHotelDetails(text);
                        break;
                    case 'transport':
                        attachmentDetails = extractTransportDetails(text);
                        break;
                    case 'activity':
                        attachmentDetails = extractActivityDetails(text);
                        break;
                    case 'restaurant':
                        attachmentDetails = extractRestaurantDetails(text);
                        break;
                    default:
                        attachmentDetails = parseWithNLP(text);
                        break;
                }

                extractedDetails = { ...extractedDetails, ...attachmentDetails };
            }
        } catch (error) {
            console.error(`Error processing attachment ${attachment.path}:`, error);
        }
    }

    return extractedDetails;
}

module.exports = { processEmail };
