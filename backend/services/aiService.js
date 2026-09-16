const vision = require('@google-cloud/vision');
const fs = require('fs');

let client = null;

function getVisionClient() {
  if (!client) {
    client = new vision.ImageAnnotatorClient();
  }
  return client;
}

/**
 * Extract score from an eFootball screenshot using Google Cloud Vision OCR.
 * Accepts a file path (legacy) or a Buffer (Cloudinary / multer memory).
 * @param {string|Buffer} imagePathOrBuffer
 * @returns {Promise<string>} - "X-Y" or "UNCLEAR"
 */
async function extractScoreFromScreenshot(imagePathOrBuffer) {
  try {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('GOOGLE_APPLICATION_CREDENTIALS not set — screenshot OCR unavailable');
      return 'UNCLEAR';
    }

    let imageBuffer;
    if (Buffer.isBuffer(imagePathOrBuffer)) {
      imageBuffer = imagePathOrBuffer;
    } else if (typeof imagePathOrBuffer === 'string') {
      imageBuffer = fs.readFileSync(imagePathOrBuffer);
    } else {
      return 'UNCLEAR';
    }

    const [result] = await getVisionClient().textDetection(imageBuffer);
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      console.error('No text detected in image');
      return 'UNCLEAR';
    }

    const fullText = detections.map((d) => d.description).join(' ');
    return parseScoreFromText(fullText);
  } catch (error) {
    console.error('Google Cloud Vision error:', error.message || error);
    return 'UNCLEAR';
  }
}

function parseScoreFromText(text) {
  const patterns = [
    /(\d+)\s*[-–]\s*(\d+)/,
    /(\d+)\s*:\s*(\d+)/,
    /(\d+)\s+(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score1 = parseInt(match[1], 10);
      const score2 = parseInt(match[2], 10);

      if (score1 >= 0 && score1 <= 99 && score2 >= 0 && score2 <= 99) {
        return `${score1}-${score2}`;
      }
    }
  }

  return 'UNCLEAR';
}

module.exports = {
  extractScoreFromScreenshot,
};
