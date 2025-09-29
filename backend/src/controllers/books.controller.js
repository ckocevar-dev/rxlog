const Book = require('../models/book.model');
const { acquireBarcode } = require('../services/barcode.service');
const sizeToPrefix = require('../utils/sizeToPrefixFromDb');

exports.list = async (req,res,next)=>{ try{ res.json(await Book.find().sort({createdAt:-1}).limit(100)); }catch(e){ next(e);} };
exports.get = async (req,res,next)=>{ try{ const b=await Book.findById(req.params.id); if(!b) return res.status(404).json({message:'Not found'}); res.json(b);}catch(e){ next(e);} };
exports.remove = async (req,res,next)=>{ try{ const out=await Book.findByIdAndDelete(req.params.id); if(!out) return res.status(404).json({message:'Not found'}); res.status(204).send(); }catch(e){ next(e);} };

exports.create = async (req,res,next)=>{ try{
  const w = Number(req.body?.width), h = Number(req.body?.height);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return res.status(400).json({ message: 'width and height are required' });

  const prefix = await sizeToPrefix(w,h);
  if (!prefix) return res.status(409).json({ message: 'No size-rule prefix for these dimensions; registration not possible' });

  let code;
  try { code = await acquireBarcode({ prefix }); }
  catch { return res.status(409).json({ message: `No available barcode for prefix ${prefix}. Registration not possible until barcodes are freed/seeded.` }); }

  const body = {
    author: req.body.author,
    width: w,
    height: h,
    publisher: req.body.publisher,
    pages: req.body.pages,
    titleKeywords: req.body.titleKeywords,
    readingStatus: 'inProgress',
    isFeatured: false,
    Barcode: code
  };
  const doc = await Book.create(body);
  res.status(201).json(doc);
} catch(e){ next(e);} };

exports.update = async (req,res,next)=>{ try{
  const b = await Book.findByIdAndUpdate(req.params.id, req.body, { new:true, runValidators:true });
  if(!b) return res.status(404).json({message:'Not found'});
  res.json(b);
} catch(e){ next(e);} };
