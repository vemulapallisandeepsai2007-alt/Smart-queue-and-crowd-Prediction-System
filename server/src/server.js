const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');
const { initSocket } = require('./services/socketService');
const authRoutes = require('./routes/authRoutes');
const placeRoutes = require('./routes/placeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const tokenRoutes = require('./routes/tokenRoutes');
const myRoutes = require('./routes/myRoutes');
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { initSnapshotCron } = require('./services/statService');
const { migrateTokensPatientSnapshot } = require('./controllers/tokenController');
const Admin = require('./models/Admin');
const { seedData } = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security Headers
app.use(helmet());

// CORS Configuration - allows CLIENT_URL, all localhost/127.0.0.1 ports, and local dev network
const isOriginAllowed = (origin) => {
  if (!origin) return true; // allow curl, Postman, server-to-server, mobile apps
  if (origin === CLIENT_URL || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
    return true;
  }
  // Allow any localhost or 127.0.0.1 port (e.g., 5173, 5174, 5175, 3000)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  // Allow local network IP addresses for local devices (e.g., 192.168.x.x, 10.x.x.x)
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Input Sanitization against NoSQL injection
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Smart Queue & Crowd Prediction System API',
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/my', myRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found for ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

let serverInstance = null;

const startServer = async () => {
  try {
    await connectDB();

    // Check if initial seed is needed (e.g. fresh memory or blank db)
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      console.log('⚡ No admin found in database. Running initial seed data...');
      await seedData(false);
    }

    // Initialize hourly snapshot cron scheduler
    initSnapshotCron();

    // Run patient snapshot migration for legacy tokens
    await migrateTokensPatientSnapshot();

    const httpServer = http.createServer(app);
    initSocket(httpServer, isOriginAllowed);

    serverInstance = httpServer.listen(PORT, () => {
      console.log(`🚀 Smart Queue Server with Socket.IO running on port ${PORT}`);
      console.log(`🌐 Allowed Client URL: ${CLIENT_URL}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  if (serverInstance) serverInstance.close();
});

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

