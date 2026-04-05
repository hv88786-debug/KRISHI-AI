const express = require('express');
const router = express.Router();
const { getAllPrices, getBestMandi, getPriceForecast, upsertPrice, getCategorySummary } = require('../controllers/marketController');
const { protect } = require('../middleware/auth');

router.get('/',                    getAllPrices);
router.get('/summary',             getCategorySummary);
router.get('/best/:crop',          getBestMandi);
router.get('/forecast/:crop',      getPriceForecast);
router.post('/update',             protect, upsertPrice); // admin only ideally

module.exports = router;
