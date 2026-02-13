import express, { Express, Response } from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { config } from './config/environment';
import { database } from './database/connection';
import { initializeDatabase } from './database/schema';
import { generalLimiter, authLimiter, createLimiter } from './middleware/rateLimiter';
import { initializeWebSocket } from './services/websocketService';

console.log('🚀 Starting Portal TI Backend...');
console.log('📝 Loading configuration...');

const app: Express = express();
const httpServer = http.createServer(app);

console.log('✓ Express app created');

// Middleware
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Garantir UTF-8 em todas as respostas
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Rate limiting geral
app.use('/api/', generalLimiter);

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API (authLimiter desabilitado em desenvolvimento)
app.use('/api/auth', require('./routes/auth').default);
app.use('/api/public-auth', require('./routes/publicAuth').default);
app.use('/api/internal-auth', require('./routes/internalAuth').default);
app.use('/api/tickets', require('./routes/tickets').default);
app.use('/api/assets', require('./routes/assets').default);
app.use('/api/purchases', require('./routes/purchases').default);
app.use('/api/inventory', require('./routes/inventory').default);
app.use('/api', require('./routes/knowledge').default);
app.use('/api/dashboard', require('./routes/dashboard').default);
app.use('/api/reports', require('./routes/reports').default);

// Error handling
app.use((err: any, req: any, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer(): Promise<void> {
  try {
    console.log('📡 Connecting to database...');
    await database.connect();
    console.log('✓ Initializing database schema...');
    await initializeDatabase();
    console.log('✓ Database initialized');

    // Inicializar WebSocket
    console.log('🔌 Initializing WebSocket...');
    initializeWebSocket(httpServer);
    console.log('✓ WebSocket initialized');

    httpServer.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════╗
║   Portal de Serviços de TI            ║
║   Server running on port ${config.port}       ║
║   Environment: ${config.nodeEnv.toUpperCase().padEnd(26)}║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

console.log('🎬 Starting server...');
startServer();
