const User = require('../models/User');
const MarketPrice = require('../models/MarketPrice');

// ─── VOICE AI WEBHOOK (IVR / Twilio / Exotel) ─
// This receives calls from IVR provider and responds with SSML/text
const handleVoiceWebhook = async (req, res, next) => {
  try {
    const { phone, digits, language = 'hi', sessionId } = req.body;

    // Main menu if no digit pressed
    if (!digits) {
      return res.json({
        success: true,
        response: {
          type: 'menu',
          message: language === 'hi'
            ? 'Namaste! AgroGuardian AI mein aapka swagat hai. Fasal rog ki jaankari ke liye 1 dabaayein. Mandi bhav ke liye 2 dabaayein. Sarkari yojanaon ke liye 3 dabaayein.'
            : 'Welcome to AgroGuardian AI. Press 1 for disease info. Press 2 for market prices. Press 3 for government schemes.',
          options: [
            { digit: '1', action: 'disease_info' },
            { digit: '2', action: 'market_price' },
            { digit: '3', action: 'govt_schemes' },
          ]
        }
      });
    }

    // Route based on digit pressed
    let responseMessage = '';

    if (digits === '1') {
      responseMessage = language === 'hi'
        ? 'Apni fasal ki photo AgroGuardian app mein upload karein. Ya apne rog ke lakshan batayein — patti ka rang, daag, aur fasal ka naam — hamara AI rog aur ilaaj batayega.'
        : 'Upload your crop photo on the AgroGuardian app for instant disease detection. Our AI will identify the disease and suggest treatment.';
    }
    else if (digits === '2') {
      // Fetch live price
      const wheat = await MarketPrice.findOne({ crop: 'Wheat' }).sort({ modalPrice: -1 });
      const price = wheat ? wheat.modalPrice : 2450;
      const mandi = wheat ? wheat.mandi : 'Jaipur';
      responseMessage = language === 'hi'
        ? `Aaj gehun ka sabse achha bhav ${mandi} mandi mein hai — ${price} rupaye pratikvandal. Behtar bhav ke liye 4 se 5 din aur roke.`
        : `Best wheat price today is at ${mandi} Mandi — ₹${price} per quintal. AI recommends holding for 4-5 days for better price.`;
    }
    else if (digits === '3') {
      responseMessage = language === 'hi'
        ? 'PM Kisan mein 6000 rupaye saalaana milte hain. PM Fasal Bima mein 1.5% premium pe fasal bima milti hai. Solar pump pe 90% subsidy milti hai. Adhik jaankari ke liye AgroGuardian app kholen.'
        : 'PM Kisan gives ₹6000/year. PM Fasal Bima provides crop insurance at 1.5% premium. Solar pumps available at 90% subsidy. Open AgroGuardian app for full details.';
    }
    else {
      responseMessage = language === 'hi' ? 'Galat digit. Kripya dobara try karein.' : 'Invalid option. Please try again.';
    }

    res.json({
      success: true,
      sessionId,
      phone,
      response: { type: 'speak', message: responseMessage, language }
    });
  } catch (err) { next(err); }
};

// ─── TEXT QUERY (chatbot-style voice query) ───
const handleTextQuery = async (req, res, next) => {
  try {
    const { query, language = 'hi', phone } = req.body;
    const q = query.toLowerCase();

    let answer = '';

    if (q.includes('bhav') || q.includes('price') || q.includes('mandi')) {
      const crop = q.includes('gehun') || q.includes('wheat') ? 'Wheat'
                 : q.includes('pyaz') || q.includes('onion') ? 'Onion'
                 : q.includes('chana') ? 'Chana' : 'Wheat';
      const price = await MarketPrice.findOne({ crop }).sort({ modalPrice: -1 });
      answer = price
        ? `${crop} ka aaj sabse achha bhav ${price.mandi} mein ₹${price.modalPrice}/quintal hai.`
        : 'Is fasal ka bhav abhi available nahi hai.';
    }
    else if (q.includes('rog') || q.includes('bimari') || q.includes('disease')) {
      answer = 'Apni fasal ki patti ki photo AgroGuardian app mein upload karein. AI 98% accuracy se rog identify karega aur ilaaj batayega.';
    }
    else if (q.includes('yojana') || q.includes('scheme') || q.includes('subsidy')) {
      answer = 'PM Kisan (₹6000/year), PM Fasal Bima (1.5% premium), KUSUM Solar Pump (90% subsidy) — aapke liye available hain. App mein eligibility check karein.';
    }
    else if (q.includes('mosam') || q.includes('barish') || q.includes('weather')) {
      answer = 'Aaj ka mosam: 34°C, aasmaana saaf. Agli 3 din barish nahi. Sinchai aaj karen.';
    }
    else {
      answer = 'Mujhe samajh nahi aaya. Bhav, rog, yojana, ya mosam ke bare mein puchhein.';
    }

    res.json({ success: true, query, answer, language });
  } catch (err) { next(err); }
};

// ─── VOICE LANGUAGES SUPPORTED ────────────────
const getLanguages = (req, res) => {
  res.json({
    success: true,
    languages: [
      { code: 'hi', name: 'Hindi', region: 'All India', farmers: 2400 },
      { code: 'raj', name: 'Rajasthani', region: 'Rajasthan', farmers: 1200 },
      { code: 'har', name: 'Haryanvi', region: 'Haryana', farmers: 600 },
      { code: 'en', name: 'English', region: 'All India', farmers: 200 },
    ],
    tollFree: '1800-XXX-XXXX',
    availability: '24/7',
  });
};

module.exports = { handleVoiceWebhook, handleTextQuery, getLanguages };
