const { checkWinner } = require('../utils/winnerChecker');

/**
 * Controller for Multi-Room Tic Tac Toe Mechanics
 */

class MultiRoomGameController {
  constructor() {
    this.rooms = new Map(); // roomId -> Room object
    this.socketToRoom = new Map(); // socketId -> roomId
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ROOM-${code}`;
  }

  createRoom(socketId, username) {
    let roomId = this.generateRoomCode();
    // Ensure uniqueness
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }

    const room = {
      roomId,
      players: {
        X: { id: socketId, username },
        O: null
      },
      board: Array(9).fill(null),
      currentTurn: 'X',
      gameActive: false,
      totalMoves: 0,
      winner: null
    };

    this.rooms.set(roomId, room);
    this.socketToRoom.set(socketId, roomId);

    console.log(`🏠 Room [${roomId}] created by Player X (${username})`);
    return { success: true, roomId, room, symbol: 'X' };
  }

  joinRoom(socketId, username, targetRoomId) {
    const roomId = targetRoomId ? targetRoomId.trim().toUpperCase() : '';

    if (!roomId || !this.rooms.has(roomId)) {
      return { success: false, error: 'Invalid Room Code! Room does not exist.' };
    }

    const room = this.rooms.get(roomId);

    // Check duplicate username in room
    const lowerName = username.toLowerCase();
    if (
      (room.players.X && room.players.X.username.toLowerCase() === lowerName) ||
      (room.players.O && room.players.O.username.toLowerCase() === lowerName)
    ) {
      return { success: false, error: 'Username is already taken in this room.' };
    }

    if (room.players.X && room.players.O) {
      return { success: false, error: 'Room is full! Maximum 2 players allowed per room.' };
    }

    let assignedSymbol = null;
    if (!room.players.X) {
      room.players.X = { id: socketId, username };
      assignedSymbol = 'X';
    } else {
      room.players.O = { id: socketId, username };
      assignedSymbol = 'O';
    }

    this.socketToRoom.set(socketId, roomId);

    if (room.players.X && room.players.O) {
      room.gameActive = true;
      room.board = Array(9).fill(null);
      room.currentTurn = 'X';
      room.totalMoves = 0;
      room.winner = null;
    }

    console.log(`👤 Player (${username}) joined Room [${roomId}] as Player ${assignedSymbol}`);
    return { success: true, roomId, room, symbol: assignedSymbol };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId ? roomId.toUpperCase() : '');
  }

  getPlayersSummary(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return { playerX: null, playerO: null, activeCount: 0 };
    return {
      roomId: room.roomId,
      playerX: room.players.X ? room.players.X.username : null,
      playerO: room.players.O ? room.players.O.username : null,
      activeCount: (room.players.X ? 1 : 0) + (room.players.O ? 1 : 0)
    };
  }

  processMove(socketId, roomId, index, symbol) {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }

    if (!room.gameActive) {
      return { success: false, error: 'Game is not currently active.' };
    }

    if (room.currentTurn !== symbol) {
      return { success: false, error: `Not your turn! Waiting for Player ${room.currentTurn}.` };
    }

    const currentSocket = room.players[symbol];
    if (!currentSocket || currentSocket.id !== socketId) {
      return { success: false, error: 'Unauthorized move request.' };
    }

    if (index < 0 || index > 8 || room.board[index] !== null) {
      return { success: false, error: 'Selected cell is invalid or already filled.' };
    }

    // Apply move
    room.board[index] = symbol;
    room.totalMoves += 1;

    // Check winner
    const result = checkWinner(room.board);

    if (result) {
      room.gameActive = false;
      let winnerName = 'Draw';
      if (result.winnerSymbol === 'X') winnerName = room.players.X.username;
      if (result.winnerSymbol === 'O') winnerName = room.players.O.username;
      room.winner = winnerName;

      return {
        success: true,
        gameOver: true,
        winner: winnerName,
        winningSymbol: result.winnerSymbol,
        combo: result.combo,
        board: room.board,
        totalMoves: room.totalMoves
      };
    }

    // Toggle turn
    room.currentTurn = room.currentTurn === 'X' ? 'O' : 'X';

    return {
      success: true,
      gameOver: false,
      board: room.board,
      nextTurn: room.currentTurn
    };
  }

  resetRoom(roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.currentTurn = 'X';
      room.totalMoves = 0;
      room.winner = null;
      room.gameActive = room.players.X && room.players.O ? true : false;
    }
  }

  leaveSocket(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    this.socketToRoom.delete(socketId);
    const room = this.rooms.get(roomId);
    if (!room) return null;

    let disconnectedUser = null;
    let disconnectedSymbol = null;

    if (room.players.X && room.players.X.id === socketId) {
      disconnectedUser = room.players.X.username;
      disconnectedSymbol = 'X';
      room.players.X = null;
    } else if (room.players.O && room.players.O.id === socketId) {
      disconnectedUser = room.players.O.username;
      disconnectedSymbol = 'O';
      room.players.O = null;
    }

    room.gameActive = false;

    // Delete empty room
    if (!room.players.X && !room.players.O) {
      this.rooms.delete(roomId);
      console.log(`🧹 Deleted empty Room [${roomId}]`);
    }

    return { roomId, disconnectedUser, disconnectedSymbol, room };
  }
}

module.exports = new MultiRoomGameController();
