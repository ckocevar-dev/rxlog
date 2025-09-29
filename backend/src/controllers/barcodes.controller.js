const Pool = require('../models/barcode.model');
const sizeToPrefix = require('../utils/sizeToPrefixFromDb');

exports.poolStatus = async (req,res,next)=>{ try{ res.json({ available: await Pool.estimatedDocumentCount() }); }catch(e){ next(e);} };

exports.search = async (req,res,next)=>{ try{
  const q={}; const { prefix, code, limit=100 } = req.query||{};
  if (code) q.Barcode = String(code).trim().toLowerCase();
  if (prefix) q.Barcode = new RegExp('^'+prefix,'i');
  const rows = await Pool.find(q).sort({ rank:1, Barcode:1 }).limit(Number(limit)).lean();
  res.json(rows);
} catch(e){ next(e);} };

exports.prefixBySize = async (req,res,next)=>{ try{
  const parse = s => (s==null?NaN : (typeof s==='number'? s : parseFloat(String(s).replace(',','.'))));
  const w=parse(req.query.BookWidth), h=parse(req.query.BookHeight);
  if(!Number.isFinite(w)||!Number.isFinite(h)) return res.status(400).json({ message:'BookWidth & BookHeight required' });
  const prefix = await sizeToPrefix(w,h); res.json({ prefix });
} catch(e){ next(e);} };

exports.previewBySize = async (req,res,next)=>{ try{
  const parse = s => (s==null?NaN : (typeof s==='number'? s : parseFloat(String(s).replace(',','.'))));
  const w=parse(req.query.BookWidth), h=parse(req.query.BookHeight);
  if(!Number.isFinite(w)||!Number.isFinite(h)) return res.status(400).json({ message:'BookWidth & BookHeight required' });
  const prefix = await sizeToPrefix(w,h);
  if (!prefix) return res.json({ prefix:null, candidate:null });
  const candidate = await Pool.findOne({ Barcode:new RegExp('^'+prefix,'i') }, null, { sort:{ rank:1, Barcode:1 } }).lean();
  res.json({ prefix, candidate });
} catch(e){ next(e);} };
