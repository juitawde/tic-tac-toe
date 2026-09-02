const gameState = require('../controllers/gameController');
const { saveMatchRecord, fetchHistoryRecords } = require('../controllers/historyController');
const { validateUsernameString } = require('../middlewares/validationMiddleware');

/**
 * Socket.io Event Manager (Multi-Room Architecture)
 * 
 * New Game flow:
 *  1. Player clicks "NEW GAME" → emits `request-new-game`
 *  2. Server broadcasts `new-game-request` to the room (with requester name)
 *  3. Both players see a dialog asking "Play again? YES / NO"
 *  4. Each player emits `new-game-response { accepted: true/false }`
 *  5. Server tracks votes. If both accept → emit `game-reset` + `game-start`
 *     If anyone rejects → emit `new-game-declined` (which can optionally send players back to lobby)
 */

function setupSocketIO(io) {
  // Pending new-game votes: roomId -> { votes: Map<socketId, bool>, requester: username }
  const pendingNewGameVotes = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected [ID: ${socket.id}]`);

    // ── CREATE ROOM ────────────────────────────────────────────────────────────
    socket.on('create-room', (data) => {
      const usernameInput = data && data.username ? data.username : '';
      const validation = validateUsernameString(usernameInput);

      if (!validation.valid) {
        return socket.emit('room-error', { message: validation.message });
      }

      const res = gameState.createRoom(socket.id, validation.username);
      socket.join(res.roomId);

      socket.emit('room-created', {
        roomId: res.roomId,
        symbol: res.symbol,
        username: validation.username,
        gameState: res.room
      });

      io.to(res.roomId).emit('players-update', gameState.getPlayersSummary(res.roomId));
    });

    // ── JOIN ROOM ──────────────────────────────────────────────────────────────
    socket.on('join-room', (data) => {
      const usernameInput = data && data.username ? data.username : '';
      const roomIdInput = data && data.roomId ? data.roomId : '';

      const validation = validateUsernameString(usernameInput);
      if (!validation.valid) {
        return socket.emit('room-error', { message: validation.message });
      }

      if (!roomIdInput) {
        return socket.emit('room-error', { message: 'Please enter a Room Code.' });
      }

      const res = gameState.joinRoom(socket.id, validation.username, roomIdInput);
      if (!res.success) {
        return socket.emit('room-error', { message: res.error });
      }

      socket.join(res.roomId);

      socket.emit('room-joined', {
        roomId: res.roomId,
        symbol: res.symbol,
        username: validation.username,
        gameState: res.room
      });

      io.to(res.roomId).emit('players-update', gameState.getPlayersSummary(res.roomId));

      // Start match when both players are connected
      if (res.room.players.X && res.room.players.O) {
        io.to(res.roomId).emit('game-start', {
          roomId: res.roomId,
          playerX: res.room.players.X.username,
          playerO: res.room.players.O.username,
          currentTurn: res.room.currentTurn,
          board: res.room.board
        });

        console.log(`🚀 Match Started in Room [${res.roomId}]: ${res.room.players.X.username} vs ${res.room.players.O.username}`);
      }
    });

    // ── MAKE MOVE ─────────────────────────────────────────────────────────────
    socket.on('make-move', (data) => {
      const { index, symbol, roomId } = data || {};
      const moveResult = gameState.processMove(socket.id, roomId, index, symbol);

      if (!moveResult.success) {
        return socket.emit('move-error', { message: moveResult.error });
      }

      const room = gameState.getRoom(roomId);
      const pX = room && room.players.X ? room.players.X.username : 'Player X';
      const pO = room && room.players.O ? room.players.O.username : 'Player O';

      if (moveResult.gameOver) {
        // ── Broadcast final board immediately ─────────────────────────────────
        io.to(roomId).emit('move-made', {
          index, symbol, board: moveResult.board, nextTurn: null
        });

        // ── Show winner modal on BOTH screens RIGHT NOW — don't wait for DB ──
        io.to(roomId).emit('game-over', {
          winner:        moveResult.winner,
          winningSymbol: moveResult.winningSymbol,
          combo:         moveResult.combo,
          board:         moveResult.board,
          totalMoves:    moveResult.totalMoves,
          history:       []   // history will be pushed separately once DB saves
        });

        // ── Save to DB in background (non-blocking) ────────────────────────
        saveMatchRecord(roomId, pX, pO, moveResult.winner, moveResult.winningSymbol, moveResult.totalMoves)
          .then(async () => {
            const updatedHistory = await fetchHistoryRecords(roomId);
            // Push updated history to both screens after save completes
            io.to(roomId).emit('history-update', { history: updatedHistory });
          })
          .catch((err) => {
            console.error('Background DB save error (non-fatal):', err.message);
          });

      } else {
        io.to(roomId).emit('move-made', {
          index,
          symbol,
          board: moveResult.board,
          nextTurn: moveResult.nextTurn
        });
      }
    });

    // ── REQUEST NEW GAME (Step 1: Player asks to play again) ─────────────────
    socket.on('request-new-game', (data) => {
      const roomId = data && data.roomId ? data.roomId : null;
      if (!roomId) return;

      const room = gameState.getRoom(roomId);
      if (!room) return;

      // Only valid after game is over
      const requesterSymbol = room.players.X && room.players.X.id === socket.id ? 'X'
        : room.players.O && room.players.O.id === socket.id ? 'O' : null;

      if (!requesterSymbol) return;
      const requesterName = room.players[requesterSymbol].username;

      // Start fresh vote tracking for this room
      pendingNewGameVotes.set(roomId, {
        votes: new Map([[socket.id, true]]), // requester auto-votes YES
        requester: requesterName
      });

      // Tell BOTH players in the room about the request
      io.to(roomId).emit('new-game-request', {
        requester: requesterName,
        requesterSocketId: socket.id,
        message: `${requesterName} wants to play again!`
      });

      console.log(`🔁 New game requested by ${requesterName} in Room [${roomId}]`);
    });

    // ── NEW GAME RESPONSE (Step 2: Other player accepts or declines) ──────────
    socket.on('new-game-response', (data) => {
      const { roomId, accepted } = data || {};
      if (!roomId) return;

      const pending = pendingNewGameVotes.get(roomId);
      if (!pending) return;

      const room = gameState.getRoom(roomId);
      if (!room) return;

      // Record this player's vote
      pending.votes.set(socket.id, accepted);

      const totalPlayers = [room.players.X, room.players.O].filter(Boolean).length;
      const totalVotes = pending.votes.size;

      // If anyone voted NO → decline immediately
      if (!accepted) {
        pendingNewGameVotes.delete(roomId);
        io.to(roomId).emit('new-game-declined', {
          message: 'A player chose not to continue. Returning to lobby...'
        });
        console.log(`❌ New game declined in Room [${roomId}]`);
        return;
      }

      // If all players voted YES → start new game
      if (totalVotes >= totalPlayers) {
        pendingNewGameVotes.delete(roomId);
        gameState.resetRoom(roomId);
        const updatedRoom = gameState.getRoom(roomId);

        io.to(roomId).emit('game-reset', {
          message: 'New game starting!',
          board: updatedRoom ? updatedRoom.board : Array(9).fill(null)
        });

        if (updatedRoom && updatedRoom.players.X && updatedRoom.players.O) {
          io.to(roomId).emit('game-start', {
            roomId: updatedRoom.roomId,
            playerX: updatedRoom.players.X.username,
            playerO: updatedRoom.players.O.username,
            currentTurn: updatedRoom.currentTurn,
            board: updatedRoom.board
          });
        }

        console.log(`✅ New game started in Room [${roomId}]`);
      }
      // else: still waiting for the other player's response
    });

    // ── GET HISTORY ───────────────────────────────────────────────────────────
    socket.on('get-history', async (data) => {
      const roomId = data && data.roomId ? data.roomId : null;
      try {
        const history = await fetchHistoryRecords(roomId);
        socket.emit('history-data', { history: history || [] });
      } catch (err) {
        console.error('Error fetching history:', err);
        socket.emit('history-data', { history: [] });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const res = gameState.leaveSocket(socket.id);
      if (res && res.disconnectedUser) {
        console.log(`👋 Player ${res.disconnectedUser} left Room [${res.roomId}]`);

        // Clean up any pending new-game vote for this room
        pendingNewGameVotes.delete(res.roomId);

        io.to(res.roomId).emit('players-update', gameState.getPlayersSummary(res.roomId));
        io.to(res.roomId).emit('player-disconnected', {
          username: res.disconnectedUser,
          symbol: res.disconnectedSymbol,
          message: `${res.disconnectedUser} (${res.disconnectedSymbol}) left the room.`
        });
      }
    });
  });
}

module.exports = setupSocketIO;
