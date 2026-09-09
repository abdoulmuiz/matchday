const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(auth, admin);

router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.post('/users/:id/suspend', adminController.setUserSuspended);
router.get('/tournaments', adminController.listTournaments);
router.delete('/tournaments/:id', adminController.deleteTournament);
router.get('/mismatches', adminController.listMismatches);
router.get('/branding', adminController.getBranding);
router.post('/branding/logo', upload.logo.single('logo'), adminController.uploadLogo);
router.delete('/branding/logo', adminController.resetLogo);
router.post('/branding/favicon', upload.favicon.single('favicon'), adminController.uploadFavicon);
router.delete('/branding/favicon', adminController.resetFavicon);

module.exports = router;
