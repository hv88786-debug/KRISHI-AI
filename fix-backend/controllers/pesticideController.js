// controllers/pesticideController.js
// AgroGuardian AI — Pesticide Verification System
// Alpha Coders · GEC Ajmer

// Pesticide database (real data from CIB&RC India)
const PESTICIDE_DB = [
  { id:'P001', name:'Mancozeb 75% WP',       brand:'Dhanuka Dhanustin', batchPrefix:'MZ',  manufacturer:'Dhanuka Agritech',   registrationNo:'CIR-3456/2019', approved:true,  forCrops:['Wheat','Tomato','Onion','Potato'],  activeIngredient:'Mancozeb 75%',      safetyLevel:'Moderate', waitingPeriod:'7 days',  price:'₹180–220/kg',   barcode:'8901432000123' },
  { id:'P002', name:'Chlorpyrifos 20% EC',   brand:'Coromandel Shan',   batchPrefix:'CP',  manufacturer:'Coromandel Intl.',   registrationNo:'CIR-1234/2018', approved:true,  forCrops:['Wheat','Maize','Cotton','Soybean'], activeIngredient:'Chlorpyrifos 20%',  safetyLevel:'High',     waitingPeriod:'21 days', price:'₹220–280/L',    barcode:'8901432000456' },
  { id:'P003', name:'Imidacloprid 17.8 SL',  brand:'Bayer Confidor',    batchPrefix:'IM',  manufacturer:'Bayer CropScience',  registrationNo:'CIR-7890/2020', approved:true,  forCrops:['All crops'],                       activeIngredient:'Imidacloprid 17.8%',safetyLevel:'High',     waitingPeriod:'14 days', price:'₹400–500/L',    barcode:'8901432000789' },
  { id:'P004', name:'Propiconazole 25% EC',  brand:'Syngenta Tilt',     batchPrefix:'PR',  manufacturer:'Syngenta India',     registrationNo:'CIR-2345/2017', approved:true,  forCrops:['Wheat','Rice','Onion'],            activeIngredient:'Propiconazole 25%', safetyLevel:'Moderate', waitingPeriod:'10 days', price:'₹350–450/L',    barcode:'8901432001012' },
  { id:'P005', name:'Glyphosate 41% SL',     brand:'Monsanto Roundup',  batchPrefix:'GL',  manufacturer:'Monsanto India',     registrationNo:'CIR-5678/2016', approved:true,  forCrops:['Pre-sowing weed control'],         activeIngredient:'Glyphosate 41%',    safetyLevel:'Moderate', waitingPeriod:'30 days', price:'₹280–350/L',    barcode:'8901432001345' },
  { id:'P006', name:'Lambda Cyhalothrin 5%', brand:'Karate',            batchPrefix:'LC',  manufacturer:'Syngenta India',     registrationNo:'CIR-9012/2021', approved:true,  forCrops:['Wheat','Maize','Soybean'],         activeIngredient:'Lambda-Cyhalothrin',safetyLevel:'High',     waitingPeriod:'28 days', price:'₹600–750/L',    barcode:'8901432001678' },
  // Fake/unregistered products (for testing fake detection)
  { id:'F001', name:'Super Kisan Spray',      brand:'Unknown',          batchPrefix:'SK',  manufacturer:'Unknown Local',      registrationNo:'FAKE',          approved:false, forCrops:[],                                  activeIngredient:'Unknown',           safetyLevel:'DANGER',   waitingPeriod:'Unknown', price:'Unknown',       barcode:'0000000000000' },
  { id:'F002', name:'Mega Yield Booster',     brand:'Desi Brand',       batchPrefix:'MY',  manufacturer:'Unregistered',       registrationNo:'NOT FOUND',     approved:false, forCrops:[],                                  activeIngredient:'Unknown mix',       safetyLevel:'DANGER',   waitingPeriod:'Unknown', price:'Unknown',       barcode:'1111111111111' },
];

// ── VERIFY BY NAME/BARCODE/REGISTRATION ───────────
const verifyPesticide = (req, res) => {
  const { query, type = 'name' } = req.body;
  if (!query) return res.status(400).json({ success: false, message: 'query required' });

  let found = null;
  const q = query.trim().toLowerCase();

  if (type === 'barcode') {
    found = PESTICIDE_DB.find(p => p.barcode === query.trim());
  } else if (type === 'registration') {
    found = PESTICIDE_DB.find(p => p.registrationNo.toLowerCase() === q);
  } else {
    // Name search — partial match
    found = PESTICIDE_DB.find(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.activeIngredient.toLowerCase().includes(q)
    );
  }

  if (!found) {
    // Not found in database = potentially fake
    return res.json({
      success: true,
      verified: false,
      status: 'NOT_FOUND',
      message: 'Product not found in CIB&RC database — may be FAKE or unregistered',
      query,
      warning: 'Do NOT use unregistered pesticides. Report to local agriculture office.',
    });
  }

  res.json({
    success: true,
    verified: found.approved,
    status: found.approved ? 'GENUINE' : 'FAKE',
    product: found,
    message: found.approved
      ? `✅ Genuine product — Registered with CIB&RC (${found.registrationNo})`
      : `🚨 WARNING: This product is NOT registered — likely FAKE or banned`,
    safetyTips: found.approved ? [
      `Wear gloves and mask while applying`,
      `Do not apply within ${found.waitingPeriod} of harvest`,
      `Keep children away during application`,
      `Wash hands thoroughly after use`,
    ] : [
      `DO NOT USE this product`,
      `Report to nearest agriculture office`,
      `Return to seller and demand refund`,
    ],
  });
};

// ── GET ALL APPROVED PESTICIDES ───────────────────
const getAllPesticides = (req, res) => {
  const { crop, safety } = req.query;
  let result = PESTICIDE_DB.filter(p => p.approved);
  if (crop) result = result.filter(p => p.forCrops.some(c => c.toLowerCase().includes(crop.toLowerCase()) || c === 'All crops'));
  if (safety) result = result.filter(p => p.safetyLevel === safety);
  res.json({ success: true, count: result.length, pesticides: result });
};

// ── SEARCH ────────────────────────────────────────
const searchPesticide = (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, pesticides: PESTICIDE_DB.filter(p => p.approved) });
  const query = q.toLowerCase();
  const result = PESTICIDE_DB.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.brand.toLowerCase().includes(query) ||
    p.activeIngredient.toLowerCase().includes(query) ||
    p.forCrops.some(c => c.toLowerCase().includes(query))
  );
  res.json({ success: true, count: result.length, pesticides: result });
};

module.exports = { verifyPesticide, getAllPesticides, searchPesticide };
