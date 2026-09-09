const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tournamentController = require('../controllers/tournamentController');

// Create tournament
router.post('/', auth, tournamentController.createTournament);

// Get all tournaments
router.get('/', tournamentController.getTournaments);

// Get recent tournaments (for home page)
router.get('/recent', tournamentController.getRecentTournaments);

// Search tournaments
router.get('/search', tournamentController.searchTournaments);

// Get single tournament
router.get('/:id', tournamentController.getTournament);

// Join tournament
router.post('/:id/join', auth, tournamentController.joinTournament);

// Kick participant (organizer only)
router.post('/:id/kick', auth, tournamentController.kickParticipant);

// Generate bracket (organizer only, manual trigger)
router.post('/:id/generate-bracket', auth, tournamentController.generateBracket);

// Update tournament PIN (organizer only)
router.put('/:id/pin', auth, tournamentController.updatePin);

// Delete tournament (organizer only)
router.delete('/:id', auth, tournamentController.deleteTournament);

// Search tournaments
router.get('/search', tournamentController.searchTournaments);

module.exports = router;
