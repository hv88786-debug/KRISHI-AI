const express = require('express');
const router  = express.Router();
const { verifyPesticide, getAllPesticides, searchPesticide } = require('../controllers/pesticideController');

// POST /api/pesticide/verify  { query: "Mancozeb", type: "name"|"barcode"|"registration" }
router.post('/verify',   verifyPesticide);
// GET  /api/pesticide?crop=Wheat&safety=Moderate
router.get('/',          getAllPesticides);
// GET  /api/pesticide/search?q=mancozeb
router.get('/search',    searchPesticide);

module.exports = router;
