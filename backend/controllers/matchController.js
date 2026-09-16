const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const Notification = require('../models/Notification');
const { extractScoreFromScreenshot } = require('../services/aiService');
const { uploadImage } = require('../services/cloudinaryService');

// Get single match
const getMatch = async (req, res) => {
  try {
    const { id } = req.params;
    // Opportunistic deadline check so alerts fire without waiting for the interval
    try {
      await Match.processOverdueDeadlines();
    } catch (e) {
      console.error('Deadline check error:', e);
    }

    const match = await Match.findById(id);

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ match });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get matches by tournament
const getTournamentMatches = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    try {
      await Match.processOverdueDeadlines();
    } catch (e) {
      console.error('Deadline check error:', e);
    }

    const matches = await Match.findByTournament(tournamentId);

    // Group matches by round
    const rounds = {};
    matches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    res.json({ matches, rounds });
  } catch (error) {
    console.error('Get tournament matches error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Submit result with screenshot
const submitResult = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Screenshot is required' });
    }

    const match = await Match.findById(id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is a player in this match
    if (match.player_1_id !== userId && match.player_2_id !== userId) {
      return res.status(403).json({ error: 'You are not a player in this match' });
    }

    // Determine which player is submitting
    const playerNumber = match.player_1_id === userId ? 1 : 2;

    // Check if this player has already submitted
    const existingScreenshot = playerNumber === 1 ? match.player_1_screenshot_url : match.player_2_screenshot_url;
    if (existingScreenshot) {
      return res.status(400).json({ error: 'You have already submitted a result' });
    }

    const uploaded = await uploadImage(req.file, {
      folder: 'ef-matchday/screenshots',
      publicId: `match-${id}-p${playerNumber}-${Date.now()}`,
    });
    const screenshotUrl = uploaded.url;
    await Match.updateScreenshot(id, playerNumber, screenshotUrl);

    // Extract score using AI (from in-memory buffer; OCR optional)
    const extractedScore = await extractScoreFromScreenshot(req.file.buffer);
    
    // Store reported score
    await Match.updateReportedScore(id, playerNumber, extractedScore);

    // Send result_submitted notification to the submitting player
    await Notification.create(
      userId,
      'result_submitted',
      'Result Submitted',
      'Your match result has been submitted successfully. Waiting for your opponent to submit theirs.',
      match.tournament_id,
      id
    );

    // Update match status to live if both players have submitted
    const updatedMatch = await Match.findById(id);
    if (updatedMatch.player_1_reported_score && updatedMatch.player_2_reported_score) {
      // Verify scores
      const verification = await Match.verifyScores(id);
      
      return res.json({
        message: 'Result submitted and verified',
        match: await Match.findById(id),
        verification
      });
    }

    res.json({
      message: 'Result submitted successfully',
      match: await Match.findById(id),
      waitingForOpponent: true
    });
  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({
      error: error.message?.includes('Cloudinary is not configured')
        ? error.message
        : 'Server error during result submission',
    });
  }
};

// Resolve mismatch (organizer only)
const resolveMismatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId } = req.body;
    const userId = req.user.userId;

    const match = await Match.findById(id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Get tournament to verify user is organizer
    const Tournament = require('../models/Tournament');
    const tournament = await Tournament.findById(match.tournament_id);
    
    // Organizer or platform admin can resolve
    if (tournament.created_by !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the tournament organizer or an admin can resolve mismatches' });
    }

    if (match.verification_status !== 'mismatch') {
      return res.status(400).json({ error: 'This match does not have a mismatch to resolve' });
    }

    // Verify winnerId is one of the players
    if (winnerId !== match.player_1_id && winnerId !== match.player_2_id) {
      return res.status(400).json({ error: 'Invalid winner ID' });
    }

    // Resolve mismatch
    const result = await Match.resolveMismatch(id, winnerId);

    res.json({
      message: 'Mismatch resolved successfully',
      match: await Match.findById(id),
      result
    });
  } catch (error) {
    console.error('Resolve mismatch error:', error);
    res.status(500).json({ error: 'Server error during mismatch resolution' });
  }
};

