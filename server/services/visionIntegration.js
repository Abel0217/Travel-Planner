const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
    keyFilename: './visionServiceAccount.json' 
});

// Function to extract text from an image
async function extractTextFromImage(imagePath) {
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;
    return detections[0] ? detections[0].description : '';
}

// Function to extract text from a PDF
async function extractTextFromPdf(pdfPath) {
    const [result] = await client.documentTextDetection(pdfPath);
    const fullText = result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
    return fullText;
}

module.exports = { extractTextFromImage, extractTextFromPdf };
