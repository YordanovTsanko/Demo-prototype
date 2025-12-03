require('dotenv').config();
const express = require('express');
const cors = require('cors');
const patentRoutes = require('./routes/patents');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', patentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Patent Chat API - Demo Prototype',
    status: 'running',
    version: '1.0.0',
    mode: 'file-based (no database)',
    endpoints: {
      patents: 'GET /api/patents',
      patentDetail: 'GET /api/patents/:id',
      chat: 'POST /api/chat',
      status: 'GET /api/status'
    },
    documentation: 'See README.md for setup and usage'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /api/patents',
      'GET /api/patents/:id',
      'POST /api/chat',
      'GET /api/status'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Patent Chat API Server');
  console.log('='.repeat(60));
  console.log(`📡 Server:      http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Storage:     File-based (no database)`);
  console.log(`🤖 LLM:         Groq API ${process.env.GROQ_API_KEY ? '✅' : '❌ NOT CONFIGURED'}`);
  console.log('='.repeat(60));
  console.log('\n📚 Available Endpoints:');
  console.log('   GET  /api/patents      - List all patents');
  console.log('   GET  /api/patents/:id  - Get patent details');
  console.log('   POST /api/chat         - Ask question');
  console.log('   GET  /api/status       - System status');
  console.log('\n💡 Tip: Run "npm run process" to process PDFs first\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});