// Manual score edit (organizer only)
const manualScoreEdit = async (req, res) => {
  try {
    const { id } = req.params;
    const { player_1_score, player_2_score, winnerId } = req.body;
    const userId = req.user.userId;

    const match = await Match.findById(id);
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Get tournament to verify user is organizer
    const tournament = await Tournament.findById(match.tournament_id);
    
    if (tournament.created_by !== userId) {
      return res.status(403).json({ error: 'Only the tournament organizer can edit scores' });
    }

    // Validate scores
    if (player_1_score < 0 || player_2_score < 0) {
      return res.status(400).json({ error: 'Scores cannot be negative' });
    }

    // Verify winnerId is one of the players or null (for draw)
    if (winnerId && winnerId !== match.player_1_id && winnerId !== match.player_2_id) {
      return res.status(400).json({ error: 'Invalid winner ID' });
    }

    // Determine actual winner based on scores if winnerId not provided
    let actualWinnerId = winnerId;
    if (!actualWinnerId) {
      if (player_1_score > player_2_score) {
        actualWinnerId = match.player_1_id;
      } else if (player_2_score > player_1_score) {
        actualWinnerId = match.player_2_id;
      }
    }

    // Check if this match has a next match and if that next match has already been played
    let conflictWarning = null;
    if (match.next_match_id) {
      const nextMatch = await Match.findById(match.next_match_id);
      if (nextMatch && (nextMatch.status === 'completed' || nextMatch.status === 'live')) {
        // Check if the old winner is in the next match
        const oldWinnerInNextMatch = match.winner_id === nextMatch.player_1_id || match.winner_id === nextMatch.player_2_id;
        if (oldWinnerInNextMatch && actualWinnerId !== match.winner_id) {
          conflictWarning = 'Warning: The next match has already been played with the previous winner. Changing the winner may cause bracket inconsistencies.';
        }
      }


    }

    // Update match with manual edit flag
    await Match.updateResultManual(id, player_1_score, player_2_score, actualWinnerId, userId);

    // If there's a next match, advance winner to it
    if (match.next_match_id && actualWinnerId) {
      await Match.advanceWinner(actualWinnerId, match.next_match_id);
    }

    // Send score_manually_edited notification to both players
    if (match.player_1_id) {
      await Notification.create(
        match.player_1_id,
        'score_manually_edited',
        'Score Manually Edited',
        `The score for your match has been manually edited by the tournament organizer.`,
        match.tournament_id,
        id
      );
    }
    if (match.player_2_id) {
      await Notification.create(
        match.player_2_id,
        'score_manually_edited',
        'Score Manually Edited',
        `The score for your match has been manually edited by the tournament organizer.`,
        match.tournament_id,
        id
      );
    }

    res.json({
      message: 'Score edited successfully',
      match: await Match.findById(id),
      conflictWarning
    });
  } catch (error) {
    console.error('Manual score edit error:', error);
    res.status(500).json({ error: 'Server error during score edit' });
  }
};

// Direct result input by organizer (no screenshot required)
const directResultInput = async (req, res) => {
  try {
    const { id } = req.params;
    const { player_1_score, player_2_score, winnerId } = req.body;
    const organizerId = req.user.userId;

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is tournament organizer
    const tournament = await Tournament.findById(match.tournament_id);
    if (!tournament || tournament.created_by !== organizerId) {
      return res.status(403).json({ error: 'Only tournament organizers can input results directly' });
    }

    // Determine winner if not specified
    let actualWinnerId = winnerId;
    if (!actualWinnerId) {
      if (player_1_score > player_2_score) {
        actualWinnerId = match.player_1_id;
      } else if (player_2_score > player_1_score) {
        actualWinnerId = match.player_2_id;
      }
    }

    // Update match with direct input flag
    await Match.updateResultDirect(id, player_1_score, player_2_score, actualWinnerId, organizerId);

    // If there's a next match, advance winner to it
    if (match.next_match_id && actualWinnerId) {
      await Match.advanceWinner(actualWinnerId, match.next_match_id);
    }

    // Send result_submitted notification to both players
    if (match.player_1_id) {
      await Notification.create(
        match.player_1_id,
        'result_submitted',
        'Match Result Submitted',
        `The tournament organizer has submitted the result for your match.`,
        match.tournament_id,
        id
      );
    }
    if (match.player_2_id) {
      await Notification.create(
        match.player_2_id,
        'result_submitted',
        'Match Result Submitted',
        `The tournament organizer has submitted the result for your match.`,
        match.tournament_id,
        id
      );
    }

    res.json({
      message: 'Result submitted successfully',
      match: await Match.findById(id)
    });
  } catch (error) {
    console.error('Direct result input error:', error);
    res.status(500).json({ error: 'Server error during result submission' });
  }
};

