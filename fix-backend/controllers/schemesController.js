const SchemeApplication = require('../models/SchemeApplication');
const User = require('../models/User');

// All available schemes database
const SCHEMES = [
  { id:'PM_KISAN', name:'PM Kisan Samman Nidhi', code:'PMK-2024', ministry:'Ministry of Agriculture', category:'central', subCategory:'income', benefit:'₹6,000/year', eligibility:{ maxLand:2, categories:['marginal','small'] }, deadline:'Ongoing' },
  { id:'PMFBY',    name:'PM Fasal Bima Yojana',  code:'PMFBY-24', ministry:'Ministry of Agriculture', category:'central', subCategory:'insurance', benefit:'Full crop value', eligibility:{ allFarmers:true }, deadline:'Before sowing' },
  { id:'SHC',      name:'Soil Health Card',       code:'SHC-2024', ministry:'Ministry of Agriculture', category:'central', subCategory:'free', benefit:'Free soil testing', eligibility:{ allFarmers:true }, deadline:'Ongoing' },
  { id:'KUSUM',    name:'PM KUSUM Solar Pump',    code:'KUSUM-RJ', ministry:'MNRE', category:'central', subCategory:'subsidy', benefit:'90% subsidy on solar pump', eligibility:{ minLand:0.5 }, deadline:'Rolling' },
  { id:'SMAM',     name:'Agri Mechanization (SMAM)', code:'SMAM-24', ministry:'Ministry of Agriculture', category:'central', subCategory:'subsidy', benefit:'50% subsidy on machinery', eligibility:{ allFarmers:true }, deadline:'31 Mar 2026' },
  { id:'KCC',      name:'Kisan Credit Card',      code:'KCC-24',   ministry:'Ministry of Finance',   category:'central', subCategory:'loan', benefit:'Crop loan @ 4% interest', eligibility:{ allFarmers:true }, deadline:'Ongoing' },
  { id:'RJ_TARBANDI', name:'Rajasthan Tarbandi Yojana', code:'RJ-TB-24', ministry:'Rajasthan Govt', category:'state', subCategory:'subsidy', benefit:'₹48,000 subsidy for fencing', eligibility:{ minLand:0.5, state:'Rajasthan' }, deadline:'31 Dec 2025' },
  { id:'RJ_DRIP',  name:'Rajasthan Drip Irrigation', code:'RJ-DI-24', ministry:'Rajasthan Agri Dept', category:'state', subCategory:'subsidy', benefit:'50–70% subsidy on drip system', eligibility:{ minLand:0.2, state:'Rajasthan' }, deadline:'Rolling' },
];

// ─── CHECK ELIGIBILITY ────────────────────────
const checkEligibility = async (req, res, next) => {
  try {
    const { landHolding, farmerCategory, state, primaryCrop, annualIncome } = req.body;

    const eligible = SCHEMES.filter(s => {
      const e = s.eligibility;
      if (e.allFarmers) return true;
      if (e.maxLand && landHolding > e.maxLand) return false;
      if (e.minLand && landHolding < e.minLand) return false;
      if (e.categories && !e.categories.includes(farmerCategory)) return false;
      if (e.state && e.state !== state) return false;
      return true;
    });

    res.json({
      success: true,
      totalSchemes: SCHEMES.length,
      eligibleCount: eligible.length,
      schemes: eligible,
      message: `${eligible.length} schemes found for you!`,
    });
  } catch (err) { next(err); }
};

// ─── GET ALL SCHEMES ─────────────────────────
const getAllSchemes = async (req, res, next) => {
  try {
    const { category, subCategory } = req.query;
    let filtered = SCHEMES;
    if (category && category !== 'all') filtered = filtered.filter(s => s.category === category);
    if (subCategory) filtered = filtered.filter(s => s.subCategory === subCategory);
    res.json({ success: true, count: filtered.length, schemes: filtered });
  } catch (err) { next(err); }
};

// ─── SUBMIT APPLICATION ──────────────────────
const submitApplication = async (req, res, next) => {
  try {
    const { schemeName, schemeCode, ministry, annualIncome } = req.body;
    const user = await User.findById(req.user._id);

    const existing = await SchemeApplication.findOne({ farmerId: req.user._id, schemeName, status: { $ne: 'rejected' } });
    if (existing) return res.status(400).json({ success: false, message: 'Already applied for this scheme' });

    const app = await SchemeApplication.create({
      farmerId: req.user._id,
      schemeName, schemeCode, ministry, annualIncome,
      landHolding: user.landHolding,
      farmerCategory: user.farmerCategory,
      primaryCrop: user.primaryCrop,
      status: 'submitted',
    });

    res.status(201).json({
      success: true,
      message: `Application submitted for ${schemeName}! Reference ID: ${app._id}`,
      application: app,
    });
  } catch (err) { next(err); }
};

// ─── GET MY APPLICATIONS ─────────────────────
const getMyApplications = async (req, res, next) => {
  try {
    const apps = await SchemeApplication.find({ farmerId: req.user._id }).sort({ submittedAt: -1 });
    res.json({ success: true, count: apps.length, applications: apps });
  } catch (err) { next(err); }
};

module.exports = { checkEligibility, getAllSchemes, submitApplication, getMyApplications };
