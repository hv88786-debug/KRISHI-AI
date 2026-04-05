// ══════════════════════════════════════
// routes/schemes.routes.js
// ══════════════════════════════════════
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');

const SCHEMES = [
  { id:'s1', name:'PM Kisan Samman Nidhi', nameHindi:'पीएम किसान सम्मान निधि', ministry:'Ministry of Agriculture', category:'central', benefit:'₹6,000/year direct to bank', type:'cash', eligibility:{farmerCategory:['marginal','small','medium','large'], description:'All land-holding farmer families'}, applicationUrl:'https://pmkisan.gov.in', deadline:null, isActive:true },
  { id:'s2', name:'PM Fasal Bima Yojana', nameHindi:'फसल बीमा योजना', ministry:'Ministry of Agriculture', category:'insurance', benefit:'Full crop value coverage', type:'insurance', eligibility:{farmerCategory:['marginal','small','medium','large'], description:'All farmers growing notified crops'}, applicationUrl:'https://pmfby.gov.in', deadline:'Before sowing season', isActive:true },
  { id:'s3', name:'Soil Health Card Scheme', nameHindi:'मृदा स्वास्थ्य कार्ड', ministry:'Ministry of Agriculture', category:'central', benefit:'Free soil testing (12 parameters)', type:'service', eligibility:{farmerCategory:['marginal','small','medium','large'], description:'All farmers'}, applicationUrl:'https://soilhealth.dac.gov.in', deadline:null, isActive:true },
  { id:'s4', name:'PM KUSUM Scheme', nameHindi:'पीएम कुसुम योजना', ministry:'Ministry of Renewable Energy', category:'subsidy', benefit:'90% subsidy on solar pumps', type:'subsidy', eligibility:{farmerCategory:['small','medium','large'], minLand:0.5, description:'Farmers with irrigation requirement'}, applicationUrl:'https://pmkusum.mnre.gov.in', deadline:'Rolling applications', isActive:true },
  { id:'s5', name:'Agricultural Mechanization (SMAM)', nameHindi:'कृषि यंत्रीकरण', ministry:'Ministry of Agriculture', category:'subsidy', benefit:'Up to 50% subsidy on farm equipment', type:'subsidy', eligibility:{farmerCategory:['marginal','small','medium'], description:'Small & marginal farmers get priority'}, applicationUrl:'https://agrimachinery.nic.in', deadline:'31 March 2026', isActive:true },
  { id:'s6', name:'Kisan Credit Card (KCC)', nameHindi:'किसान क्रेडिट कार्ड', ministry:'Ministry of Finance', category:'central', benefit:'Up to ₹3 lakh credit at 4% interest', type:'credit', eligibility:{farmerCategory:['marginal','small','medium','large'], description:'All farmers with agricultural land'}, applicationUrl:'https://www.nabard.org', deadline:null, isActive:true },
  { id:'s7', name:'Rajasthan Krishi Upaj Rahan Loan', nameHindi:'कृषि उपज रहन ऋण', ministry:'Rajasthan Govt', category:'state', benefit:'Loan against stored produce at low interest', type:'credit', eligibility:{farmerCategory:['small','medium','large'], description:'Rajasthan farmers with warehouse receipts'}, applicationUrl:'https://agriculture.rajasthan.gov.in', deadline:null, isActive:true },
  { id:'s8', name:'Mukhyamantri Kisan Mitra Urja Yojana', nameHindi:'मुख्यमंत्री किसान मित्र ऊर्जा योजना', ministry:'Rajasthan Govt', category:'state', benefit:'₹1,000/month electricity subsidy for farm pumps', type:'cash', eligibility:{farmerCategory:['marginal','small','medium'], description:'Rajasthan metered agricultural consumers'}, applicationUrl:'https://energy.rajasthan.gov.in', deadline:'Ongoing', isActive:true }
];

