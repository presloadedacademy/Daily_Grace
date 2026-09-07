import app from './app.js';
import { config } from './config/env.js';
import { checkDbConnection } from './config/db.js';
import { startReminderScheduler } from './scheduler/reminderScheduler.js';

async function startServer() {
  console.log('--- Starting DAILY GRACE Server (Phases 1-6) ---');
  await checkDbConnection();

  // Start background reminder scheduler
  startReminderScheduler();

  const port = process.env.PORT || config.port || 5000;
  app.listen(port, () => {
    console.log(`[Daily Grace API] Server running on port ${port}`);
    console.log(`[Daily Grace API] Environment: ${config.nodeEnv}`);
    console.log(`[Daily Grace API] Client URL: ${config.clientUrl}`);
    console.log(`[Daily Grace API] Reminder Time: ${config.dailyReminderTime}`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Error] Failed to start server:', err);
  process.exit(1);
});

export default app;

