const { Schema, model, models } = require('mongoose');
const schema = new Schema({
  Barcode: { type: String, required: true, unique: true, index: true, set: v => String(v||'').trim().toLowerCase() },
  rank:    { type: Number, default: 0 }
}, { timestamps: true, collection: 'AvailableBarcodes' });
module.exports = models.Barcode || model('Barcode', schema);