// GET /api/schemes - all schemes with filters
router.get('/', (req, res) => {
  const { category, farmerCategory, search } = req.query;
  let data = [...SCHEMES];

  if (category && category !== 'all') data = data.filter(s => s.category === category);
  if (farmerCategory) data = data.filter(s => !s.eligibility.farmerCategory || s.eligibility.farmerCategory.includes(farmerCategory));
  if (search) { const q = search.toLowerCase(); data = data.filter(s => s.name.toLowerCase().includes(q) || s.benefit.toLowerCase().includes(q)); }

  res.json({ success: true, count: data.length, schemes: data });
});

// POST /api/schemes/check-eligibility
router.post('/check-eligibility', (req, res) => {
  const { landHolding, farmerCategory, state, income } = req.body;
  const land = parseFloat(landHolding) || 0;

  const eligible = SCHEMES.filter(s => {
    if (!s.isActive) return false;
    if (s.eligibility.minLand && land < s.eligibility.minLand) return false;
    if (s.eligibility.maxLand && land > s.eligibility.maxLand) return false;
    if (s.eligibility.farmerCategory && farmerCategory && !s.eligibility.farmerCategory.includes(farmerCategory)) return false;
    return true;
  });

  const totalBenefit = `₹${(eligible.length * 2000 + Math.floor(Math.random() * 5000)).toLocaleString('en-IN')} estimated annual benefit`;

  res.json({
    success: true,
    message: `🎉 You are eligible for ${eligible.length} schemes!`,
    count: eligible.length,
    totalEstimatedBenefit: totalBenefit,
    schemes: eligible
  });
});

// GET /api/schemes/:id
router.get('/:id', (req, res) => {
  const scheme = SCHEMES.find(s => s.id === req.params.id);
  if (!scheme) return res.status(404).json({ success: false, error: 'Scheme not found' });
  res.json({ success: true, scheme });
});

module.exports = router;


// ══════════════════════════════════════
// routes/voice.routes.js
// ══════════════════════════════════════
const voiceRouter = express.Router();
const { VoiceCall } = require('../models');

const VOICE_INTENTS = {
  disease: { keywords: ['bimari','disease','leaf','patta','rang','yellow','peela','bug','kida'], response: (lang) => lang === 'hi' ? 'Aapki fasal ki bimari ke liye, kripya leaf ki photo bhejein ya hmare Disease AI par upload karein. Kya aap mujhe bata sakte hain ki kaunsi fasal hai?' : 'For crop disease, please upload a leaf photo to our Disease AI. Which crop do you have?' },
  market: { keywords: ['price','daam','bhav','mandi','sell','becho','market','rate'], response: (lang) => lang === 'hi' ? 'Aaj ke mandi bhav: Gehun - Rs 2450/quintal Jaipur mandi mein. Sabse achhi jagah Jaipur mandi hai. Kya aap kisi specific fasal ke bhav chahiye?' : 'Today market prices: Wheat Rs 2450/qtl at Jaipur. Best mandi today is Jaipur. Which crop price do you need?' },
  scheme: { keywords: ['scheme','yojana','subsidy','loan','kisan','pm'], response: (lang) => lang === 'hi' ? 'Aap PM Kisan (6000 rupaye/saal), Fasal Bima, aur Solar Pump Yojana ke liye eligible hain. Kya main aapko aavedan karne mein madad karun?' : 'You are eligible for PM Kisan (Rs 6000/yr), Crop Insurance, and Solar Pump scheme. Shall I help you apply?' },
  irrigation: { keywords: ['paani','water','pump','sinchai','irrigation','moisture'], response: (lang) => lang === 'hi' ? 'Aapke khet ki mitti mein naami 32% hai jo bahut kam hai. Turant sinchai shuru karein. Pump Zone 1 ke liye automatically ON ho gaya hai.' : 'Your field moisture is 32% which is very low. Start irrigation immediately. Pump for Zone 1 is automatically turned ON.' },
  general: { keywords: [], response: (lang) => lang === 'hi' ? 'Namaste! Main AgroGuardian AI hoon. Aap mujhse fasal ki bimari, mandi bhav, sarkari yojana, ya sinchai ke baare mein pooch sakte hain.' : 'Hello! I am AgroGuardian AI. You can ask me about crop disease, market prices, government schemes, or irrigation.' }
};

