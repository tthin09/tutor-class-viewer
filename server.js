import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import calendarHandler from './api/events.js';

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(pathname); } catch {}
  if (decodedPath.toLowerCase().includes('/data/') || decodedPath.toLowerCase() === '/credentials.json') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  if (pathname === '/api/events') {
    const response = {
      status(code) { res.statusCode = code; return this; },
      setHeader(name, value) { res.setHeader(name, value); },
      json(body) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(body));
      },
    };
    await calendarHandler(req, response);
    return;
  }
  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end('Not found');
  });
});

server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log(`Local app: http://localhost:${server.address().port}`);
});
