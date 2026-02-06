import express, { Express, Response } from 'express';
import cors from 'cors';
import { config } from './config/environment';
import { database } from './database/connection';
import { initializeDatabase } from './database/schema';

const app: Express = express();

// Middleware
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
app.use('/api/auth', require('./routes/auth').default);
app.use('/api/public-auth', require('./routes/publicAuth').default);
app.use('/api/internal-auth', require('./routes/internalAuth').default);
app.use('/api/tickets', require('./routes/tickets').default);
app.use('/api/assets', require('./routes/assets').default);
app.use('/api/purchases', require('./routes/purchases').default);
app.use('/api/inventory', require('./routes/inventory').default);
app.use('/api', require('./routes/knowledge').default);
app.use('/api/dashboard', require('./routes/dashboard').default);

// Error handling
app.use((err: any, req: any, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer(): Promise<void> {
  try {
    await database.connect();
    await initializeDatabase();

    app.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   Portal de Serviços de TI            ║
║   Server running on port ${config.port}       ║
║   Environment: ${config.nodeEnv.toUpperCase().padEnd(26)}║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
