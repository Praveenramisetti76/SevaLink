const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   POST /api/chatbot/message
// @desc    Process chatbot message
// @access  Private
router.post('/message', auth, async (req, res) => {
  res.json({
    message: 'Chatbot message endpoint - Coming soon',
    response: 'Hello! I am your SevaLink assistant. I am currently in development mode.'
  });
});

// @route   POST /api/chatbot/voice
// @desc    Process voice input
// @access  Private
router.post('/voice', auth, async (req, res) => {
  res.json({
    message: 'Chatbot voice endpoint - Coming soon'
  });
});

module.exports = router;