const assertOrganizerAndOverdue = async (matchId, organizerId) => {
  const match = await Match.findById(matchId);
  if (!match) {
    return { error: { status: 404, message: 'Match not found' } };
  }

  const tournament = await Tournament.findById(match.tournament_id);
  if (!tournament || tournament.created_by !== organizerId) {
    return { error: { status: 403, message: 'Only the tournament organizer can perform this action' } };
  }

  if (match.status === 'completed') {
    return { error: { status: 400, message: 'Match is already completed' } };
  }

  if (!match.match_deadline) {
    return { error: { status: 400, message: 'This match has no time limit' } };
  }

  if (new Date(match.match_deadline) > new Date()) {
    return { error: { status: 400, message: 'Match deadline has not passed yet' } };
  }

  return { match, tournament };
};

// Organizer: extend match deadline after it has passed
const extendDeadline = async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;
    const organizerId = req.user.userId;

    const minutesInt = parseInt(minutes, 10);
    if (!minutesInt || minutesInt < 1 || minutesInt > 1440) {
      return res.status(400).json({ error: 'Minutes must be between 1 and 1440' });
    }

    const check = await assertOrganizerAndOverdue(id, organizerId);
    if (check.error) {
      return res.status(check.error.status).json({ error: check.error.message });
    }

    await Match.extendDeadline(id, minutesInt);
    const updated = await Match.findById(id);

    const recipients = [updated.player_1_id, updated.player_2_id].filter(Boolean);
    if (recipients.length > 0) {
      await Notification.createBulk(
        recipients.map((userId) => ({
          userId,
          type: 'match_deadline_reached',
          title: 'Match Deadline Extended',
          message: `The organizer added ${minutesInt} more minute${minutesInt === 1 ? '' : 's'} to your match deadline. Please complete the match.`,
          relatedTournamentId: updated.tournament_id,
          relatedMatchId: updated.id,
        }))
      );
    }

    res.json({
      message: 'Deadline extended successfully',
      match: updated,
    });
  } catch (error) {
    console.error('Extend deadline error:', error);
    res.status(500).json({ error: 'Server error extending deadline' });
  }
};

// Organizer: force forfeit / walkover after deadline passed
const forceForfeit = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId } = req.body;
    const organizerId = req.user.userId;

    if (!winnerId) {
      return res.status(400).json({ error: 'winnerId is required' });
    }

    const check = await assertOrganizerAndOverdue(id, organizerId);
    if (check.error) {
      return res.status(check.error.status).json({ error: check.error.message });
    }

    const { match, tournament } = check;
    const winnerIdInt = parseInt(winnerId, 10);

    if (winnerIdInt !== match.player_1_id && winnerIdInt !== match.player_2_id) {
      return res.status(400).json({ error: 'Winner must be one of the match players' });
    }

    await Match.forceForfeit(id, winnerIdInt);

    if (match.next_match_id) {
      await Match.advanceWinner(winnerIdInt, match.next_match_id);
    }

    const winnerName =
      winnerIdInt === match.player_1_id ? match.player_1_username : match.player_2_username;
    const loserId =
      winnerIdInt === match.player_1_id ? match.player_2_id : match.player_1_id;

    const notifications = [];
    if (winnerIdInt) {
      notifications.push({
        userId: winnerIdInt,
        type: 'match_won',
        title: 'Walkover Win',
        message: `You advanced by forfeit (W/O) in "${tournament.name}".`,
        relatedTournamentId: match.tournament_id,
        relatedMatchId: match.id,
      });
    }
    if (loserId) {
      notifications.push({
        userId: loserId,
        type: 'match_lost',
        title: 'Match Forfeit',
        message: `Your match in "${tournament.name}" was awarded to ${winnerName || 'your opponent'} by forfeit (W/O).`,
        relatedTournamentId: match.tournament_id,
        relatedMatchId: match.id,
      });
    }
    if (notifications.length) {
      await Notification.createBulk(notifications);
    }

    res.json({
      message: 'Match completed by forfeit',
      match: await Match.findById(id),
    });
  } catch (error) {
    console.error('Force forfeit error:', error);
    res.status(500).json({ error: 'Server error forcing forfeit' });
  }
};

module.exports = {
  getMatch,
  getTournamentMatches,
  submitResult,
  resolveMismatch,
  manualScoreEdit,
  directResultInput,
  extendDeadline,
  forceForfeit,
};
