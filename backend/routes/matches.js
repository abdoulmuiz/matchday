const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get matches by tournament (must come before /:id)
router.get('/tournament/:tournamentId', matchController.getTournamentMatches);

// Get single match
router.get('/:id', matchController.getMatch);

// Submit result with screenshot (auth required)
router.post('/:id/submit-result', auth, upload.single('screenshot'), matchController.submitResult);

// Resolve mismatch (organizer only, auth required)
router.post('/:id/resolve-mismatch', auth, matchController.resolveMismatch);

// Manual score edit (organizer only, auth required)
router.put('/:id/edit-score', auth, matchController.manualScoreEdit);

// Direct result input (organizer only, auth required)
router.post('/:id/direct-result', auth, matchController.directResultInput);

// Extend match deadline after time limit passed (organizer only)
router.post('/:id/extend-deadline', auth, matchController.extendDeadline);

// Force forfeit / walkover after time limit passed (organizer only)
router.post('/:id/force-forfeit', auth, matchController.forceForfeit);

module.exports = router;
