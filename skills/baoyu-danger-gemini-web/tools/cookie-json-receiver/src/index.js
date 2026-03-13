import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseCliArgs(argv) {
  const out = {
    output: null,
    host: null,
    port: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--output' || arg === '-o') {
      out.output = argv[++i] || null;
      continue;
    }

    if (arg === '--host') {
      out.host = argv[++i] || null;
      continue;
    }

    if (arg === '--port' || arg === '-p') {
      const raw = argv[++i] || '';
      const parsed = Number(raw);
      out.port = Number.isFinite(parsed) ? parsed : null;
      continue;
    }

    if (!arg.startsWith('-') && out.output === null) {
      out.output = arg;
      continue;
    }
  }

  return out;
}

const cli = parseCliArgs(process.argv.slice(2));

const HOST = cli.host || process.env.COOKIE_RECEIVER_HOST || '127.0.0.1';
const PORT = cli.port || Number(process.env.COOKIE_RECEIVER_PORT || 3000);
const MAX_BODY_SIZE = Number(process.env.COOKIE_RECEIVER_MAX_BODY_BYTES || 1024 * 1024);
const OUTPUT_FILE = cli.output || process.env.COOKIE_OUTPUT_PATH || 'cookie.json';
const targetPath = path.resolve(process.cwd(), OUTPUT_FILE);

function logInfo(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logError(message) {
  console.error(`[${new Date().toISOString()}] ${message}`);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function writeCookieFile(json) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      host: HOST,
      port: PORT,
      outputPath: targetPath,
      uptimeSec: Math.round(process.uptime()),
    });
    return;
  }

  if ((req.url === '/upload' || req.url === '/') && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();

      if (body.length > MAX_BODY_SIZE) {
        logError(`Request body too large: ${body.length} bytes`);
        sendJson(res, 413, { error: `Payload too large. Max allowed: ${MAX_BODY_SIZE} bytes` });
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        if (!body) throw new Error('Empty body');

        const json = JSON.parse(body);
        writeCookieFile(json);
        const cookieCount = Object.keys((json && json.cookieMap) || {}).length;
        logInfo(`Saved ${cookieCount} cookies to ${targetPath}`);

        sendJson(res, 200, {
          success: true,
          path: targetPath,
          cookieCount,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logError(`Error processing request: ${message}`);
        sendJson(res, 400, { error: message });
      }
    });

    req.on('error', (err) => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logError(`Request error: ${message}`);
      if (!res.headersSent) {
        sendJson(res, 500, { error: message });
      }
    });

    return;
  }

  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, HOST, () => {
  logInfo(`Cookie Receiver running at http://${HOST}:${PORT}/upload`);
  logInfo(`Health check at http://${HOST}:${PORT}/health`);
  logInfo(`Saving cookies to: ${targetPath}`);
});

function shutdown(signal) {
  logInfo(`Received ${signal}, shutting down...`);
  server.close(() => {
    logInfo('Server stopped');
    process.exit(0);
  });

  setTimeout(() => {
    logError('Force exit after timeout');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
