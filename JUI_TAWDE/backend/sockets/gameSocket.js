const gameState = require('../controllers/gameController');
const { saveMatchRecord, fetchHistoryRecords } = require('../controllers/historyController');
const { validateUsernameString } = require('../middlewares/validationMiddleware');

/**
 * Socket.io Event Manager (Multi-Room Architecture)
 */

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected [ID: ${socket.id}]`);

    // Event: create-room
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

    // Event: join-room
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

    // Event: make-move
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
        io.to(roomId).emit('move-made', {
          index,
          symbol,
          board: moveResult.board,
          nextTurn: null
        });

        saveMatchRecord(
          roomId,
          pX,
          pO,
          moveResult.winner,
          moveResult.winningSymbol,
          moveResult.totalMoves
        ).then(async () => {
          const updatedHistory = await fetchHistoryRecords(roomId);

          io.to(roomId).emit('game-over', {
            winner: moveResult.winner,
            winningSymbol: moveResult.winningSymbol,
            combo: moveResult.combo,
            board: moveResult.board,
            totalMoves: moveResult.totalMoves,
            history: updatedHistory
          });
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

    // Event: reset-game
    socket.on('reset-game', (data) => {
      const roomId = data && data.roomId ? data.roomId : null;
      if (!roomId) return;

      console.log(`🔄 Room [${roomId}] reset requested`);
      gameState.resetRoom(roomId);

      const room = gameState.getRoom(roomId);

      io.to(roomId).emit('game-reset', {
        message: 'Game match reset.',
        board: room ? room.board : Array(9).fill(null)
      });

      if (room && room.players.X && room.players.O) {
        io.to(roomId).emit('game-start', {
          roomId: room.roomId,
          playerX: room.players.X.username,
          playerO: room.players.O.username,
          currentTurn: room.currentTurn,
          board: room.board
        });
      }
    });

    // Event: get-history
    socket.on('get-history', async (data) => {
      const roomId = data && data.roomId ? data.roomId : null;
      const history = await fetchHistoryRecords(roomId);
      socket.emit('history-data', { history });
    });

    // Event: disconnect
    socket.on('disconnect', () => {
      const res = gameState.leaveSocket(socket.id);
      if (res && res.disconnectedUser) {
        console.log(`👋 Player ${res.disconnectedUser} left Room [${res.roomId}]`);
        io.to(res.roomId).emit('players-update', gameState.getPlayersSummary(res.roomId));
        io.to(res.roomId).emit('player-disconnected', {
          username: res.disconnectedUser,
          symbol: res.disconnectedSymbol,
          message: `Player ${res.disconnectedUser} (${res.disconnectedSymbol}) left the room.`
        });
      }
    });
  });
}

module.exports = setupSocketIO;
