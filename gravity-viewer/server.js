const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

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

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/chamber' });

// WebSocket proxy - relays connections to gravity-chamber
wss.on('connection', (clientWs) => {
  console.log('Client connected to viewer WebSocket');

  let chamberWs = null;

  clientWs.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.action === 'connect') {
        // Client wants to connect to a gravity chamber
        const targetFqdn = data.fqdn;

        if (!targetFqdn) {
          clientWs.send(JSON.stringify({ type: 'error', message: 'No FQDN provided' }));
          return;
        }

        // Close existing chamber connection if any
        if (chamberWs) {
          chamberWs.close();
          chamberWs = null;
        }

        // Build WebSocket URL to gravity-chamber
        let wsUrl;
        if (targetFqdn.includes('://')) {
          wsUrl = targetFqdn.replace(/^http/, 'ws');
          if (!wsUrl.endsWith('/chamber')) {
            wsUrl = wsUrl.replace(/\/$/, '') + '/chamber';
          }
        } else {
          wsUrl = `ws://${targetFqdn}`;
          if (!targetFqdn.includes(':')) {
            wsUrl += ':3003';
          }
          wsUrl += '/chamber';
        }

        console.log(`Proxying to gravity-chamber at: ${wsUrl}`);
        clientWs.send(JSON.stringify({ type: 'status', status: 'connecting', target: wsUrl }));

        try {
          chamberWs = new WebSocket(wsUrl);

          chamberWs.on('open', () => {
            console.log('Connected to gravity-chamber');
            clientWs.send(JSON.stringify({ type: 'status', status: 'connected' }));
          });

          chamberWs.on('message', (chamberData) => {
            // Relay chamber data to client
            if (clientWs.readyState === WebSocket.OPEN) {
              // Parse and re-wrap to identify as chamber data
              try {
                const state = JSON.parse(chamberData);
                clientWs.send(JSON.stringify({ type: 'state', ...state }));
              } catch (e) {
                clientWs.send(chamberData);
              }
            }
          });

          chamberWs.on('error', (err) => {
            console.error('Chamber WebSocket error:', err.message);
            clientWs.send(JSON.stringify({
              type: 'error',
              message: `Failed to connect to chamber: ${err.message}`
            }));
          });

          chamberWs.on('close', (code, reason) => {
            console.log('Chamber connection closed:', code, reason?.toString());
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'status',
                status: 'disconnected',
                reason: reason?.toString() || 'Connection closed'
              }));
            }
            chamberWs = null;
          });

        } catch (err) {
          console.error('Failed to create chamber WebSocket:', err.message);
          clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
        }

      } else if (data.action === 'disconnect') {
        if (chamberWs) {
          chamberWs.close();
          chamberWs = null;
        }
        clientWs.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
      }

    } catch (err) {
      console.error('Failed to parse client message:', err);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected from viewer');
    if (chamberWs) {
      chamberWs.close();
      chamberWs = null;
    }
  });

  clientWs.on('error', (err) => {
    console.error('Client WebSocket error:', err.message);
    if (chamberWs) {
      chamberWs.close();
      chamberWs = null;
    }
  });
});

server.listen(PORT, () => {
  console.log(`Gravity Viewer running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log('WebSocket proxy available at /ws/chamber');
});
