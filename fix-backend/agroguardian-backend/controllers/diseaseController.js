const DiseaseDetection = require('../models/DiseaseDetection');
const path = require('path');

// Disease knowledge base (replace with real ML model API call)
const DISEASE_DB = {
  'leaf_spot':    { disease: 'Leaf Spot',     severity: 'moderate', treatment: 'Apply Mancozeb 75% WP @ 2g/L water. Spray in evening. Repeat after 7 days.', pesticide: 'Mancozeb 75% WP', dosage: '2g per litre water' },
  'rust':         { disease: 'Wheat Rust',    severity: 'severe',   treatment: 'Apply Propiconazole 25 EC @ 1ml/L. Remove infected leaves. Avoid overhead irrigation.', pesticide: 'Propiconazole 25 EC', dosage: '1ml per litre water' },
  'blight':       { disease: 'Early Blight',  severity: 'moderate', treatment: 'Apply Chlorothalonil 75 WP @ 2g/L. Improve drainage and reduce leaf wetness.', pesticide: 'Chlorothalonil 75 WP', dosage: '2g per litre water' },
  'mosaic':       { disease: 'Mosaic Virus',  severity: 'severe',   treatment: 'No direct cure. Remove infected plants. Control aphid vectors with Imidacloprid 17.8 SL @ 0.5ml/L.', pesticide: 'Imidacloprid 17.8 SL', dosage: '0.5ml per litre water' },
  'powdery':      { disease: 'Powdery Mildew',severity: 'mild',     treatment: 'Apply Sulfur 80 WP @ 3g/L or Hexaconazole 5 EC @ 1ml/L. Spray during early morning.', pesticide: 'Sulfur 80 WP', dosage: '3g per litre water' },
  'healthy':      { disease: null,            severity: 'none',     treatment: 'Crop is healthy. Continue regular monitoring.', pesticide: null, dosage: null },
};

// Mock AI prediction (in production — call Python Flask ML model)
const mockPredict = (filename) => {
  const diseases = Object.keys(DISEASE_DB);
  // In real system: POST image to Python model → get result
  // For demo: pseudo-random based on filename hash
  const idx = filename.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % diseases.length;
  const key = diseases[idx];
  return { key, confidence: Math.floor(75 + Math.random() * 23) };
};

// ─── UPLOAD & ANALYZE IMAGE ───────────────────
const analyzeImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Image file required' });

    const { cropType } = req.body;
    const imagePath = req.file.path;
    const filename = req.file.filename;

    // Call AI Model (mock here — swap with real API call below)
    /*
    // Real call to Python model:
    const FormData = require('form-data');
    const fs = require('fs');
    const axios = require('axios');
    const form = new FormData();
    form.append('image', fs.createReadStream(imagePath));
    const aiRes = await axios.post(process.env.AI_MODEL_URL, form, { headers: form.getHeaders() });
    const { key, confidence } = aiRes.data;
    */
    const { key, confidence } = mockPredict(filename);
    const result = DISEASE_DB[key];
    const detected = key !== 'healthy';

    const record = await DiseaseDetection.create({
      farmerId: req.user?._id,
      imagePath,
      cropType,
      detected,
      disease: result.disease,
      confidence,
      severity: result.severity,
      treatment: result.treatment,
      pesticide: result.pesticide,
      dosage: result.dosage,
      status: 'processed',
    });

    res.status(201).json({
      success: true,
      result: {
        id: record._id,
        detected,
        disease: result.disease,
        confidence,
        severity: result.severity,
        treatment: result.treatment,
        pesticide: result.pesticide,
        dosage: result.dosage,
        scanTime: new Date().toISOString(),
        cropType,
      }
    });
  } catch (err) { next(err); }
};

// ─── GET SCAN HISTORY ─────────────────────────
const getScanHistory = async (req, res, next) => {
  try {
    const scans = await DiseaseDetection.find({ farmerId: req.user._id })
      .sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, count: scans.length, scans });
  } catch (err) { next(err); }
};

// ─── GET SINGLE SCAN ──────────────────────────
const getScan = async (req, res, next) => {
  try {
    const scan = await DiseaseDetection.findById(req.params.id);
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    res.json({ success: true, scan });
  } catch (err) { next(err); }
};

module.exports = { analyzeImage, getScanHistory, getScan };
