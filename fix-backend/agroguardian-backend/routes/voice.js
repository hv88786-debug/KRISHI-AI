const express = require('express');
const router = express.Router();
const { handleVoiceWebhook, handleTextQuery, getLanguages } = require('../controllers/voiceController');

router.post('/webhook',  handleVoiceWebhook);  // IVR provider posts here
router.post('/query',    handleTextQuery);      // text/chatbot query
router.get('/languages', getLanguages);

module.exports = router;
