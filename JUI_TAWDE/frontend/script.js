// ============================================================
// Tic-Tac-Toe Client Script - Clean Mockup Match Engine
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // 1. Theme Engine Setup (Light vs Dark Mode)
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const htmlElement = document.documentElement;

  const savedTheme = localStorage.getItem('ttt_theme') || 'light';
  htmlElement.setAttribute('data-theme', savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
      htmlElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('ttt_theme', nextTheme);
      showToast(`Switched to ${nextTheme === 'light' ? 'Light ☀️' : 'Dark 🌙'} Mode`, 'info');
      
      if (lastWinningCombo) drawWinningLine(lastWinningCombo, lastWinnerSymbol);
    });
  }

  // 2. Socket.io Client Initialization
  const SERVER_URL = (window.location.protocol === 'file:' || !window.location.host)
    ? 'http://localhost:5000'
    : window.location.origin;

  let socket;
  try {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });
  } catch (err) {
    console.error('Socket init error:', err);
  }

  // Client Room & Match State
  let currentRoomId = null;
  let mySymbol = null;
  let myUsername = null;
  let currentTurn = 'X';
  let isGameActive = false;
  let playerXName = null;
  let playerOName = null;
  let scoreX = 0;
  let scoreO = 0;
  let lastWinningCombo = null;
  let lastWinnerSymbol = null;

  // DOM Elements - Header & Connection
  const connectionPill = document.getElementById('connection-pill');
  const connectionText = document.getElementById('connection-text');
  const roomCodeBadge = document.getElementById('room-code-badge');
  const displayRoomId = document.getElementById('display-room-id');
  const copyRoomBtn = document.getElementById('copy-room-btn');
  const leaveRoomBtnNav = document.getElementById('leave-room-btn-nav');

  // DOM Elements - Modals & Tabs
  const lobbyModal = document.getElementById('lobby-modal');
  const waitingModal = document.getElementById('waiting-modal');
  const shareRoomCode = document.getElementById('share-room-code');
  const shareCopyBtn = document.getElementById('share-copy-btn');

  const tabBtnCreate = document.getElementById('tab-btn-create');
  const tabBtnJoin = document.getElementById('tab-btn-join');
  const createRoomForm = document.getElementById('create-room-form');
  const joinRoomForm = document.getElementById('join-room-form');

  const createUsernameInput = document.getElementById('create-username-input');
  const joinUsernameInput = document.getElementById('join-username-input');
  const joinRoomidInput = document.getElementById('join-roomid-input');

  // DOM Elements - Turn Pill & Status
  const turnPill = document.getElementById('turn-pill');
  const turnPillText = document.getElementById('turn-pill-text');
  const footerMoveText = document.getElementById('footer-move-text');

  // DOM Elements - Scoreboard & Cards
  const cardPlayerX = document.getElementById('card-player-x');
  const cardPlayerO = document.getElementById('card-player-o');
  const namePlayerX = document.getElementById('name-player-x');
  const namePlayerO = document.getElementById('name-player-o');
  const scorePlayerX = document.getElementById('score-player-x');
  const scorePlayerO = document.getElementById('score-player-o');

  // DOM Elements - Board Grid & Canvas Line
  const boardElement = document.getElementById('board');
  const cells = document.querySelectorAll('.cell');
  const canvas = document.getElementById('winning-line-canvas');

  // DOM Elements - Actions & History
  const resetBtn = document.getElementById('reset-btn');
  const resetScoreBtn = document.getElementById('reset-score-btn');
  const viewHistoryBtn = document.getElementById('view-history-btn');
  const historyModal = document.getElementById('history-modal');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const historyTableBody = document.getElementById('history-table-body');

  const winnerModal = document.getElementById('winner-modal');
  const winnerBannerPill = document.getElementById('winner-banner-pill');
  const winnerTitle = document.getElementById('winner-title');
  const winnerSubtitle = document.getElementById('winner-subtitle');
  const summaryMoves = document.getElementById('summary-moves');
  const summarySymbol = document.getElementById('summary-symbol');
  const playAgainBtn = document.getElementById('play-again-btn');
  const toastContainer = document.getElementById('toast-container');

  // Helper: Toast Notifications
  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-circle-info';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    if (type === 'success') iconClass = 'fa-circle-check';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // 3. Tab Switching (Create vs Join Room)
  if (tabBtnCreate && tabBtnJoin) {
    tabBtnCreate.addEventListener('click', () => {
      tabBtnCreate.classList.add('active');
      tabBtnJoin.classList.remove('active');
      createRoomForm.classList.remove('hidden-tab-content');
      createRoomForm.classList.add('active-tab-content');
      joinRoomForm.classList.remove('active-tab-content');
      joinRoomForm.classList.add('hidden-tab-content');
    });

    tabBtnJoin.addEventListener('click', () => {
      tabBtnJoin.classList.add('active');
      tabBtnCreate.classList.remove('active');
      joinRoomForm.classList.remove('hidden-tab-content');
      joinRoomForm.classList.add('active-tab-content');
      createRoomForm.classList.remove('active-tab-content');
      createRoomForm.classList.add('hidden-tab-content');
    });
  }

  // 4. Socket Connection Handlers
  if (socket) {
    socket.on('connect', () => {
      console.log('✅ Socket connected live [ID:', socket.id, ']');
      if (connectionPill) connectionPill.className = 'status-pill connected';
      if (connectionText) connectionText.textContent = 'Connected';
    });

    socket.on('disconnect', () => {
      console.warn('❌ Socket disconnected');
      if (connectionPill) connectionPill.className = 'status-pill disconnected';
      if (connectionText) connectionText.textContent = 'Disconnected';
      showToast('Disconnected from server.', 'error');
    });

    // Create Room Submit
    if (createRoomForm) {
      createRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = createUsernameInput.value.trim();
        if (!username) return;

        socket.emit('create-room', { username });
      });
    }

    // Join Room Submit
    if (joinRoomForm) {
      joinRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = joinUsernameInput.value.trim();
        const roomId = joinRoomidInput.value.trim().toUpperCase();

        if (!username || !roomId) return;

        socket.emit('join-room', { username, roomId });
      });
    }

    // Socket Handler: room-created
    socket.on('room-created', (data) => {
      currentRoomId = data.roomId;
      mySymbol = data.symbol;
      myUsername = data.username;

      lobbyModal.classList.add('hidden');
      waitingModal.classList.remove('hidden');

      shareRoomCode.textContent = currentRoomId;
      displayRoomId.textContent = currentRoomId;
      roomCodeBadge.classList.remove('hidden');
      if (leaveRoomBtnNav) leaveRoomBtnNav.classList.remove('hidden');

      showToast(`Room ${currentRoomId} created! Share code with Player 2.`, 'success');
    });

    // Socket Handler: room-joined
    socket.on('room-joined', (data) => {
      currentRoomId = data.roomId;
      mySymbol = data.symbol;
      myUsername = data.username;

      lobbyModal.classList.add('hidden');
      waitingModal.classList.add('hidden');

      displayRoomId.textContent = currentRoomId;
      roomCodeBadge.classList.remove('hidden');
      if (leaveRoomBtnNav) leaveRoomBtnNav.classList.remove('hidden');

      showToast(`Joined Room ${currentRoomId}!`, 'success');
    });

    // Socket Handler: room-error
    socket.on('room-error', (data) => {
      showToast(data.message || 'Room error occurred.', 'error');
    });

    // Socket Handler: players-update
    socket.on('players-update', (data) => {
      playerXName = data.playerX;
      playerOName = data.playerO;

      if (namePlayerX) namePlayerX.textContent = playerXName || 'Waiting...';
      if (namePlayerO) namePlayerO.textContent = playerOName || 'Waiting...';

      updateTurnCardHighlight();
    });

    // Socket Handler: game-start
    socket.on('game-start', (data) => {
      isGameActive = true;
      currentTurn = data.currentTurn;
      clearWinningLine();

      waitingModal.classList.add('hidden');
      lobbyModal.classList.add('hidden');
      boardElement.classList.remove('disabled');

      updateBoardUI(data.board);
      updateTurnCardHighlight();

      showToast('Game Started! Have fun.', 'info');
    });

    // Cell Clicks
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        if (!isGameActive) {
          showToast('Waiting for game to start.', 'error');
          return;
        }

        if (currentTurn !== mySymbol) {
          showToast(`It is currently Player ${currentTurn}'s turn.`, 'error');
          return;
        }

        const index = parseInt(cell.getAttribute('data-index'));
        if (cell.classList.contains('x') || cell.classList.contains('o')) {
          showToast('Cell is already occupied!', 'error');
          return;
        }

        socket.emit('make-move', { index, symbol: mySymbol, roomId: currentRoomId });
      });
    });

    // Socket Handler: move-made
    socket.on('move-made', (data) => {
      updateBoardUI(data.board);

      if (data.nextTurn) {
        currentTurn = data.nextTurn;
        updateTurnCardHighlight();
      }
    });

    // Socket Handler: move-error
    socket.on('move-error', (data) => {
      showToast(data.message || 'Invalid move.', 'error');
    });

    // Socket Handler: game-over
    socket.on('game-over', (data) => {
      isGameActive = false;
      boardElement.classList.add('disabled');

      lastWinningCombo = data.combo;
      lastWinnerSymbol = data.winningSymbol;

      if (data.combo) {
        data.combo.forEach(idx => {
          const cell = document.querySelector(`.cell[data-index="${idx}"]`);
          if (cell) cell.classList.add('winning-cell');
        });
        drawWinningLine(data.combo, data.winningSymbol);
      }

      if (data.winningSymbol === 'Draw') {
        winnerBannerPill.textContent = "IT'S A DRAW!";
        winnerTitle.textContent = "It's a Draw!";
        winnerSubtitle.textContent = 'Great match by both players!';
        summarySymbol.textContent = 'Draw';
        summarySymbol.className = 'value text-purple';
        if (turnPillText) turnPillText.textContent = "✦ IT'S A DRAW! ✦";
        if (footerMoveText) footerMoveText.textContent = "✦ Match Draw! ✦";
      } else {
        const isMe = data.winner === myUsername;
        winnerBannerPill.textContent = `🎉 ${data.winner.toUpperCase()} WINS!`;
        winnerTitle.textContent = `🎉 ${data.winner} Wins!`;
        winnerSubtitle.textContent = isMe ? 'Awesome victory!' : 'Better luck next match!';
        summarySymbol.textContent = data.winningSymbol;
        summarySymbol.className = data.winningSymbol === 'X' ? 'value text-x' : 'value text-o';

        if (turnPillText) turnPillText.textContent = `🎉 ${data.winner.toUpperCase()} WINS! 🎉`;
        if (footerMoveText) footerMoveText.textContent = `✦ ${data.winner} won the game! ✦`;

        if (data.winningSymbol === 'X') {
          scoreX += 1;
          if (scorePlayerX) scorePlayerX.textContent = scoreX;
        } else if (data.winningSymbol === 'O') {
          scoreO += 1;
          if (scorePlayerO) scorePlayerO.textContent = scoreO;
        }

        if (typeof confetti === 'function') {
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      }

      summaryMoves.textContent = data.totalMoves;
      winnerModal.classList.remove('hidden');

      if (data.history) {
        renderHistoryTable(data.history);
      }
    });

    // Socket Handler: game-reset
    socket.on('game-reset', (data) => {
      updateBoardUI(data.board);
      clearWinningLine();
      winnerModal.classList.add('hidden');
      isGameActive = true;
      showToast('New game started!', 'info');
    });

    // Socket Handler: player-disconnected
    socket.on('player-disconnected', (data) => {
      showToast(data.message, 'error');
      isGameActive = false;
      boardElement.classList.add('disabled');
      if (turnPillText) turnPillText.textContent = `${data.username} left the game.`;
    });

    // Action Buttons
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        socket.emit('reset-game', { roomId: currentRoomId });
      });
    }

    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        socket.emit('reset-game', { roomId: currentRoomId });
      });
    }

    if (resetScoreBtn) {
      resetScoreBtn.addEventListener('click', () => {
        scoreX = 0;
        scoreO = 0;
        if (scorePlayerX) scorePlayerX.textContent = 0;
        if (scorePlayerO) scorePlayerO.textContent = 0;
        showToast('Scores reset to 0!', 'info');
      });
    }

    if (leaveRoomBtnNav) {
      leaveRoomBtnNav.addEventListener('click', () => {
        if (confirm('Leave current room?')) {
          window.location.reload();
        }
      });
    }
  }

  // 5. Winning Strike Line Canvas Renderer
  function drawWinningLine(combo, symbol) {
    if (!canvas || !combo || combo.length !== 3) return;
    const ctx = canvas.getContext('2d');
    const boardRect = boardElement.getBoundingClientRect();
    
    canvas.width = boardRect.width;
    canvas.height = boardRect.height;

    const cellA = cells[combo[0]].getBoundingClientRect();
    const cellC = cells[combo[2]].getBoundingClientRect();

    const startX = cellA.left - boardRect.left + cellA.width / 2;
    const startY = cellA.top - boardRect.top + cellA.height / 2;
    const endX = cellC.left - boardRect.left + cellC.width / 2;
    const endY = cellC.top - boardRect.top + cellC.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    const isLight = htmlElement.getAttribute('data-theme') === 'light';
    const strokeColor = symbol === 'X'
      ? (isLight ? '#FF6FA8' : '#FF72A6')
      : (isLight ? '#4D9CFF' : '#5AD1FF');

    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
  }

  function clearWinningLine() {
    lastWinningCombo = null;
    lastWinnerSymbol = null;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // 6. Copy Room Code Clipboard Helper
  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied Room Code "${text}"!`, 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      showToast(`Room Code: ${text}`, 'info');
    });
  }

  if (copyRoomBtn) copyRoomBtn.addEventListener('click', () => copyToClipboard(currentRoomId));
  if (shareCopyBtn) shareCopyBtn.addEventListener('click', () => copyToClipboard(currentRoomId));

  // 7. Board UI Helper & Turn Pill Updating
  function updateBoardUI(boardArray) {
    if (!boardArray) return;
    cells.forEach((cell, index) => {
      const val = boardArray[index];
      cell.classList.remove('x', 'o', 'winning-cell');
      cell.textContent = '';

      if (val === 'X') {
        cell.classList.add('x');
        cell.textContent = 'X';
      } else if (val === 'O') {
        cell.classList.add('o');
        cell.textContent = 'O';
      }
    });
  }

  function updateTurnCardHighlight() {
    if (cardPlayerX) cardPlayerX.classList.remove('active');
    if (cardPlayerO) cardPlayerO.classList.remove('active');

    if (isGameActive) {
      if (currentTurn === 'X') {
        if (cardPlayerX) cardPlayerX.classList.add('active');
        if (turnPill) turnPill.className = 'turn-pill';
        if (turnPillText) {
          turnPillText.textContent = (mySymbol === 'X') ? "✦ YOUR TURN (X) ✦" : `✦ ${playerXName || 'PLAYER 1'}'S TURN (X) ✦`;
        }
        if (footerMoveText) {
          footerMoveText.textContent = (mySymbol === 'X') ? "✦ Make your move! ✦" : `✦ Waiting for ${playerXName || 'Player 1'}... ✦`;
        }
      } else {
        if (cardPlayerO) cardPlayerO.classList.add('active');
        if (turnPill) turnPill.className = 'turn-pill turn-o';
        if (turnPillText) {
          turnPillText.textContent = (mySymbol === 'O') ? "✦ YOUR TURN (O) ✦" : `✦ ${playerOName || 'PLAYER 2'}'S TURN (O) ✦`;
        }
        if (footerMoveText) {
          footerMoveText.textContent = (mySymbol === 'O') ? "✦ Make your move! ✦" : `✦ Waiting for ${playerOName || 'Player 2'}... ✦`;
        }
      }
    }
  }

  // 8. History Drawer Fetching
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener('click', () => {
      if (historyModal) historyModal.classList.remove('hidden');
      fetchGameHistory();
    });
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => {
      if (historyModal) historyModal.classList.add('hidden');
    });
  }

  function fetchGameHistory() {
    if (socket && currentRoomId) {
      socket.emit('get-history', { roomId: currentRoomId });
    }
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.history) {
          renderHistoryTable(data.history);
        }
      })
      .catch(err => console.warn('REST History fetch notice:', err.message));
  }

  if (socket) {
    socket.on('history-data', (data) => {
      if (data && data.history) {
        renderHistoryTable(data.history);
      }
    });
  }

  function renderHistoryTable(records) {
    if (!historyTableBody) return;
    if (!records || records.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No match records stored yet.</td></tr>`;
      return;
    }

    historyTableBody.innerHTML = records.map((rec, i) => {
      const dateStr = rec.playedAt ? new Date(rec.playedAt).toLocaleString() : 'N/A';
      const winnerBadgeClass = rec.winningSymbol === 'X' ? 'text-x' : rec.winningSymbol === 'O' ? 'text-o' : 'text-purple';
      
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong style="color: var(--primary-purple);">${escapeHtml(rec.roomId || 'ROOM')}</strong></td>
          <td><strong>${escapeHtml(rec.playerX)}</strong> (X)</td>
          <td><strong>${escapeHtml(rec.playerO)}</strong> (O)</td>
          <td><span class="${winnerBadgeClass}"><strong>${escapeHtml(rec.winner)}</strong></span></td>
          <td>${rec.totalMoves}</td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${dateStr}</td>
        </tr>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, match => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
    });
  }

});
