import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import errorHandler from './middleware/error.js';
import { initSockets } from './sockets/socketHandler.js';
import { apiLimiter, xssSanitizer } from './middleware/security.js';
import logger from './utils/logger.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import permitRoutes from './routes/permitRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// 1. Logging Middleware (morgan piped to winston)
const morganMiddleware = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream: { write: (message) => logger.http(message.trim()) } }
);
app.use(morganMiddleware);

// 2. Security Headers (Helmet)
app.use(helmet());

// 3. Enable CORS
app.use(cors({
  origin: '*', // Adjust for specific staging/production domains
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// 4. Body parsers
app.use(express.json({ limit: '10kb' })); // Max payload limit
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Data Sanitization (NoSQL injection & XSS)
app.use(mongoSanitize());
app.use(xssSanitizer);

// 6. Global Rate Limiter for all API routes
app.use('/api', apiLimiter);

// Set static folder for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'SETU E-Coordination REST API is running' });
});

// Centralized error handler
app.use(errorHandler);

// Initialize Sockets
initSockets(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
