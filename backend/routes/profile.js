const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const profileController = require('../controllers/profileController');

router.get('/', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post(
  '/upload-picture',
  auth,
  upload.avatar.single('avatar'),
  profileController.uploadProfilePicture
);

module.exports = router;
