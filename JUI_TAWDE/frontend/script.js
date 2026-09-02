// ============================================================
// Tic-Tac-Toe Client Script
// Features: play-again vote flow, card-based history, trophy icon
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── THEME ENGINE ─────────────────────────────────────────────────────────────
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const htmlEl = document.documentElement;

  const savedTheme = localStorage.getItem('ttt_theme') || 'light';
  htmlEl.setAttribute('data-theme', savedTheme);

  themeToggleBtn && themeToggleBtn.addEventListener('click', () => {
    const next = htmlEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    htmlEl.setAttribute('data-theme', next);
    localStorage.setItem('ttt_theme', next);
    if (lastWinningCombo) drawWinningLine(lastWinningCombo, lastWinnerSymbol);
  });

  // ── SOCKET.IO INIT ────────────────────────────────────────────────────────────
  const SERVER_URL = (window.location.protocol === 'file:' || !window.location.host)
    ? 'http://localhost:5000'
    : window.location.origin;

  let socket;
  try {
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnection: true });
  } catch (err) {
    console.error('Socket init error:', err);
  }

  // ── CLIENT STATE ──────────────────────────────────────────────────────────────
  let currentRoomId   = null;
  let mySymbol        = null;
  let myUsername      = null;
  let currentTurn     = 'X';
  let isGameActive    = false;
  let playerXName     = null;
  let playerOName     = null;
  let scoreX          = 0;
  let scoreO          = 0;
  let lastWinningCombo   = null;
  let lastWinnerSymbol   = null;
  let iAmRequesterOfNewGame = false; // did I click "PLAY AGAIN"?

  // ── DOM REFS ──────────────────────────────────────────────────────────────────
  const connectionPill     = document.getElementById('connection-pill');
  const connectionText     = document.getElementById('connection-text');
  const roomCodeBadge      = document.getElementById('room-code-badge');
  const displayRoomId      = document.getElementById('display-room-id');
  const copyRoomBtn        = document.getElementById('copy-room-btn');
  const leaveRoomBtnNav    = document.getElementById('leave-room-btn-nav');

  const lobbyModal         = document.getElementById('lobby-modal');
  const waitingModal       = document.getElementById('waiting-modal');
  const shareRoomCode      = document.getElementById('share-room-code');
  const shareCopyBtn       = document.getElementById('share-copy-btn');

  const tabBtnCreate       = document.getElementById('tab-btn-create');
  const tabBtnJoin         = document.getElementById('tab-btn-join');
  const createRoomForm     = document.getElementById('create-room-form');
  const joinRoomForm       = document.getElementById('join-room-form');
  const createUsernameInput = document.getElementById('create-username-input');
  const joinUsernameInput  = document.getElementById('join-username-input');
  const joinRoomidInput    = document.getElementById('join-roomid-input');

  const turnPill           = document.getElementById('turn-pill');
  const turnPillText       = document.getElementById('turn-pill-text');
  const footerMoveText     = document.getElementById('footer-move-text');

  const cardPlayerX        = document.getElementById('card-player-x');
  const cardPlayerO        = document.getElementById('card-player-o');
  const namePlayerX        = document.getElementById('name-player-x');
  const namePlayerO        = document.getElementById('name-player-o');
  const scorePlayerX       = document.getElementById('score-player-x');
  const scorePlayerO       = document.getElementById('score-player-o');

  const boardElement       = document.getElementById('board');
  const cells              = document.querySelectorAll('.cell');
  const canvas             = document.getElementById('winning-line-canvas');

  const resetBtn           = document.getElementById('reset-btn');
  const resetScoreBtn      = document.getElementById('reset-score-btn');
  const viewHistoryBtn     = document.getElementById('view-history-btn');
  const historyModal       = document.getElementById('history-modal');
  const closeHistoryBtn    = document.getElementById('close-history-btn');
  const historyBody        = document.getElementById('history-body');

  // Winner modal
  const winnerModal        = document.getElementById('winner-modal');
  const winnerIconWrap     = document.getElementById('winner-icon-wrap');
  const winnerBannerPill   = document.getElementById('winner-banner-pill');
  const winnerTitle        = document.getElementById('winner-title');
  const winnerSubtitle     = document.getElementById('winner-subtitle');
  const summaryMoves       = document.getElementById('summary-moves');
  const summarySymbol      = document.getElementById('summary-symbol');
  const playAgainBtn       = document.getElementById('play-again-btn');
  const leaveAfterGameBtn  = document.getElementById('leave-after-game-btn');

  // Play Again Confirm modal
  const confirmModal       = document.getElementById('playagain-confirm-modal');
  const confirmTitle       = document.getElementById('confirm-title');
  const confirmMsg         = document.getElementById('confirm-msg');
  const confirmYesBtn      = document.getElementById('confirm-yes-btn');
  const confirmNoBtn       = document.getElementById('confirm-no-btn');
  const confirmWaitingMsg  = document.getElementById('confirm-waiting-msg');

  const toastContainer     = document.getElementById('toast-container');

  // ── TOAST ─────────────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
  }

  // ── TAB SWITCHING ─────────────────────────────────────────────────────────────
  tabBtnCreate && tabBtnCreate.addEventListener('click', () => {
    tabBtnCreate.classList.add('active');
    tabBtnJoin.classList.remove('active');
    createRoomForm.classList.remove('hidden-tab-content');
    joinRoomForm.classList.add('hidden-tab-content');
  });

  tabBtnJoin && tabBtnJoin.addEventListener('click', () => {
    tabBtnJoin.classList.add('active');
    tabBtnCreate.classList.remove('active');
    joinRoomForm.classList.remove('hidden-tab-content');
    createRoomForm.classList.add('hidden-tab-content');
  });

  // ── SOCKET CONNECTION ─────────────────────────────────────────────────────────
  if (!socket) return;

  socket.on('connect', () => {
    connectionPill && (connectionPill.className = 'status-pill connected');
    connectionText && (connectionText.textContent = 'Connected');
  });

  socket.on('disconnect', () => {
    connectionPill && (connectionPill.className = 'status-pill disconnected');
    connectionText && (connectionText.textContent = 'Disconnected');
    showToast('Disconnected from server.', 'error');
  });

  // ── LOBBY FORMS ───────────────────────────────────────────────────────────────
  createRoomForm && createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = createUsernameInput.value.trim();
    if (!username) return;
    socket.emit('create-room', { username });
  });

  joinRoomForm && joinRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = joinUsernameInput.value.trim();
    const roomId   = joinRoomidInput.value.trim().toUpperCase();
    if (!username || !roomId) return;
    socket.emit('join-room', { username, roomId });
  });

  // ── ROOM EVENTS ───────────────────────────────────────────────────────────────
  socket.on('room-created', (data) => {
    currentRoomId = data.roomId;
    mySymbol      = data.symbol;
    myUsername    = data.username;

    lobbyModal.classList.add('hidden');
    waitingModal.classList.remove('hidden');
    shareRoomCode.textContent   = currentRoomId;
    displayRoomId.textContent   = currentRoomId;
    roomCodeBadge.classList.remove('hidden');
    leaveRoomBtnNav && leaveRoomBtnNav.classList.remove('hidden');

    showToast(`Room ${currentRoomId} created! Share code with Player 2.`, 'success');
  });

  socket.on('room-joined', (data) => {
    currentRoomId = data.roomId;
    mySymbol      = data.symbol;
    myUsername    = data.username;

    lobbyModal.classList.add('hidden');
    waitingModal.classList.add('hidden');
    displayRoomId.textContent = currentRoomId;
    roomCodeBadge.classList.remove('hidden');
    leaveRoomBtnNav && leaveRoomBtnNav.classList.remove('hidden');

    showToast(`Joined Room ${currentRoomId}!`, 'success');
  });

  socket.on('room-error', (data) => {
    showToast(data.message || 'Room error occurred.', 'error');
  });

  socket.on('players-update', (data) => {
    playerXName = data.playerX;
    playerOName = data.playerO;
    namePlayerX && (namePlayerX.textContent = playerXName || 'Waiting...');
    namePlayerO && (namePlayerO.textContent = playerOName || 'Waiting...');
    updateTurnUI();
  });

  socket.on('game-start', (data) => {
    isGameActive  = true;
    currentTurn   = data.currentTurn;
    playerXName   = data.playerX;
    playerOName   = data.playerO;

    clearWinningLine();
    waitingModal.classList.add('hidden');
    lobbyModal.classList.add('hidden');
    boardElement.classList.remove('disabled');

    namePlayerX && (namePlayerX.textContent = playerXName || 'Player 1');
    namePlayerO && (namePlayerO.textContent = playerOName || 'Player 2');

    updateBoardUI(data.board);
    updateTurnUI();
    showToast('Game Started! Have fun.', 'info');
  });

  // ── MOVE EVENTS ───────────────────────────────────────────────────────────────
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      if (!isGameActive)          { showToast('Waiting for game to start.', 'error'); return; }
      if (currentTurn !== mySymbol) { showToast(`It's ${currentTurn}'s turn right now!`, 'error'); return; }

      const index = parseInt(cell.getAttribute('data-index'));
      if (cell.classList.contains('x') || cell.classList.contains('o')) {
        showToast('Cell already taken!', 'error');
        return;
      }
      socket.emit('make-move', { index, symbol: mySymbol, roomId: currentRoomId });
    });
  });

  socket.on('move-made', (data) => {
    updateBoardUI(data.board);
    if (data.nextTurn) {
      currentTurn = data.nextTurn;
      updateTurnUI();
    }
  });

  socket.on('move-error', (data) => showToast(data.message || 'Invalid move.', 'error'));

  // ── GAME OVER — shown on BOTH screens via io.to(roomId).emit ─────────────────
  socket.on('game-over', (data) => {
    isGameActive = false;
    boardElement.classList.add('disabled');
    lastWinningCombo  = data.combo;
    lastWinnerSymbol  = data.winningSymbol;

    // Draw winning line on board
    if (data.combo) {
      data.combo.forEach(idx => {
        const c = document.querySelector(`.cell[data-index="${idx}"]`);
        if (c) c.classList.add('winning-cell');
      });
      drawWinningLine(data.combo, data.winningSymbol);
    }

    const isDraw = data.winningSymbol === 'Draw';

    // Update winner icon
    if (winnerIconWrap) {
      winnerIconWrap.className = 'winner-icon-wrap';
      const icon = winnerIconWrap.querySelector('i');
      if (isDraw) {
        winnerIconWrap.classList.add('draw');
        if (icon) { icon.className = 'fa-solid fa-handshake winner-trophy-icon'; }
      } else if (data.winningSymbol === 'X') {
        winnerIconWrap.classList.add('winner-x');
        if (icon) { icon.className = 'fa-solid fa-trophy winner-trophy-icon'; }
      } else {
        winnerIconWrap.classList.add('winner-o');
        if (icon) { icon.className = 'fa-solid fa-trophy winner-trophy-icon'; }
      }
    }

    if (isDraw) {
      winnerBannerPill.textContent = "IT'S A DRAW!";
      winnerBannerPill.className   = 'winner-banner-pill draw-pill';
      winnerTitle.textContent      = "What a Match!";
      winnerSubtitle.textContent   = "Both players played brilliantly!";
      summarySymbol.textContent    = '—';
      summarySymbol.className      = 'value text-purple';
      turnPillText && (turnPillText.textContent = "✦ IT'S A DRAW! ✦");
    } else {
      const isMe = data.winner === myUsername;
      winnerBannerPill.textContent = `${data.winner.toUpperCase()} WINS!`;
      winnerBannerPill.className   = data.winningSymbol === 'X' ? 'winner-banner-pill' : 'winner-banner-pill';
      winnerBannerPill.style.color = data.winningSymbol === 'X' ? 'var(--color-x)' : 'var(--color-o)';
      winnerTitle.textContent      = isMe ? "You Won!" : `${data.winner} Won!`;
      winnerSubtitle.textContent   = isMe ? "Amazing game! You crushed it!" : "Better luck next time!";
      summarySymbol.textContent    = data.winningSymbol;
      summarySymbol.className      = data.winningSymbol === 'X' ? 'value text-x' : 'value text-o';
      turnPillText && (turnPillText.textContent = `${data.winner.toUpperCase()} WINS!`);

      if (data.winningSymbol === 'X') { scoreX++; scorePlayerX && (scorePlayerX.textContent = scoreX); }
      else                            { scoreO++; scorePlayerO && (scorePlayerO.textContent = scoreO); }

      typeof confetti === 'function' && confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    summaryMoves.textContent = data.totalMoves;
    winnerModal.classList.remove('hidden');

    if (data.history && data.history.length > 0) {
      renderHistoryCards(data.history);
    }
  });

  // ── PLAY AGAIN — voter flow ───────────────────────────────────────────────────
  // Step 1: Click "PLAY AGAIN" on winner modal
  playAgainBtn && playAgainBtn.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
    iAmRequesterOfNewGame = true;

    // Emit request to server — server will broadcast new-game-request to room
    socket.emit('request-new-game', { roomId: currentRoomId });

    // Show confirm modal in "waiting" state for the requester
    confirmTitle.textContent = 'Play Again?';
    confirmMsg.textContent   = 'Waiting for your opponent to respond...';
    confirmWaitingMsg.classList.remove('hidden');
    confirmYesBtn.disabled   = true;
    confirmYesBtn.style.opacity = '0.5';
    confirmModal.classList.remove('hidden');
  });

  // Step 2 (other player): Server broadcasts new-game-request
  socket.on('new-game-request', (data) => {
    // If I was the one who clicked play again, I've already voted YES server-side
    if (iAmRequesterOfNewGame) return;

    winnerModal.classList.add('hidden');
    confirmTitle.textContent = 'Play Again?';
    confirmMsg.textContent   = `${escapeHtml(data.requester)} wants to play again! What do you say?`;
    confirmWaitingMsg.classList.add('hidden');
    confirmYesBtn.disabled   = false;
    confirmYesBtn.style.opacity = '1';
    confirmModal.classList.remove('hidden');
  });

  // Step 3: Other player answers YES or NO
  confirmYesBtn && confirmYesBtn.addEventListener('click', () => {
    confirmYesBtn.disabled = true;
    confirmWaitingMsg.classList.remove('hidden');
    confirmMsg.textContent = 'Great! Waiting for confirmation...';
    socket.emit('new-game-response', { roomId: currentRoomId, accepted: true });
  });

  confirmNoBtn && confirmNoBtn.addEventListener('click', () => {
    socket.emit('new-game-response', { roomId: currentRoomId, accepted: false });
    confirmModal.classList.add('hidden');
  });

  // Step 4a: Both said YES → game-reset + game-start fires
  socket.on('game-reset', (data) => {
    updateBoardUI(data.board);
    clearWinningLine();
    confirmModal.classList.add('hidden');
    winnerModal.classList.add('hidden');
    iAmRequesterOfNewGame = false;
    // game-start event will re-enable the board
  });

  // Step 4b: Someone said NO
  socket.on('new-game-declined', (data) => {
    confirmModal.classList.add('hidden');
    iAmRequesterOfNewGame = false;
    showToast(data.message || 'The other player chose not to continue.', 'error');
    boardElement.classList.add('disabled');
    turnPillText && (turnPillText.textContent = '✦ Game Ended ✦');
  });

  // ── LEAVE ROOM ────────────────────────────────────────────────────────────────
  leaveRoomBtnNav && leaveRoomBtnNav.addEventListener('click', () => {
    if (confirm('Leave current room and return to lobby?')) window.location.reload();
  });

  leaveAfterGameBtn && leaveAfterGameBtn.addEventListener('click', () => {
    window.location.reload();
  });

  // Reset button on arena (before game over — just request)
  resetBtn && resetBtn.addEventListener('click', () => {
    if (!isGameActive) {
      // Game already over — trigger play again flow
      if (winnerModal) winnerModal.classList.remove('hidden');
      return;
    }
    showToast('You can only start a new game after the current one ends.', 'error');
  });

  resetScoreBtn && resetScoreBtn.addEventListener('click', () => {
    scoreX = 0; scoreO = 0;
    scorePlayerX && (scorePlayerX.textContent = 0);
    scorePlayerO && (scorePlayerO.textContent = 0);
    showToast('Scores reset!', 'info');
  });

  socket.on('player-disconnected', (data) => {
    showToast(data.message, 'error');
    isGameActive = false;
    boardElement.classList.add('disabled');
    turnPillText && (turnPillText.textContent = `${escapeHtml(data.username)} left.`);
    confirmModal.classList.add('hidden');
    iAmRequesterOfNewGame = false;
  });

  // ── HISTORY ───────────────────────────────────────────────────────────────────
  viewHistoryBtn && viewHistoryBtn.addEventListener('click', () => {
    historyModal.classList.remove('hidden');
    loadHistory();
  });

  closeHistoryBtn && closeHistoryBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
  });

  function loadHistory() {
    historyBody && (historyBody.innerHTML = `<div class="history-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading records...</div>`);
    
    // Request via socket (fastest, no CORS issues)
    socket.emit('get-history', { roomId: currentRoomId });

    // Also try REST as backup
    fetch('/api/history')
      .then(r => r.json())
      .then(d => { if (d.success && d.history && d.history.length > 0) renderHistoryCards(d.history); })
      .catch(() => {});
  }

  socket.on('history-data', (data) => {
    if (data && Array.isArray(data.history)) {
      renderHistoryCards(data.history);
    }
  });

  // Background push after DB save completes (non-blocking)
  socket.on('history-update', (data) => {
    if (data && Array.isArray(data.history)) {
      renderHistoryCards(data.history);
    }
  });

  function renderHistoryCards(records) {
    if (!historyBody) return;
    if (!records || records.length === 0) {
      historyBody.innerHTML = `<div class="history-empty"><i class="fa-solid fa-inbox" style="font-size:2rem;display:block;margin-bottom:8px;"></i>No matches recorded yet for this room.</div>`;
      return;
    }

    historyBody.innerHTML = records.map((rec, i) => {
      const dateStr = rec.playedAt ? new Date(rec.playedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const isX     = rec.winningSymbol === 'X';
      const isDraw  = rec.winningSymbol === 'Draw';
      const badgeCls = isDraw ? 'badge-draw' : isX ? 'badge-x' : 'badge-o';
      const winLabel = isDraw ? 'Draw' : rec.winner;

      return `
        <div class="history-record-card">
          <div class="history-record-num">#${i + 1}</div>
          <div class="history-record-info">
            <div class="history-record-room">${escapeHtml(rec.roomId || 'ROOM')}</div>
            <div class="history-record-players">
              <span class="text-x">X: ${escapeHtml(rec.playerX)}</span>
              &nbsp;&bull;&nbsp;
              <span class="text-o">O: ${escapeHtml(rec.playerO)}</span>
            </div>
            <div class="history-record-meta">${rec.totalMoves} moves &bull; ${dateStr}</div>
          </div>
          <div class="history-record-winner">
            <span class="history-winner-badge ${badgeCls}">${escapeHtml(winLabel)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── WINNING LINE CANVAS ───────────────────────────────────────────────────────
  function drawWinningLine(combo, symbol) {
    if (!canvas || !combo || combo.length !== 3) return;
    const ctx  = canvas.getContext('2d');
    const rect = boardElement.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;

    const a = cells[combo[0]].getBoundingClientRect();
    const c = cells[combo[2]].getBoundingClientRect();
    const x1 = a.left - rect.left + a.width  / 2;
    const y1 = a.top  - rect.top  + a.height / 2;
    const x2 = c.left - rect.left + c.width  / 2;
    const y2 = c.top  - rect.top  + c.height / 2;

    const isLight = htmlEl.getAttribute('data-theme') === 'light';
    const color   = symbol === 'X'
      ? (isLight ? '#FF6FA8' : '#FF72A6')
      : (isLight ? '#4D9CFF' : '#5AD1FF');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth   = 8;
    ctx.lineCap     = 'round';
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    ctx.stroke();
  }

  function clearWinningLine() {
    lastWinningCombo = null;
    lastWinnerSymbol = null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    cells.forEach(c => c.classList.remove('winning-cell'));
  }

  // ── CLIPBOARD ─────────────────────────────────────────────────────────────────
  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => showToast(`Copied: "${text}"`, 'success'))
      .catch(() => showToast(`Room Code: ${text}`, 'info'));
  }

  copyRoomBtn  && copyRoomBtn.addEventListener('click',  () => copyToClipboard(currentRoomId));
  shareCopyBtn && shareCopyBtn.addEventListener('click', () => copyToClipboard(currentRoomId));

  // ── BOARD & TURN UI ───────────────────────────────────────────────────────────
  function updateBoardUI(boardArray) {
    if (!boardArray) return;
    cells.forEach((cell, i) => {
      const val = boardArray[i];
      cell.classList.remove('x', 'o', 'winning-cell');
      cell.textContent = '';
      if (val === 'X') { cell.classList.add('x'); cell.textContent = 'X'; }
      else if (val === 'O') { cell.classList.add('o'); cell.textContent = 'O'; }
    });
  }

  function updateTurnUI() {
    cardPlayerX && cardPlayerX.classList.remove('active');
    cardPlayerO && cardPlayerO.classList.remove('active');

    if (!isGameActive) return;

    if (currentTurn === 'X') {
      cardPlayerX && cardPlayerX.classList.add('active');
      turnPill && (turnPill.className = 'turn-pill');
      if (turnPillText) {
        turnPillText.textContent = mySymbol === 'X'
          ? '✦ YOUR TURN (X) ✦'
          : `✦ ${playerXName || 'Player 1'}'S TURN (X) ✦`;
      }
      if (footerMoveText) {
        footerMoveText.textContent = mySymbol === 'X'
          ? '✦ Make your move! ✦'
          : `✦ Waiting for ${playerXName || 'Player 1'}... ✦`;
      }
    } else {
      cardPlayerO && cardPlayerO.classList.add('active');
      turnPill && (turnPill.className = 'turn-pill turn-o');
      if (turnPillText) {
        turnPillText.textContent = mySymbol === 'O'
          ? '✦ YOUR TURN (O) ✦'
          : `✦ ${playerOName || 'Player 2'}'S TURN (O) ✦`;
      }
      if (footerMoveText) {
        footerMoveText.textContent = mySymbol === 'O'
          ? '✦ Make your move! ✦'
          : `✦ Waiting for ${playerOName || 'Player 2'}... ✦`;
      }
    }
  }

  // ── UTILS ─────────────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }
});
