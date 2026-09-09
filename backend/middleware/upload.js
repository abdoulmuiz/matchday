const multer = require('multer');
const path = require('path');
const fs = require('fs');

const screenshotDir = path.join(__dirname, '../uploads/screenshots');
const avatarDir = path.join(__dirname, '../uploads/avatars');
const logoDir = path.join(__dirname, '../uploads/branding');

[screenshotDir, avatarDir, logoDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/webp' || file.mimetype === 'image/gif';

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
};

const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, screenshotDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `screenshot-${uniqueSuffix}${ext}`);
  },
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${req.user.userId}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

upload.avatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter,
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

upload.logo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

const faviconFilter = (req, file, cb) => {
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

const faviconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `favicon-${uniqueSuffix}${ext}`);
  },
});

upload.favicon = multer({
  storage: faviconStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: faviconFilter,
});

module.exports = upload;
