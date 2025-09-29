const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN || '*').split(',') }));
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/rxlog';
mongoose.connect(uri).then(() => console.log('Mongo connected')).catch(e => console.error('Mongo error', e));

app.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const specPath = path.join(__dirname, 'openapi.yaml');
if (fs.existsSync(specPath)) {
  const spec = YAML.load(specPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

app.use('/api/books', require('./routes/books.route'));
app.use('/api/barcodes', require('./routes/barcodes.route'));

// Serve production build (frontend) if present
app.use(express.static(path.join(__dirname, '..', 'public')));

const basePort = parseInt(process.env.PORT, 10) || 3000;
function listen(p) {
  const s = app.listen(p, () => console.log(`API listening on :${p}`));
  s.on('error', err => {
    if (err.code === 'EADDRINUSE') { console.warn(`Port ${p} in use, trying ${p+1}...`); listen(p+1); }
    else { console.error(err); process.exit(1); }
  });
}
listen(basePort);
