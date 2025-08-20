const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET /api/complaints
// @desc    Get all complaints
// @access  Private
router.get('/', auth, async (req, res) => {
  res.json({
    message: 'Complaints endpoint - Coming soon',
    data: []
  });
});

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private
router.post('/', auth, async (req, res) => {
  res.json({
    message: 'Create complaint endpoint - Coming soon'
  });
});

module.exports = router;