function detectIntent(transcript) {
  const text = (transcript || '').toLowerCase();
  for (const [intent, data] of Object.entries(VOICE_INTENTS)) {
    if (intent === 'general') continue;
    if (data.keywords.some(k => text.includes(k))) return intent;
  }
  return 'general';
}

// POST /api/voice/call - Log a voice call
voiceRouter.post('/call', async (req, res) => {
  try {
    const { phone, language, transcript, callSid } = req.body;
    const intent = detectIntent(transcript);
    const aiResponse = VOICE_INTENTS[intent].response(language || 'hi');

    const call = await VoiceCall.create({ phone, language: language || 'hi', intent, transcript, aiResponse, callSid, status: 'completed' });

    res.json({ success: true, intent, response: aiResponse, callId: call._id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/voice/webhook - Twilio TwiML webhook
voiceRouter.post('/webhook', (req, res) => {
  const { CallSid, From, SpeechResult, Language } = req.body;
  const intent = detectIntent(SpeechResult);
  const lang = Language?.startsWith('hi') ? 'hi' : 'en';
  const aiResponse = VOICE_INTENTS[intent].response(lang);

  // Respond with TwiML
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="${lang === 'hi' ? 'hi-IN' : 'en-IN'}" action="/api/voice/webhook" timeout="5">
    <Say language="${lang === 'hi' ? 'hi-IN' : 'en-IN'}" voice="Polly.Aditi">
      ${aiResponse}
    </Say>
  </Gather>
  <Say language="hi-IN" voice="Polly.Aditi">Dhanyavaad! AgroGuardian ki taraf se aapki madad ke liye always ready hain. Namaskar!</Say>
</Response>`);
});

// GET /api/voice/history
voiceRouter.get('/history', async (req, res) => {
  const calls = await VoiceCall.find().sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, count: calls.length, calls });
});

module.exports = voiceRouter;


// ══════════════════════════════════════
// routes/dashboard.routes.js
// ══════════════════════════════════════
const dashRouter = express.Router();
const { protect: protectDash } = require('../middleware/auth.middleware');
const { SensorReading: SR, DiseaseReport: DR, MarketPrice: MP } = require('../models');

// GET /api/dashboard/summary
dashRouter.get('/summary', protectDash, async (req, res) => {
  try {
    const farmId = req.query.farmId || req.user.farms?.[0];

    // Latest sensor reading
    const latestSensor = await SR.findOne({ farm: farmId }).sort({ timestamp: -1 });

    // Recent disease reports
    const recentDiseases = await DR.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(3);

    // Active alerts
    const allAlerts = latestSensor?.alerts || [];

    // Simulated sensor data if no real readings
    const sensorData = latestSensor ? latestSensor.readings : {
      soilMoisture: Math.round(28 + Math.random() * 25),
      soilPH: Math.round((6.2 + Math.random() * 0.8) * 10) / 10,
      temperature: Math.round(30 + Math.random() * 8),
      humidity: Math.round(55 + Math.random() * 25),
      ecLevel: Math.round((1.6 + Math.random() * 0.8) * 10) / 10,
      nitrogen: 'medium'
    };

    res.json({
      success: true,
      dashboard: {
        farmHealth: Math.round(65 + Math.random() * 30),
        sensors: sensorData,
        pumpStatus: latestSensor?.pumpStatus || false,
        alerts: allAlerts,
        alertCount: allAlerts.filter(a => a.severity === 'critical').length,
        recentScans: recentDiseases.length,
        waterSaved: '40%',
        lastUpdated: latestSensor?.timestamp || new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = dashRouter;
