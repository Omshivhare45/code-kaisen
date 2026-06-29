import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'express';

// Route Imports
// We will create these routers shortly
import authRouter from './routes/auth';
import departmentRouter from './routes/departments';
import permitRouter from './routes/permits';
import conflictRouter from './routes/conflicts';
import complaintRouter from './routes/complaints';
import dashboardRouter from './routes/dashboard';
import notificationRouter from './routes/notifications';

const app = express();

// Secure Headers
app.use(helmet());

// CORS Setup
app.use(cors({
  origin: '*', // For development. Can be restricted in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/departments', departmentRouter);
app.use('/api/permits', permitRouter);
app.use('/api/conflicts', conflictRouter);
app.use('/api/complaints', complaintRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

export default app;
