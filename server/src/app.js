import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import memberRoutes from './routes/member.routes.js';
import exerciseRoutes from './routes/exercise.routes.js';
import trainerRoutes from './routes/trainer.routes.js';

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/trainer', trainerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'FitPulse API Server',
    version: '1.0.0',
    healthCheck: '/api/health',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

export default app;
