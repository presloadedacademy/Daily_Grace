import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import motivationRoutes from './routes/motivationRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/env.js';

const app = express();

// Security & Parsing Middleware
const allowedOrigins = (config.clientUrl || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for production subdomains
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Daily Grace API (Phases 1-6)',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/motivations', motivationRoutes);
app.use('/api/daily', motivationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);



// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
