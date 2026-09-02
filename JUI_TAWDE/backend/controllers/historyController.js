const GameHistory = require('../models/GameHistory');
const { fallbackHistory } = require('../config/db');

/**
 * Controller for managing Game History DB operations
 */

async function getGameHistory(req, res, next) {
  try {
    const records = await fetchHistoryRecords();
    return res.status(200).json({
      success: true,
      count: records.length,
      history: records
    });
  } catch (error) {
    next(error);
  }
}

async function fetchHistoryRecords(roomId = null) {
  try {
    const query = roomId ? { roomId: roomId.toUpperCase() } : {};
    const records = await GameHistory.find(query).sort({ playedAt: -1 }).limit(20);
    if (records) return records;
  } catch (err) {
    console.warn('MongoDB fetch error, falling back to memory:', err.message);
  }
  
  if (roomId) {
    return fallbackHistory.filter(r => r.roomId === roomId.toUpperCase()).slice(0, 20);
  }
  return fallbackHistory.slice(0, 20);
}

async function saveMatchRecord(roomId, playerX, playerO, winner, winningSymbol, totalMoves) {
  const matchData = {
    roomId: roomId ? roomId.toUpperCase() : 'LOBBY',
    playerX,
    playerO,
    winner,
    winningSymbol,
    totalMoves,
    playedAt: new Date()
  };

  try {
    const record = new GameHistory(matchData);
    await record.save();
    console.log(`💾 Saved game record for Room [${matchData.roomId}] to MongoDB:`, record._id);
    return record;
  } catch (err) {
    console.warn('Failed saving to MongoDB, using fallback:', err.message);
    fallbackHistory.unshift(matchData);
    return matchData;
  }
}

module.exports = {
  getGameHistory,
  fetchHistoryRecords,
  saveMatchRecord
};
