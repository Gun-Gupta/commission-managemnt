require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/user.routes');
const leadRoutes = require('./routes/lead.routes');

const app = express();

// --- CORS ---
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// --- Body Parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Commission Management API is running.', timestamp: new Date().toISOString() });
});

// --- API Routes ---
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// --- Centralized Error Handler (must be last) ---
app.use(errorHandler);

module.exports = app;
