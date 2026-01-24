const express = require('express');
const path = require('path');
const { WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Internal access detection middleware
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Gravity Chamber Control',
    basePath: res.locals.basePath,
    internal: res.locals.internal
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Gravity Chamber Viewer',
    timestamp: new Date().toISOString()
  });
});

// Store active chamber connections by client ID
const chamberConnections = new Map();

// SSE endpoint for chamber state streaming
app.get('/api/chamber/stream', (req, res) => {
  const { fqdn } = req.query;

  if (!fqdn) {
    return res.status(400).json({ error: 'Missing fqdn parameter' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now().toString();
  console.log(`SSE client ${clientId} connecting to chamber: ${fqdn}`);

  // Send initial connecting status
  res.write(`data: ${JSON.stringify({ type: 'status', status: 'connecting' })}\n\n`);

  // Build WebSocket URL to gravity-chamber
  let wsUrl;
  if (fqdn.includes('://')) {
    wsUrl = fqdn.replace(/^http/, 'ws');
    if (!wsUrl.endsWith('/chamber')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/chamber';
    }
  } else {
    wsUrl = `ws://${fqdn}`;
    if (!fqdn.includes(':')) {
      wsUrl += ':3003';
    }
    wsUrl += '/chamber';
  }

  console.log(`Proxying to gravity-chamber at: ${wsUrl}`);

  let chamberWs;
  try {
    chamberWs = new WebSocket(wsUrl);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
    return;
  }

  chamberConnections.set(clientId, { res, chamberWs });

  chamberWs.on('open', () => {
    console.log(`Chamber connected for client ${clientId}`);
    res.write(`data: ${JSON.stringify({ type: 'status', status: 'connected' })}\n\n`);
  });

  chamberWs.on('message', (data) => {
    try {
      const state = JSON.parse(data);
      res.write(`data: ${JSON.stringify({ type: 'state', ...state })}\n\n`);
    } catch (e) {
      res.write(`data: ${data}\n\n`);
    }
  });

  chamberWs.on('error', (err) => {
    console.error(`Chamber error for client ${clientId}:`, err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  });

  chamberWs.on('close', (code, reason) => {
    console.log(`Chamber closed for client ${clientId}:`, code);
    res.write(`data: ${JSON.stringify({ type: 'status', status: 'disconnected', reason: reason?.toString() })}\n\n`);
    res.end();
    chamberConnections.delete(clientId);
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`SSE client ${clientId} disconnected`);
    if (chamberWs && chamberWs.readyState === WebSocket.OPEN) {
      chamberWs.close();
    }
    chamberConnections.delete(clientId);
  });
});

app.listen(PORT, () => {
  console.log(`Gravity Viewer running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log('SSE endpoint available at /api/chamber/stream');
});
