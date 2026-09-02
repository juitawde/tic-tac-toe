const express = require('express');
const router = express.Router();
const { getGameHistory } = require('../controllers/historyController');

/**
 * @route   GET /api/history
 * @desc    Fetch list of stored game match history records
 * @access  Public
 */
router.get('/', getGameHistory);

module.exports = router;
