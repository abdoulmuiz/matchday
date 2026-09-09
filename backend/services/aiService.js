const vision = require('@google-cloud/vision');

// Initialize Google Cloud Vision client
// Expects GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS environment variables
// Or GOOGLE_APPLICATION_CREDENTIALS pointing to service account JSON file
const client = new vision.ImageAnnotatorClient();

/**
 * Extract score from an eFootball screenshot using Google Cloud Vision OCR
 * @param {string} imagePath - Path to the screenshot file
 * @returns {Promise<string>} - Returns score in format "X-Y" or "UNCLEAR"
 */
async function extractScoreFromScreenshot(imagePath) {
  try {
    const fs = require('fs');
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Perform text detection using Google Cloud Vision
    const [result] = await client.textDetection(imageBuffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      console.error('No text detected in image');
      return 'UNCLEAR';
    }
    
    // Get all detected text
    const fullText = detections.map(d => d.description).join(' ');
    
    // Parse score from text using regex
    const score = parseScoreFromText(fullText);
    
    return score;
  } catch (error) {
    console.error('Google Cloud Vision error:', error);
    return 'UNCLEAR';
  }
}

/**
 * Parse score pattern from extracted text
 * Looks for patterns like "3-1", "2 - 0", "1:2", etc.
 * @param {string} text - Extracted text from OCR
 * @returns {string} - Score in format "X-Y" or "UNCLEAR"
 */
function parseScoreFromText(text) {
  // Try various score patterns
  const patterns = [
    // Pattern: digit-digit (e.g., "3-1", "2-0")
    /(\d+)\s*[-–]\s*(\d+)/,
    // Pattern: digit:digit (e.g., "3:1", "2:0")
    /(\d+)\s*:\s*(\d+)/,
    // Pattern: digit space digit (e.g., "3 1", "2 0")
    /(\d+)\s+(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const score1 = parseInt(match[1], 10);
      const score2 = parseInt(match[2], 10);
      
      // Validate scores are reasonable (0-99 for football scores)
      if (score1 >= 0 && score1 <= 99 && score2 >= 0 && score2 <= 99) {
        return `${score1}-${score2}`;
      }
    }
  }
  
  // If no pattern matched, return UNCLEAR
  return 'UNCLEAR';
}

module.exports = {
  extractScoreFromScreenshot
};
