require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const admin = require('firebase-admin');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import controllers
const authController = require('../controllers/authController');
const rsvpController = require('../controllers/rsvpController');

// Import middleware
const { verifyAuth, requireAdmin } = require('../middleware/auth.middleware');

// Initialize express app
const app = express();

// Initialize Firebase Admin SDK
try {
  let credential;
  if (process.env.NODE_ENV === 'production') {
    console.log("Menggunakan kredensial default (App Engine)");
    credential = admin.credential.applicationDefault();
  } else {
    console.log("Menggunakan serviceAccountKey.json lokal");
    const serviceAccount = require('./serviceAccountKey.json');
    credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp({
    credential,
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log("Firebase Admin SDK berhasil diinisialisasi");
} catch (err) {
  console.error("Gagal inisialisasi Firebase Admin SDK:", err.message);
}

// Middleware setup
// Update the Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "https://cdn.jsdelivr.net",
      "https://stackpath.bootstrapcdn.com",
      "https://unpkg.com",
      "https://www.gstatic.com",
      "https://www.googleapis.com",
      "https://apis.google.com",
      "https://www.gstatic.com/firebasejs/",
      "'unsafe-inline'",
      "'unsafe-eval'"  // Required for Firebase
    ],
    scriptSrcAttr: ["'self'", "'unsafe-inline'"],
    styleSrc: [
      "'self'",
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net",
      "'unsafe-inline'"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdn.jsdelivr.net"
    ],
    imgSrc: ["'self'", "data:", "blob:", "*"],
    connectSrc: [
      "'self'", 
      "https://firestore.googleapis.com", 
      "https://identitytoolkit.googleapis.com",
      "https://securetoken.googleapis.com",
      "https://apis.google.com",
      "https://*.googleapis.com"
    ],
    frameSrc: [
      "'self'",
      "https://*.firebaseapp.com",
      "https://*.googleapis.com",
      "https://*.google.com",
      "https://www.google.com",
      "https://picsum.photos",  // Tambahkan domain picsum.photos
      "https://*.picsum.photos",  // Tambahkan wildcard untuk subdomain picsum.photos
      "https://fastly.picsum.photos"
    ],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}));

// Parse allowed origins from environment variable
app.use(cors({
  origin: true, // izinkan semua origin
  credentials: true
}));

// Cookie and body parser middleware
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Add favicon route to prevent 404 errors
// Add a simple favicon handler to prevent 500 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response
});

// Debug middleware for form submissions
app.use('/submit-rsvp', (req, res, next) => {
  console.log('Form submission received:', req.body);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Auth routes
app.post('/login', authController.login);
app.post('/refresh-token', authController.refreshUserToken);
app.post('/logout', authController.logout);

// RSVP routes
app.post('/submit-rsvp', rsvpController.submitRsvp);

// Admin protected routes
app.get('/admin/data', verifyAuth, requireAdmin, rsvpController.getAllGuests);
app.post('/admin/updateScan', verifyAuth, requireAdmin, rsvpController.updateScanStatus);
app.post('/admin/deleteGuest', verifyAuth, requireAdmin, rsvpController.deleteGuest); // Tambahkan rute baru ini

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;