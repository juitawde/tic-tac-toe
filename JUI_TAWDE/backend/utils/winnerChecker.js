/**
 * Tic Tac Toe Winner Checker Utility
 */

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

/**
 * Evaluates board state for win or draw
 * @param {Array} board 9-element array
 * @returns {Object|null} { winnerSymbol, combo } or null
 */
function checkWinner(board) {
  for (let combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winnerSymbol: board[a], combo };
    }
  }

  const isFull = board.every(cell => cell !== null && cell !== '');
  if (isFull) {
    return { winnerSymbol: 'Draw', combo: null };
  }

  return null;
}

module.exports = {
  WINNING_COMBINATIONS,
  checkWinner
};
