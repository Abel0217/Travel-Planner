const express = require('express');
const multer = require('multer');
const { extractTextFromImage, extractTextFromPdf } = require('../services/visionIntegration'); 
const { getEmails, parseBookingFromEmail } = require('../services/gmailService'); 
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Route for handling file uploads (images or PDFs)
router.post('/upload', upload.any(), async (req, res) => {
    try {
        const file = req.files && req.files[0];
        if (!file) {
            console.error('No file was uploaded.');
            return res.status(400).send('No file uploaded');
        }

        let text;
        const fileType = file.mimetype;
        console.log(`Received file of type: ${fileType}`);

        // Determine if it's an image or PDF based on MIME type
        if (fileType.startsWith('image/')) {
            text = await extractTextFromImage(file.buffer);
        } else if (fileType === 'application/pdf') {
            text = await extractTextFromPdf(file.buffer);
        } else {
            console.error('Unsupported file type:', fileType);
            return res.status(400).send('Unsupported file type. Please upload an image or PDF.');
        }

        res.json({ success: true, data: text });
    } catch (error) {
        console.error('Failed to process file:', error);
        res.status(500).send('Error processing file');
    }
});

// Fetch emails and extract booking information
router.get('/fetch-bookings', async (req, res) => {
    try {
        console.log("Fetching bookings from Gmail...");
        const bookings = await fetchBookingsFromGmail();
        console.log("Fetched bookings:", bookings);
        res.json({ success: true, bookings });
    } catch (error) {
        console.error('Failed to fetch bookings:', error); 
        res.status(500).send('Error fetching bookings');
    }
});


module.exports = router;
