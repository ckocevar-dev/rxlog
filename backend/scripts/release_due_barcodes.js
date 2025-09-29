/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('../src/models/book.model');
const Pool = require('../src/models/barcode.model');

(async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/rxlog';
  await mongoose.connect(uri);

  const now = new Date();
  const due = await Book.find({
    Barcode: { $ne: null },
    BarcodeReleaseDue: { $lte: now },
    BarcodeReleasedAt: null
  }).lean();

  console.log(`Barcodes due for release: ${due.length}`);

  for (const b of due) {
    const code = b.Barcode;
    if (!code) continue;

    // Return to pool (idempotent)
    await Pool.updateOne(
      { Barcode: code },
      { $setOnInsert: { Barcode: code } },
      { upsert: true }
    );

    // Clear from book and stamp release time
    await Book.updateOne(
      { _id: b._id, Barcode: code },
      { $unset: { Barcode: "" }, $set: { BarcodeReleasedAt: now } }
    );

    console.log(`Released ${code} from book ${b._id}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
})().catch(err => { console.error(err); process.exit(1); });
