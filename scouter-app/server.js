const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { runTests } = require('./lib/runner');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    message: 'Scouter ready to scan power levels',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/scan' });

wss.on('connection', (ws) => {
  console.log('Scouter connection established');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.action === 'scan') {
        console.log(`Starting scan for ${data.target}: ${data.fqdn}`);
        await runTests(ws, data.target, data.fqdn, data.tests);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process request: ' + error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Scouter connection closed');
  });
});

server.listen(PORT, () => {
  console.log(`Scouter App operational on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  WS   /ws/scan');
  console.log('  GET  / (static files)');
});
