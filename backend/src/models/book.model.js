const { Schema, model, models } = require('mongoose');

const titleKeywordSchema = new Schema({
  word: { type: String, required: true, trim: true, maxlength: 25 },
  position: { type: Number, required: true, min: 0, max: 19, validate: { validator: Number.isInteger, message: 'position must be an integer 0–19' } }
}, { _id: false });

function sortKeywords(a=[]) { return [...a].sort((x,y)=>x.position-y.position); }

const bookSchema = new Schema({
  author: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  width:  { type: Number, required: true },
  height: { type: Number, required: true },
  publisher: { type: String, required: true, trim: true, maxlength: 100 },
  pages:     { type: Number, required: true, max: 9999 },
  titleKeywords: {
    type: [titleKeywordSchema], required: true,
    validate: [
      { validator(a){ return Array.isArray(a) && a.length>=1 && a.length<=3; }, message: '1–3 title keywords required' },
      { validator(a){ const w=a.map(k=>String(k.word||'').toLowerCase()); return new Set(w).size===w.length; }, message: 'Duplicate keywords not allowed' },
      { validator(a){ const p=a.map(k=>k.position); return new Set(p).size===p.length; }, message: 'Duplicate keyword positions not allowed' },
      { validator(a){ const s=sortKeywords(a); return a[0].position===s[0].position; }, message: 'First keyword must have lowest position' }
    ]
  },
  Barcode: { type: String, required: true, set: v => typeof v==='string' ? v.trim().toLowerCase() : v, index: { unique: true, sparse: true } },
  readingStatus: { type: String, enum: ['inProgress','finished','abandoned'], default: 'inProgress', index: true },
  isFeatured:    { type: Boolean, default: false },
  registrationDate:       { type: Date, default: Date.now, immutable: true },
  readingStatusChangedAt: { type: Date, default: null },
  featuredAt:             { type: Date, default: null },
  BarcodeReleaseDue:      { type: Date, default: null },
  BarcodeReleasedAt:      { type: Date, default: null }
}, { timestamps: true, minimize: false });

bookSchema.pre('validate', function(next){
  if (Array.isArray(this.titleKeywords)) this.titleKeywords = sortKeywords(this.titleKeywords);
  next();
});
bookSchema.pre('save', function(next){
  if (this.isModified('readingStatus') && (this.readingStatus==='finished' || this.readingStatus==='abandoned')) {
    this.readingStatusChangedAt = new Date();
    this.BarcodeReleaseDue = new Date(Date.now() + 7*24*60*60*1000);
  }
  if (this.isModified('isFeatured') && this.isFeatured && !this.featuredAt) this.featuredAt = new Date();
  next();
});
bookSchema.pre(['findOneAndUpdate','updateOne'], function(next){
  const upd=this.getUpdate()||{}; const $set=upd.$set||{};
  if (Array.isArray($set.titleKeywords)) { $set.titleKeywords = sortKeywords($set.titleKeywords); upd.$set=$set; }
  const ns=(('readingStatus' in $set)?$set.readingStatus:upd.readingStatus);
  if (ns==='finished'||ns==='abandoned') {
    upd.$set={ ...(upd.$set||$set),
      readingStatusChangedAt:new Date(),
      BarcodeReleaseDue: new Date(Date.now() + 7*24*60*60*1000)
    };
  }
  const nf=(('isFeatured' in $set)?$set.isFeatured:upd.isFeatured);
  if (nf===true) upd.$set={ ...(upd.$set||$set), featuredAt:new Date() };
  this.setUpdate(upd); next();
});

module.exports = models.Book || model('Book', bookSchema);
