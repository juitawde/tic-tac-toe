/**
 * Input Validation Middleware for User Login and Moves
 */

function validateLoginInput(req, res, next) {
  const username = req.body && req.body.username ? req.body.username.trim() : '';
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }
  req.cleanUsername = username;
  next();
}

function validateUsernameString(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username must be a non-empty string.' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return { valid: false, message: 'Username must be at least 2 characters long.' };
  }
  if (trimmed.length > 15) {
    return { valid: false, message: 'Username cannot exceed 15 characters.' };
  }
  return { valid: true, username: trimmed };
}

module.exports = {
  validateLoginInput,
  validateUsernameString
};
