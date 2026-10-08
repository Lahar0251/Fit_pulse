import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed/seed.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Start HTTP server immediately on configured port
  app.listen(PORT, () => {
    console.log(`[FitPulse Server] Running on http://localhost:${PORT}`);
    console.log(`[FitPulse Server] Health check available at http://localhost:${PORT}/api/health`);
  });

  // Attempt database connection and seed initial demo data
  await connectDB();
  await seedDatabase();
};

startServer();
