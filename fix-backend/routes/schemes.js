const express = require('express');
const router = express.Router();
const { checkEligibility, getAllSchemes, submitApplication, getMyApplications } = require('../controllers/schemesController');
const { protect } = require('../middleware/auth');

router.get('/',            getAllSchemes);
router.post('/check',      checkEligibility);        // public — no auth needed
router.post('/apply',      protect, submitApplication);
router.get('/my',          protect, getMyApplications);

module.exports = router;
