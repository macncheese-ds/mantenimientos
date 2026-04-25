const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');

dotenv.config();

const auth = require('./routes/auth');
const lines = require('./routes/lines');
const machines = require('./routes/machines');
const tasks = require('./routes/tasks');
const maintenance = require('./routes/maintenance');
const config = require('./routes/config');

const app = express();

// CORS — open for local network
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Explicit OPTIONS handler for preflight
app.options('*', cors());

app.use(bodyParser.json({ limit: '10mb' }));

// Security headers
app.use(helmet({
  xssFilter: false,
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Cache control for API responses
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// Serve uploaded photos with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Routes
app.use('/api/auth', auth);
app.use('/api/lines', lines);
app.use('/api/machines', machines);
app.use('/api/tasks', tasks);
app.use('/api/maintenance', maintenance);
app.use('/api/config', config);

const PORT = process.env.PORT || 3114;
app.listen(PORT, '0.0.0.0', () => console.log(`Mantenimientos API on ${PORT}`));
