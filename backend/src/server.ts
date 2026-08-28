import express from 'express';
import cors from 'cors';
import http from 'http';
import { env } from './config/environment.js';
import { getDatabase, closeDatabase } from './database/db.js';
import { WebSocketService } from './services/websocket.service.js';
import { SessionService } from './services/session.service.js';
import { apiRouter } from './routes/api.routes.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { logger } from './utils/logger.js';

const app = express();

// Enable CORS for frontend and local network access
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token', 'X-Razorpay-Signature', 'X-Webhook-Signature', 'X-Cashfree-Signature'],
  credentials: true
}));

// Body parser with raw body retention for webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    logger.debug(`[HTTP] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api', apiRouter);

// Error Handler Middleware
app.use(errorHandler);

// Create HTTP Server and bind WebSocket
const server = http.createServer(app);

// Initialize DB & WebSocket Service
getDatabase();
WebSocketService.initialize(server);

// Periodic check for expired payment sessions every 10 seconds
setInterval(() => {
  try {
    SessionService.checkAndExpireSessions();
  } catch (err) {
    logger.error('Error during session expiry check:', err);
  }
}, 10000);

// Graceful Shutdown
const shutdown = () => {
  logger.info('Shutting down server gracefully...');
  WebSocketService.close();
  server.close(() => {
    closeDatabase();
    logger.info('Server closed cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(env.PORT, env.HOST, () => {
  logger.info('====================================================');
  logger.info(` UPI Payment Display Backend running!`);
  logger.info(` Server URL: http://${env.HOST}:${env.PORT}`);
  logger.info(` WebSocket: ws://${env.HOST}:${env.PORT}/ws`);
  logger.info(` Merchant: ${env.MERCHANT_NAME} (${env.MERCHANT_UPI_ID})`);
  logger.info('====================================================');
});
