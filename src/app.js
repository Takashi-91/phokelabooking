import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import './utils/db.js';
import apiRoutes from './routes/index.js';
import roomUnitRoutes from './routes/roomUnits.js';

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com", // Google Maps styles
        ],

        scriptSrc: [
          "'self'",
          "https://maps.googleapis.com",  // Google Maps API
          "https://maps.gstatic.com",     // Maps resources
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https://images.unsplash.com",
          "https://maps.gstatic.com",     // Map tiles, icons
          "https://maps.googleapis.com",  // Static maps images
        ],

        connectSrc: [
          "'self'",
          "https://maps.googleapis.com",  // API requests
        ],

        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",    // Google fonts for maps
        ],

        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],

        frameSrc: [
          "'self'",
          "https://www.google.com",       // Google Maps embed iframe
          "https://maps.googleapis.com",
        ],
      },
    },
  })
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

const mongoUrl = process.env.MONGO_URI;
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000*60*60*24*7, secure: false },
  store: MongoStore.create({ mongoUrl })
}));

// API routes
app.use('/api', apiRoutes);
app.use('/api', roomUnitRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});

app.get('/gallery', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/gallery.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/booking.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// API health check
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Guesthouse API', ts: new Date().toISOString() }));

// 404 handler for API routes
app.use('/api/*', (_req, res) => res.status(404).json({ message: 'API endpoint not found' }));

// 404 handler for all other routes - serve index.html for SPA routing
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err, _req, res, _next) => { 
  console.error(err); 
  res.status(err.status || 500).json({ message: err.message || 'Server error' }); 
});
export default app;
