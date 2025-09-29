const Pool = require('../models/barcode.model');
const Book = require('../models/book.model');

async function acquireBarcode({ prefix, bookId }) {
  if (!prefix) throw new Error('prefix required');
  const picked = await Pool.findOneAndDelete(
    { Barcode: new RegExp('^'+prefix,'i') },
    { sort: { rank: 1, Barcode: 1 } }
  ).lean();
  if (!picked) throw new Error('No available barcode for prefix');
  if (bookId) {
    await Book.findByIdAndUpdate(bookId, { $set: { Barcode: picked.Barcode } }, { new:true, runValidators:true });
  }
  return picked.Barcode;
}
module.exports = { acquireBarcode };
