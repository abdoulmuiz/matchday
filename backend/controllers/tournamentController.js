const Tournament = require('../models/Tournament');
const TournamentParticipant = require('../models/TournamentParticipant');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const pool = require('../config/database');

// Create tournament
const createTournament = async (req, res) => {
  try {
    const { name, description, player_limit, match_time_limit, type } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!name || !description || !player_limit) {
      return res.status(400).json({ error: 'Name, description, and player limit are required' });
    }

    const validLimits = [8, 16, 32, 64];
    if (!validLimits.includes(parseInt(player_limit))) {
      return res.status(400).json({ error: 'Player limit must be 8, 16, 32, or 64' });
    }

    // Validate match time limit if provided (in minutes)
    let matchTimeLimit = null;
    if (match_time_limit) {
      matchTimeLimit = parseInt(match_time_limit);
      if (matchTimeLimit < 5 || matchTimeLimit > 1440) {
        return res.status(400).json({ error: 'Match time limit must be between 5 and 1440 minutes' });
      }
    }

    // Validate tournament type
    const tournamentType = type || 'open';
    if (!['open', 'closed'].includes(tournamentType)) {
      return res.status(400).json({ error: 'Tournament type must be open or closed' });
    }

    // Generate PIN for closed tournaments
    let pin = null;
    if (tournamentType === 'closed') {
      pin = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit PIN
    }

    // Create tournament
    const tournamentId = await Tournament.create(name, description, parseInt(player_limit), userId, matchTimeLimit, tournamentType, pin);

    const tournament = await Tournament.findById(tournamentId);
    const participants = await Tournament.getParticipants(tournamentId);

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: {
        ...tournament,
        participant_count: participants.length,
        participants
      }
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Server error during tournament creation' });
  }
};

// Get all tournaments
const getTournaments = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user ? req.user.userId : null;
    
    let tournaments;
    if (status) {
      tournaments = await Tournament.findByStatus(status, null, userId);
    } else {
      tournaments = await Tournament.findAll(null, userId);
    }

    // List endpoints only need counts (already on each row) — avoid N+1 participant loads
    res.json({ tournaments });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get recent tournaments (for home page)
const getRecentTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.findByStatus('open', 3);

    res.json({ tournaments });
  } catch (error) {
    console.error('Get recent tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single tournament
const getTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const participants = await Tournament.getParticipants(id);
    const participantCount = participants.length;
    const isFull = participantCount >= tournament.player_limit;

    // Derive from already-loaded participants (no extra query)
    let isParticipant = false;
    if (req.user) {
      isParticipant = participants.some(p => p.user_id === req.user.userId);
    }

    // If tournament is full and still open, update status to live
    if (isFull && tournament.status === 'open') {
      await Tournament.updateStatus(id, 'live');
      tournament.status = 'live';
    }

    res.json({
      tournament: {
        ...tournament,
        participant_count: participantCount,
        is_full: isFull,
        participants,
        is_participant: isParticipant
      }
    });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Join tournament
const joinTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== 'open') {
      return res.status(400).json({ error: 'Tournament is not accepting new participants' });
    }

    // Check PIN for closed tournaments
    if (tournament.type === 'closed') {
      if (!pin) {
        return res.status(400).json({ error: 'PIN is required for closed tournaments' });
      }
      if (pin !== tournament.pin) {
        return res.status(401).json({ error: 'Incorrect PIN' });
      }
    }

    const participantCount = await Tournament.getParticipantCount(id);
    if (participantCount >= tournament.player_limit) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    const isAlreadyParticipant = await Tournament.isUserParticipant(id, userId);
    if (isAlreadyParticipant) {
      return res.status(400).json({ error: 'You are already in this tournament' });
    }

    await TournamentParticipant.join(id, userId);

    // Send notification to user
    await Notification.create(
      userId,
      'tournament_joined',
      'Successfully Joined Tournament',
      `You have joined "${tournament.name}". Get ready to compete!`,
      id,
      null
    );

    const participants = await Tournament.getParticipants(id);
    const newParticipantCount = participants.length;
    const isFull = newParticipantCount >= tournament.player_limit;

    // Send tournament_closing_soon notification if tournament is nearly full (1-2 spots left)
    if (!isFull && (tournament.player_limit - newParticipantCount <= 2)) {
      const spotsLeft = tournament.player_limit - newParticipantCount;
      await Notification.createBulk(
        participants.map((participant) => ({
          userId: participant.user_id,
          type: 'tournament_closing_soon',
          title: 'Tournament Closing Soon',
          message: `The tournament "${tournament.name}" is almost full! Only ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} remaining.`,
          relatedTournamentId: id,
        }))
      );
    }

    // If tournament is now full, generate bracket and update status to live
    if (isFull) {
      console.log(`[TOURNAMENT ${id}] Tournament is now full (${newParticipantCount}/${tournament.player_limit}). Checking bracket generation...`);
      
      // Check if bracket has already been generated
      const existingMatches = await Match.findByTournament(id);
      if (existingMatches.length === 0) {
        console.log(`[TOURNAMENT ${id}] No existing matches found. Generating bracket...`);
        await Match.generateBracket(id, participants);
        
        await Notification.createBulk(
          participants.map((participant) => ({
            userId: participant.user_id,
            type: 'tournament_started',
            title: 'Tournament Started',
            message: `The tournament "${tournament.name}" has started! Check the bracket for your matches.`,
            relatedTournamentId: id,
          }))
        );
      } else {
        console.log(`[TOURNAMENT ${id}] Bracket already exists (${existingMatches.length} matches). Skipping generation.`);
      }
      
      console.log(`[TOURNAMENT ${id}] Updating tournament status to 'live'`);
      await Tournament.updateStatus(id, 'live');
    }

    res.json({
      message: 'Joined tournament successfully',
      tournament: {
        ...tournament,
        status: isFull ? 'live' : tournament.status,
        participant_count: newParticipantCount,
        is_full: isFull,
        participants,
        is_participant: true
      }
    });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Close tournament (organizer only)
const closeTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Verify user is the organizer
    if (tournament.created_by !== userId) {
      return res.status(403).json({ error: 'Only the tournament organizer can close the tournament' });
    }

    // Can only close open tournaments (not live or completed)
    if (tournament.status !== 'open') {
      return res.status(400).json({ error: 'Can only close tournaments that are still open' });
    }

    await Tournament.updateStatus(id, 'closed');

    const updatedTournament = await Tournament.findById(id);
    const participants = await Tournament.getParticipants(id);

    res.json({
      message: 'Tournament closed successfully',
      tournament: {
        ...updatedTournament,
        participant_count: participants.length,
        participants
      }
    });
  } catch (error) {
    console.error('Close tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Kick participant (organizer only)
const kickParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId: participantId } = req.body;
    const organizerId = req.user.userId;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Verify user is the organizer
    if (tournament.created_by !== organizerId) {
      return res.status(403).json({ error: 'Only the tournament organizer can remove participants' });
    }

    // Can only kick from open tournaments (not live)
    if (tournament.status !== 'open') {
      return res.status(400).json({ error: 'Cannot remove participants from live tournaments' });
    }

    // Verify participant exists
    const isParticipant = await Tournament.isUserParticipant(id, participantId);
    if (!isParticipant) {
      return res.status(404).json({ error: 'User is not a participant in this tournament' });
    }

    // Cannot kick yourself
    if (participantId === organizerId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the tournament' });
    }

    await Tournament.removeParticipant(id, participantId);

    const participants = await Tournament.getParticipants(id);

    res.json({
      message: 'Participant removed successfully',
      tournament: {
        ...tournament,
        participant_count: participants.length,
        participants
      }
    });
  } catch (error) {
    console.error('Kick participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Generate bracket (manual trigger for debugging/admin)
const generateBracket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.userId : null;

    console.log(`[GENERATE BRACKET] Starting for tournament ${id}`);

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      console.log(`[GENERATE BRACKET] Tournament ${id} not found`);
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Skip organizer check for debug endpoint (no auth)
    if (userId && tournament.created_by !== userId) {
      console.log(`[GENERATE BRACKET] User ${userId} is not the organizer`);
      return res.status(403).json({ error: 'Only the tournament organizer can generate the bracket' });
    }

    const participants = await Tournament.getParticipants(id);
    const participantCount = participants.length;

    console.log(`[GENERATE BRACKET] Tournament ${id} has ${participantCount} participants, limit is ${tournament.player_limit}`);

    if (participantCount < tournament.player_limit) {
      console.log(`[GENERATE BRACKET] Tournament not full`);
      return res.status(400).json({ error: 'Tournament must be full to generate bracket' });
    }

    // Check if bracket has already been generated
    const existingMatches = await Match.findByTournament(id);
    if (existingMatches.length > 0) {
      console.log(`[GENERATE BRACKET] Bracket already exists with ${existingMatches.length} matches`);
      return res.status(400).json({ error: 'Bracket already exists' });
    }

    console.log(`[MANUAL BRACKET GENERATION] Generating bracket for tournament ${id}`);
    await Match.generateBracket(id, participants);
    await Tournament.updateStatus(id, 'live');

    const updatedTournament = await Tournament.findById(id);
    const matches = await Match.findByTournament(id);

    console.log(`[GENERATE BRACKET] Completed. Generated ${matches.length} matches`);

    res.json({
      message: 'Bracket generated successfully',
      tournament: {
        ...updatedTournament,
        participant_count: participantCount,
        is_full: true,
        participants
      },
      matches
    });
  } catch (error) {
    console.error('Generate bracket error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
};

// Update tournament PIN (organizer only)
const updatePin = async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    const userId = req.user.userId;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Verify user is the organizer
    if (tournament.created_by !== userId) {
      return res.status(403).json({ error: 'Only the tournament organizer can update the PIN' });
    }

    // Validate PIN format (5 digits)
    if (pin && (!/^\d{5}$/.test(pin))) {
      return res.status(400).json({ error: 'PIN must be exactly 5 digits' });
    }

    await Tournament.updatePin(id, pin || null);

    const updatedTournament = await Tournament.findById(id);
    res.json({
      message: 'PIN updated successfully',
      tournament: updatedTournament
    });
  } catch (error) {
    console.error('Update PIN error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete tournament (organizer only)
const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Verify user is the organizer
    if (tournament.created_by !== userId) {
      return res.status(403).json({ error: 'Only the tournament organizer can delete the tournament' });
    }

    // Get all participants to send notifications
    const participants = await Tournament.getParticipants(id);

    // Delete tournament (cascade delete will handle matches and participants)
    await pool.execute('DELETE FROM tournaments WHERE id = ?', [id]);

    // Send notification to all participants (if any)
    if (participants.length > 0) {
      const notificationMessage = reason 
        ? `"${tournament.name}" has been deleted by the organizer. Reason: ${reason}`
        : `"${tournament.name}" has been deleted by the organizer.`;
      
      await Notification.createBulk(
        participants.map((participant) => ({
          userId: participant.user_id,
          type: 'tournament_joined',
          title: 'Tournament Deleted',
          message: notificationMessage,
          relatedTournamentId: null,
          relatedMatchId: null,
        }))
      );
    }

    res.json({
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search tournaments
const searchTournaments = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user ? req.user.userId : null;

    if (!q || q.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const tournaments = await Tournament.search(q.trim(), userId);

    res.json({ tournaments });
  } catch (error) {
    console.error('Search tournaments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createTournament,
  getTournaments,
  getRecentTournaments,
  getTournament,
  joinTournament,
  kickParticipant,
  generateBracket,
  updatePin,
  deleteTournament,
  searchTournaments
};
