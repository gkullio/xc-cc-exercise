const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const { GravitySimulator } = require('./lib/simulator');

const app = express();
const PORT = process.env.PORT || 3003;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Gravity Chamber Control System',
    location: 'West City HQ',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/chamber' });

// Single simulator instance shared across all connections
const simulator = new GravitySimulator();

// Broadcast state to all connected clients
function broadcast() {
  const state = simulator.getState();
  const message = JSON.stringify(state);

  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Tick simulator and broadcast every second
setInterval(() => {
  simulator.tick();
  broadcast();
}, 1000);

wss.on('connection', (ws) => {
  console.log('Chamber viewer connected');

  // Send immediate state on connect
  ws.send(JSON.stringify(simulator.getState()));

  ws.on('close', () => {
    console.log('Chamber viewer disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Gravity Chamber Control System online - Port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  WS   /chamber');
});
