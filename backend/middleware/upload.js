const multer = require('multer');

/**
 * Memory storage — files are uploaded to Cloudinary from controllers.
 * Nothing is written under backend/uploads/.
 */
const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(
    require('path').extname(file.originalname).toLowerCase()
  );
  const mimetype =
    allowedTypes.test(file.mimetype) ||
    file.mimetype === 'image/webp' ||
    file.mimetype === 'image/gif';

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
};

const faviconFilter = (req, file, cb) => {
  const path = require('path');
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = /\.(jpe?g|png|webp|gif|ico)$/;
  const allowedMime =
    /^(image\/(jpeg|jpg|png|webp|gif|x-icon|vnd\.microsoft\.icon))$/i.test(file.mimetype) ||
    file.mimetype === 'image/x-icon';

  if (allowedExt.test(ext) && (allowedMime || ext === '.ico')) {
    cb(null, true);
  } else {
    cb(new Error('Only ICO, PNG, JPEG, WebP, or GIF are allowed for favicons'));
  }
};

const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

upload.avatar = multer({
  storage: memoryStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: imageFilter,
});

upload.logo = multer({
  storage: memoryStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

upload.favicon = multer({
  storage: memoryStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: faviconFilter,
});

module.exports = upload;
