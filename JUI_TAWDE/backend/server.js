const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/db');
const historyRoutes = require('./routes/historyRoutes');
const setupSocketIO = require('./sockets/gameSocket');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// API Routes
app.use('/api/history', historyRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Catch-all 404 & Global Error Handling Middlewares
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Initialize Socket.io Event Listeners
setupSocketIO(io);

// Start Server with Graceful Port Binding
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

function startListening(port) {
  const currentServer = server.listen(port);

  currentServer.once('listening', () => {
    console.log(`\n==================================================`);
    console.log(`🎮 Multi-Room Tic Tac Toe Server running on port ${port}`);
    console.log(`🌐 Web App accessible at: http://localhost:${port}`);
    console.log(`==================================================\n`);
  });

  currentServer.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      currentServer.close(() => {
        startListening(port + 1);
      });
    } else {
      console.error('🔥 Server Listen Error:', err);
    }
  });
}

connectDB().then(() => {
  startListening(DEFAULT_PORT);
});
