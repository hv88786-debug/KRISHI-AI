const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { analyzeImage, getScanHistory, getScan } = require('../controllers/diseaseController');
const { protect } = require('../middleware/auth');

// Multer config — save to /uploads with original name + timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

router.post('/analyze',  protect, upload.single('image'), analyzeImage);
router.get('/history',   protect, getScanHistory);
router.get('/:id',       protect, getScan);

module.exports = router;
