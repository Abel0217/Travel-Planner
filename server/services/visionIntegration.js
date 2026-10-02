const vision = require('@google-cloud/vision');
const path = require('path');

let client;
function getClient() {
  if (!client) {
    client = new vision.ImageAnnotatorClient({
      keyFilename: path.join(__dirname, '../credentials/visionServiceAccount.json'),
    });
  }
  return client;
}

function toRequest(input) {
  if (Buffer.isBuffer(input)) {
    return { image: { content: input.toString('base64') } };
  }
  return { image: { source: { filename: input } } };
}

async function extractTextFromImage(input) {
  const [result] = await getClient().textDetection(toRequest(input));
  const detections = result.textAnnotations;
  return detections && detections[0] ? detections[0].description : '';
}

async function extractTextFromPdf(input) {
  const [result] = await getClient().documentTextDetection(toRequest(input));
  return result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
}

module.exports = { extractTextFromImage, extractTextFromPdf };
