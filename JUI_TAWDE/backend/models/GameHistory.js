const mongoose = require('mongoose');

/**
 * GameHistory Schema
 * Stores game records per Room Code (Player X, Player O, Winner, Total Moves, Played At)
 */
const gameHistorySchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  playerX: {
    type: String,
    required: true,
    trim: true
  },
  playerO: {
    type: String,
    required: true,
    trim: true
  },
  winner: {
    type: String,
    required: true,
    trim: true
  },
  winningSymbol: {
    type: String,
    enum: ['X', 'O', 'Draw'],
    required: true
  },
  totalMoves: {
    type: Number,
    required: true,
    min: 0
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GameHistory', gameHistorySchema);
