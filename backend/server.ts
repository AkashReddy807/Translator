import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { translateRouter } from './routes/translateRoutes.ts';
import { ttsRouter } from './routes/ttsRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_RETRIES = 20;

function listenWithFallback(
  server: http.Server,
  initialPort: number,
  maxRetries = MAX_PORT_RETRIES
) {
  return new Promise<number>((resolve, reject) => {
    let attempt = 0;
    let currentPort = initialPort;

    const onListening = () => {
      server.off('error', onError);
      console.log(`Server listening on http://localhost:${currentPort}`);
      resolve(currentPort);
    };

    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
        attempt += 1;
        const nextPort = currentPort + 1;
        console.warn(`Port ${currentPort} is already in use, trying port ${nextPort}...`);
        currentPort = nextPort;
        server.listen(currentPort, '0.0.0.0');
        return;
      }
      server.off('listening', onListening);
      reject(err);
    };

    server.once('listening', onListening);
    server.on('error', onError);
    server.listen(currentPort, '0.0.0.0');
  });
}

export async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.use('/api', translateRouter);
  app.use('/api', ttsRouter);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await listenWithFallback(httpServer, DEFAULT_PORT);

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
