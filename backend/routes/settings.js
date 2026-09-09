const express = require('express');
const SiteSettings = require('../models/SiteSettings');

const router = express.Router();

/** Public branding (logo) for the whole site */
router.get('/branding', async (req, res) => {
  try {
    const branding = await SiteSettings.getBranding();
    res.json({ branding });
  } catch (error) {
    console.error('Get branding error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
