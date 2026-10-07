import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import csvHandler from './api/csv.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
app.all('/api/csv', (req, res) => { void csvHandler(req, res); });
app.use('/api', (_req, res) => { res.status(404).send('Rota não encontrada.'); });

async function startServer() {
  if (production) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => { res.sendFile(path.resolve('dist/index.html')); });
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.listen(port, '0.0.0.0', () => console.log(`Dashboard em http://localhost:${port}`));
}
startServer().catch(error => { console.error(error); process.exitCode = 1; });
