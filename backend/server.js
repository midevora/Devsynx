// server.js (Main File)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const express = require('express');
const cors = require('cors');
const teamRoutes = require('./routes/teamRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

// Log all requests
app.use((req, res, next) => {
    const loggedBody = { ...req.body };
    if (loggedBody.github_token) {
        loggedBody.github_token = '[REDACTED]';
    }
    console.log(`📨 ${req.method} ${req.path}`, { data: loggedBody });
    next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('✓ Test endpoint called');
    res.json({ status: 'OK', message: 'Server is working' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Wrapper for async route handlers to catch errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

console.log('📍 Registering routes...');
console.log('📍 Mounting teamRoutes at /api');
app.use('/api', teamRoutes);
console.log('✅ teamRoutes mounted');

console.log('📍 Mounting authRoutes at /api/auth');
app.use('/api/auth', authRoutes);
console.log('✅ authRoutes mounted');

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔴 Unhandled error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
        return res.sendFile(path.join(__dirname, '..', 'client', 'public', 'index.html'));
    }
    return next();
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.path });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));