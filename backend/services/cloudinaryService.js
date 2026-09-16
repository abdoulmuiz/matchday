const { v2: cloudinary } = require('cloudinary');

function assertConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }
}

function configure() {
  assertConfigured();
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

let configured = false;
function ensureConfigured() {
  if (!configured) {
    configure();
    configured = true;
  }
}

/**
 * Upload a multer memory-file (req.file) to Cloudinary.
 * @param {{ buffer: Buffer, mimetype: string }} file
 * @param {{ folder: string, publicId?: string }} options
 * @returns {Promise<{ url: string, publicId: string, result: object }>}
 */
async function uploadImage(file, { folder, publicId } = {}) {
  ensureConfigured();

  if (!file?.buffer) {
    throw new Error('No file buffer to upload');
  }

  const dataUri = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: folder || 'ef-matchday',
    public_id: publicId,
    resource_type: 'image',
    overwrite: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    result,
  };
}

/**
 * Best-effort delete of a previous Cloudinary asset from its full URL.
 * Ignores local /uploads paths and non-Cloudinary URLs.
 */
async function destroyByUrl(url) {
  if (!url || typeof url !== 'string') return;
  if (!url.includes('res.cloudinary.com')) return;

  try {
    ensureConfigured();
    // https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.ext
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    if (!match) return;
    const publicId = decodeURIComponent(match[1]);
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('[Cloudinary] destroy failed:', err.message);
  }
}

module.exports = {
  uploadImage,
  destroyByUrl,
};
