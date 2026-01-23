# Gravity Chamber Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Gravity Chamber backend (WebSocket server) and Gravity Viewer frontend (retro UI) to demonstrate private multi-cloud networking.

**Architecture:** Two separate apps - Gravity Chamber (port 3003) runs standalone at remote/on-prem site, Gravity Viewer (port 3004) joins main docker-compose stack. Scouter gets new tests to validate availability and RFC1918 private addressing.

**Tech Stack:** Node.js 20, Express, ws (WebSocket), EJS templates

---

## Task 1: Gravity Chamber - Project Setup

**Files:**
- Create: `gravity-chamber/package.json`
- Create: `gravity-chamber/Dockerfile`
- Create: `gravity-chamber/docker-compose.yml`

**Step 1: Create package.json**

```json
{
  "name": "gravity-chamber",
  "version": "1.0.0",
  "description": "Gravity Chamber Control System - Private On-Prem Service",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0"
  }
}
```

Write to: `gravity-chamber/package.json`

**Step 2: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3003

CMD ["node", "server.js"]
```

Write to: `gravity-chamber/Dockerfile`

**Step 3: Create standalone docker-compose.yml**

```yaml
services:
  gravity-chamber:
    build: .
    ports:
      - "3003:3003"
    restart: unless-stopped
```

Write to: `gravity-chamber/docker-compose.yml`

**Step 4: Commit**

```bash
git add gravity-chamber/package.json gravity-chamber/Dockerfile gravity-chamber/docker-compose.yml
git commit -m "feat(gravity-chamber): add project setup files"
```

---

## Task 2: Gravity Chamber - Simulator Logic

**Files:**
- Create: `gravity-chamber/lib/simulator.js`

**Step 1: Create simulator module**

This module manages the training session state machine with auto-simulation.

```javascript
const USERS = ['Vegeta', 'Goku', 'Trunks', 'Piccolo'];
const SAFETY_THRESHOLDS = {
  'Vegeta': 450,
  'Goku': 500,
  'Trunks': 300,
  'Piccolo': 350
};

class GravitySimulator {
  constructor() {
    this.status = 'idle';
    this.gravityLevel = 1;
    this.user = null;
    this.sessionStart = null;
    this.targetDuration = 0;
    this.userIndex = 0;
    this.idleCountdown = 5; // Start first session after 5 seconds
    this.emergencyCountdown = 0;
  }

  getSafetyThreshold() {
    return this.user ? SAFETY_THRESHOLDS[this.user] : 100;
  }

  getPowerOutput() {
    // Power scales exponentially with gravity
    return Math.round(this.gravityLevel * 5.65 * 10) / 10;
  }

  getState() {
    const now = new Date();
    return {
      chamber: {
        status: this.status,
        gravityLevel: this.gravityLevel,
        safetyThreshold: this.getSafetyThreshold(),
        powerOutput: this.getPowerOutput()
      },
      session: {
        user: this.user,
        startedAt: this.sessionStart ? this.sessionStart.toISOString() : null,
        duration: this.sessionStart ? Math.floor((now - this.sessionStart) / 1000) : 0,
        targetDuration: this.targetDuration
      },
      timestamp: now.toISOString()
    };
  }

  tick() {
    if (this.status === 'emergency') {
      this.emergencyCountdown--;
      if (this.emergencyCountdown <= 0) {
        // Emergency resolved, go to idle
        this.status = 'idle';
        this.gravityLevel = 1;
        this.user = null;
        this.sessionStart = null;
        this.idleCountdown = 10;
      }
      return;
    }

    if (this.status === 'idle') {
      this.idleCountdown--;
      if (this.idleCountdown <= 0) {
        this.startSession();
      }
      return;
    }

    if (this.status === 'active') {
      const elapsed = Math.floor((Date.now() - this.sessionStart) / 1000);

      // Random emergency chance (1% per tick)
      if (Math.random() < 0.01 && this.gravityLevel > 100) {
        this.triggerEmergency();
        return;
      }

      // Gradually increase gravity during session
      const progress = elapsed / this.targetDuration;
      const targetGravity = Math.min(
        Math.floor(50 + progress * (this.getSafetyThreshold() - 50)),
        this.getSafetyThreshold()
      );

      // Smooth ramping
      if (this.gravityLevel < targetGravity) {
        this.gravityLevel = Math.min(this.gravityLevel + Math.ceil(Math.random() * 3), targetGravity);
      }

      // Session complete
      if (elapsed >= this.targetDuration) {
        this.endSession();
      }
    }
  }

  startSession() {
    this.user = USERS[this.userIndex];
    this.userIndex = (this.userIndex + 1) % USERS.length;
    this.status = 'active';
    this.sessionStart = new Date();
    this.targetDuration = 60 + Math.floor(Math.random() * 120); // 60-180 seconds
    this.gravityLevel = 10;
  }

  endSession() {
    this.status = 'idle';
    this.gravityLevel = 1;
    this.user = null;
    this.sessionStart = null;
    this.idleCountdown = 15 + Math.floor(Math.random() * 15); // 15-30 seconds idle
  }

  triggerEmergency() {
    this.status = 'emergency';
    this.gravityLevel = Math.min(this.gravityLevel + 50, 500); // Spike!
    this.emergencyCountdown = 8; // 8 seconds of emergency
  }
}

module.exports = { GravitySimulator };
```

Write to: `gravity-chamber/lib/simulator.js`

**Step 2: Commit**

```bash
git add gravity-chamber/lib/simulator.js
git commit -m "feat(gravity-chamber): add training session simulator"
```

---

## Task 3: Gravity Chamber - WebSocket Server

**Files:**
- Create: `gravity-chamber/server.js`

**Step 1: Create the main server**

```javascript
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
```

Write to: `gravity-chamber/server.js`

**Step 2: Test locally**

```bash
cd gravity-chamber && npm install && npm start
```

Expected: Server starts on port 3003, logs endpoints.

**Step 3: Verify WebSocket works**

Open a second terminal:
```bash
npx wscat -c ws://localhost:3003/chamber
```

Expected: Receives JSON state every second with chamber status, gravity level, session info.

**Step 4: Stop the server and commit**

```bash
git add gravity-chamber/server.js
git commit -m "feat(gravity-chamber): add WebSocket server with auto-broadcast"
```

---

## Task 4: Gravity Viewer - Project Setup

**Files:**
- Create: `gravity-viewer/package.json`
- Create: `gravity-viewer/Dockerfile`

**Step 1: Create package.json**

```json
{
  "name": "gravity-viewer",
  "version": "1.0.0",
  "description": "Gravity Chamber Viewer - Retro Control Panel UI",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ejs": "^3.1.9"
  }
}
```

Write to: `gravity-viewer/package.json`

**Step 2: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3004

CMD ["node", "server.js"]
```

Write to: `gravity-viewer/Dockerfile`

**Step 3: Commit**

```bash
git add gravity-viewer/package.json gravity-viewer/Dockerfile
git commit -m "feat(gravity-viewer): add project setup files"
```

---

## Task 5: Gravity Viewer - Express Server

**Files:**
- Create: `gravity-viewer/server.js`

**Step 1: Create the server**

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Gravity Chamber Control'
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

app.listen(PORT, () => {
  console.log(`Gravity Viewer running on port ${PORT}`);
  console.log('Open http://localhost:3004 in your browser');
});
```

Write to: `gravity-viewer/server.js`

**Step 2: Commit**

```bash
git add gravity-viewer/server.js
git commit -m "feat(gravity-viewer): add Express server"
```

---

## Task 6: Gravity Viewer - EJS Template

**Files:**
- Create: `gravity-viewer/views/index.ejs`

**Step 1: Create the main template**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | Capsule Corp</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <div class="scanlines"></div>

  <header class="header">
    <div class="logo">
      <span class="logo-icon">⬡</span>
      <span class="logo-text">CAPSULE CORP</span>
    </div>
    <div class="header-title">GRAVITY CHAMBER CONTROL SYSTEM</div>
    <div class="header-location">WEST CITY HQ</div>
  </header>

  <main class="main">
    <div class="connection-panel">
      <label for="fqdn">CHAMBER FQDN:</label>
      <input type="text" id="fqdn" placeholder="gravity.westcity.local" autocomplete="off">
      <button id="connect-btn" class="btn-connect">CONNECT</button>
    </div>

    <div class="status-bar">
      <span id="connection-status" class="status disconnected">DISCONNECTED</span>
    </div>

    <div class="control-panel">
      <div class="gauge-container">
        <div class="gauge">
          <div class="gauge-ring">
            <svg viewBox="0 0 200 200">
              <circle class="gauge-bg" cx="100" cy="100" r="85" />
              <circle id="gauge-fill" class="gauge-fill" cx="100" cy="100" r="85" />
            </svg>
          </div>
          <div class="gauge-center">
            <div id="gravity-value" class="gravity-value">---</div>
            <div class="gravity-unit">x GRAVITY</div>
          </div>
        </div>
        <div class="gauge-label">GRAVITY LEVEL</div>
      </div>

      <div class="info-panel">
        <div class="info-row">
          <span class="info-label">STATUS</span>
          <span id="chamber-status" class="info-value status-value">---</span>
        </div>
        <div class="info-row">
          <span class="info-label">USER</span>
          <span id="session-user" class="info-value">---</span>
        </div>
        <div class="info-row">
          <span class="info-label">TIME</span>
          <span id="session-time" class="info-value">--:--</span>
        </div>
        <div class="info-row">
          <span class="info-label">TARGET</span>
          <span id="session-target" class="info-value">--:--</span>
        </div>
        <div class="info-row">
          <span class="info-label">POWER</span>
          <span id="power-output" class="info-value">--- kW</span>
        </div>
        <div class="info-row">
          <span class="info-label">SAFE MAX</span>
          <span id="safety-threshold" class="info-value">---x</span>
        </div>
      </div>
    </div>

    <div id="error-overlay" class="error-overlay hidden">
      <div class="error-content">
        <div class="error-icon">⚠</div>
        <div class="error-title">LINK FAILED</div>
        <div id="error-message" class="error-message">CHAMBER UNREACHABLE</div>
        <button id="error-dismiss" class="btn-dismiss">DISMISS</button>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>GRAVITY CHAMBER MONITORING SYSTEM v1.0</p>
  </footer>

  <script src="/js/viewer.js"></script>
</body>
</html>
```

Write to: `gravity-viewer/views/index.ejs`

**Step 2: Commit**

```bash
git add gravity-viewer/views/index.ejs
git commit -m "feat(gravity-viewer): add control panel template"
```

---

## Task 7: Gravity Viewer - CSS Styling

**Files:**
- Create: `gravity-viewer/public/css/styles.css`

**Step 1: Create the retro CSS**

```css
/* Gravity Viewer - Retro DBZ Control Panel */
:root {
  --primary: #ff6b00;
  --primary-dark: #cc5500;
  --secondary: #0066cc;
  --bg-dark: #1a1a2e;
  --bg-panel: #16213e;
  --text: #ffffff;
  --text-dim: #8892b0;
  --success: #00ff88;
  --warning: #ffcc00;
  --danger: #ff3366;
  --border: #0f3460;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Courier New', monospace;
  background: var(--bg-dark);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
}

/* CRT Scanlines Effect */
.scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
}

/* Header */
.header {
  background: linear-gradient(180deg, var(--secondary) 0%, #004499 100%);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 3px solid var(--primary);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 2rem;
  color: var(--primary);
}

.logo-text {
  font-weight: bold;
  font-size: 1.2rem;
  letter-spacing: 2px;
}

.header-title {
  font-size: 1.5rem;
  font-weight: bold;
  letter-spacing: 3px;
  text-shadow: 0 0 10px var(--primary);
}

.header-location {
  font-size: 0.9rem;
  color: var(--text-dim);
}

/* Main */
.main {
  flex: 1;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}

/* Connection Panel */
.connection-panel {
  background: var(--bg-panel);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.connection-panel label {
  font-weight: bold;
  color: var(--primary);
  letter-spacing: 1px;
}

.connection-panel input {
  flex: 1;
  min-width: 200px;
  padding: 12px 15px;
  background: var(--bg-dark);
  border: 2px solid var(--border);
  border-radius: 5px;
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
}

.connection-panel input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(255, 107, 0, 0.3);
}

.btn-connect {
  padding: 12px 30px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 5px;
  font-family: inherit;
  font-weight: bold;
  font-size: 1rem;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-connect:hover {
  background: var(--primary-dark);
  transform: scale(1.02);
}

.btn-connect:disabled {
  background: var(--border);
  cursor: not-allowed;
  transform: none;
}

/* Status Bar */
.status-bar {
  text-align: center;
}

.status {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  letter-spacing: 2px;
  font-size: 0.9rem;
}

.status.disconnected {
  background: var(--border);
  color: var(--text-dim);
}

.status.connecting {
  background: var(--warning);
  color: #000;
  animation: pulse 1s infinite;
}

.status.connected {
  background: var(--success);
  color: #000;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Control Panel */
.control-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  flex: 1;
}

/* Gauge */
.gauge-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-panel);
  padding: 40px;
  border-radius: 10px;
  border: 2px solid var(--border);
}

.gauge {
  position: relative;
  width: 250px;
  height: 250px;
}

.gauge-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.gauge-ring svg {
  width: 100%;
  height: 100%;
}

.gauge-bg {
  fill: none;
  stroke: var(--border);
  stroke-width: 15;
}

.gauge-fill {
  fill: none;
  stroke: var(--primary);
  stroke-width: 15;
  stroke-linecap: round;
  stroke-dasharray: 534;
  stroke-dashoffset: 534;
  transition: stroke-dashoffset 0.5s ease, stroke 0.3s;
}

.gauge-fill.warning {
  stroke: var(--warning);
}

.gauge-fill.danger {
  stroke: var(--danger);
}

.gauge-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.gravity-value {
  font-size: 3.5rem;
  font-weight: bold;
  color: var(--primary);
  text-shadow: 0 0 20px rgba(255, 107, 0, 0.5);
  transition: color 0.3s;
}

.gravity-value.warning {
  color: var(--warning);
  text-shadow: 0 0 20px rgba(255, 204, 0, 0.5);
}

.gravity-value.danger {
  color: var(--danger);
  text-shadow: 0 0 20px rgba(255, 51, 102, 0.5);
  animation: danger-pulse 0.5s infinite;
}

@keyframes danger-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.gravity-unit {
  font-size: 1rem;
  color: var(--text-dim);
  letter-spacing: 2px;
}

.gauge-label {
  margin-top: 20px;
  font-size: 1.2rem;
  font-weight: bold;
  letter-spacing: 3px;
  color: var(--text-dim);
}

/* Info Panel */
.info-panel {
  background: var(--bg-panel);
  padding: 30px;
  border-radius: 10px;
  border: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: var(--text-dim);
  font-weight: bold;
  letter-spacing: 2px;
}

.info-value {
  font-size: 1.3rem;
  font-weight: bold;
  color: var(--text);
}

.status-value.idle {
  color: var(--text-dim);
}

.status-value.active {
  color: var(--success);
}

.status-value.emergency {
  color: var(--danger);
  animation: danger-pulse 0.5s infinite;
}

/* Error Overlay */
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}

.error-overlay.hidden {
  display: none;
}

.error-content {
  background: var(--bg-panel);
  border: 3px solid var(--danger);
  border-radius: 10px;
  padding: 50px;
  text-align: center;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.error-icon {
  font-size: 5rem;
  color: var(--danger);
  margin-bottom: 20px;
}

.error-title {
  font-size: 2rem;
  font-weight: bold;
  color: var(--danger);
  letter-spacing: 3px;
  margin-bottom: 10px;
}

.error-message {
  font-size: 1.2rem;
  color: var(--text-dim);
  margin-bottom: 30px;
}

.btn-dismiss {
  padding: 15px 40px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 5px;
  font-family: inherit;
  font-weight: bold;
  font-size: 1rem;
  letter-spacing: 2px;
  cursor: pointer;
}

.btn-dismiss:hover {
  background: #cc2952;
}

/* Footer */
.footer {
  background: var(--bg-panel);
  padding: 15px;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.85rem;
  letter-spacing: 1px;
  border-top: 2px solid var(--border);
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .control-panel {
    grid-template-columns: 1fr;
  }

  .gauge {
    width: 200px;
    height: 200px;
  }

  .gravity-value {
    font-size: 2.5rem;
  }
}
```

Write to: `gravity-viewer/public/css/styles.css`

**Step 2: Commit**

```bash
git add gravity-viewer/public/css/styles.css
git commit -m "feat(gravity-viewer): add retro control panel CSS"
```

---

## Task 8: Gravity Viewer - JavaScript Client

**Files:**
- Create: `gravity-viewer/public/js/viewer.js`

**Step 1: Create the WebSocket client**

```javascript
// Gravity Chamber Viewer - WebSocket Client

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;

// DOM Elements
const fqdnInput = document.getElementById('fqdn');
const connectBtn = document.getElementById('connect-btn');
const connectionStatus = document.getElementById('connection-status');
const gravityValue = document.getElementById('gravity-value');
const gaugeFill = document.getElementById('gauge-fill');
const chamberStatus = document.getElementById('chamber-status');
const sessionUser = document.getElementById('session-user');
const sessionTime = document.getElementById('session-time');
const sessionTarget = document.getElementById('session-target');
const powerOutput = document.getElementById('power-output');
const safetyThreshold = document.getElementById('safety-threshold');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const errorDismiss = document.getElementById('error-dismiss');

// Event Listeners
connectBtn.addEventListener('click', handleConnect);
fqdnInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleConnect();
});
errorDismiss.addEventListener('click', hideError);

function handleConnect() {
  const fqdn = fqdnInput.value.trim();
  if (!fqdn) {
    showError('Please enter a valid FQDN');
    return;
  }

  connect(fqdn);
}

function connect(fqdn) {
  // Close existing connection
  if (ws) {
    ws.close();
  }

  setStatus('connecting');
  connectBtn.disabled = true;
  connectBtn.textContent = 'CONNECTING...';

  // Build WebSocket URL
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsUrl;

  if (fqdn.includes('://')) {
    // Full URL provided
    wsUrl = fqdn.replace(/^http/, 'ws');
    if (!wsUrl.endsWith('/chamber')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/chamber';
    }
  } else {
    // Just hostname/FQDN
    wsUrl = `${protocol}//${fqdn}`;
    if (!fqdn.includes(':')) {
      wsUrl += ':3003';
    }
    wsUrl += '/chamber';
  }

  console.log('Connecting to:', wsUrl);

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    showError('Invalid WebSocket URL: ' + err.message);
    resetConnection();
    return;
  }

  ws.onopen = () => {
    console.log('Connected to Gravity Chamber');
    setStatus('connected');
    reconnectAttempts = 0;
    connectBtn.textContent = 'DISCONNECT';
    connectBtn.disabled = false;
    connectBtn.onclick = disconnect;
  };

  ws.onmessage = (event) => {
    try {
      const state = JSON.parse(event.data);
      updateDisplay(state);
    } catch (err) {
      console.error('Failed to parse state:', err);
    }
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  ws.onclose = (event) => {
    console.log('Connection closed:', event.code, event.reason);

    if (connectionStatus.textContent === 'CONNECTING...') {
      showError('Failed to connect to chamber');
    } else if (connectionStatus.textContent === 'CONNECTED') {
      // Unexpected disconnect, try reconnect
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setStatus('connecting');
        setTimeout(() => connect(fqdnInput.value.trim()), 2000);
        return;
      } else {
        showError('Connection lost. Max reconnection attempts reached.');
      }
    }

    resetConnection();
  };
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  resetConnection();
}

function resetConnection() {
  setStatus('disconnected');
  connectBtn.textContent = 'CONNECT';
  connectBtn.disabled = false;
  connectBtn.onclick = handleConnect;
  clearDisplay();
}

function setStatus(status) {
  connectionStatus.className = 'status ' + status;
  connectionStatus.textContent = status.toUpperCase();
  if (status === 'connecting') {
    connectionStatus.textContent = 'ESTABLISHING LINK...';
  }
}

function updateDisplay(state) {
  const { chamber, session } = state;

  // Gravity value
  gravityValue.textContent = chamber.gravityLevel;

  // Update gauge (max 500x gravity = full circle)
  const percentage = chamber.gravityLevel / 500;
  const circumference = 534; // 2 * PI * 85
  const offset = circumference - (percentage * circumference);
  gaugeFill.style.strokeDashoffset = offset;

  // Color based on threshold proximity
  const thresholdRatio = chamber.gravityLevel / chamber.safetyThreshold;
  if (thresholdRatio >= 1 || chamber.status === 'emergency') {
    gravityValue.className = 'gravity-value danger';
    gaugeFill.className.baseVal = 'gauge-fill danger';
  } else if (thresholdRatio >= 0.8) {
    gravityValue.className = 'gravity-value warning';
    gaugeFill.className.baseVal = 'gauge-fill warning';
  } else {
    gravityValue.className = 'gravity-value';
    gaugeFill.className.baseVal = 'gauge-fill';
  }

  // Chamber status
  chamberStatus.textContent = chamber.status.toUpperCase();
  chamberStatus.className = 'info-value status-value ' + chamber.status;

  // Session info
  sessionUser.textContent = session.user || '---';
  sessionTime.textContent = session.user ? formatTime(session.duration) : '--:--';
  sessionTarget.textContent = session.user ? formatTime(session.targetDuration) : '--:--';

  // Power and safety
  powerOutput.textContent = chamber.powerOutput + ' kW';
  safetyThreshold.textContent = chamber.safetyThreshold + 'x';
}

function clearDisplay() {
  gravityValue.textContent = '---';
  gravityValue.className = 'gravity-value';
  gaugeFill.style.strokeDashoffset = 534;
  gaugeFill.className.baseVal = 'gauge-fill';
  chamberStatus.textContent = '---';
  chamberStatus.className = 'info-value status-value';
  sessionUser.textContent = '---';
  sessionTime.textContent = '--:--';
  sessionTarget.textContent = '--:--';
  powerOutput.textContent = '--- kW';
  safetyThreshold.textContent = '---x';
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showError(message) {
  errorMessage.textContent = message;
  errorOverlay.classList.remove('hidden');
}

function hideError() {
  errorOverlay.classList.add('hidden');
}
```

Write to: `gravity-viewer/public/js/viewer.js`

**Step 2: Commit**

```bash
git add gravity-viewer/public/js/viewer.js
git commit -m "feat(gravity-viewer): add WebSocket client JavaScript"
```

---

## Task 9: Add Gravity Viewer to Main Docker Compose

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add gravity-viewer service**

Add to the end of `docker-compose.yml`:

```yaml
  gravity-viewer:
    build: ./gravity-viewer
    ports:
      - "3004:3004"
    restart: unless-stopped
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(compose): add gravity-viewer to main stack"
```

---

## Task 10: Scouter - Add Chamber Tests

**Files:**
- Create: `scouter-app/lib/tests/chamber.js`
- Modify: `scouter-app/lib/runner.js`

**Step 1: Create chamber tests module**

```javascript
const { WebSocket } = require('ws');
const dns = require('dns').promises;

// RFC1918 private address ranges
const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },      // 10.0.0.0/8
  { start: '172.16.0.0', end: '172.31.255.255' },   // 172.16.0.0/12
  { start: '192.168.0.0', end: '192.168.255.255' }  // 192.168.0.0/16
];

function ipToLong(ip) {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateIP(ip) {
  const ipLong = ipToLong(ip);
  return PRIVATE_RANGES.some(range => {
    const startLong = ipToLong(range.start);
    const endLong = ipToLong(range.end);
    return ipLong >= startLong && ipLong <= endLong;
  });
}

/**
 * Test chamber availability via WebSocket
 */
async function testAvailability(baseUrl, sendUpdate) {
  const results = {
    name: 'Chamber Availability',
    test: 'availability',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: {}
  };

  // Extract hostname and port from URL
  let hostname, port;
  try {
    // baseUrl might be https://... or just hostname
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const parsed = new URL(url);
    hostname = parsed.hostname;
    port = parsed.port || '3003';
  } catch (err) {
    results.details.push({ phase: 'Parse URL', result: `Failed: ${err.message}` });
    return results;
  }

  results.debug.hostname = hostname;
  results.debug.port = port;

  sendUpdate({ phase: 'Connecting to Gravity Chamber...' });

  return new Promise((resolve) => {
    const wsUrl = `ws://${hostname}:${port}/chamber`;
    results.debug.wsUrl = wsUrl;

    let ws;
    const timeout = setTimeout(() => {
      if (ws) ws.close();
      results.details.push({ phase: 'Connect', result: 'Timeout - no response within 10s' });
      resolve(results);
    }, 10000);

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      clearTimeout(timeout);
      results.details.push({ phase: 'Connect', result: `Failed: ${err.message}` });
      resolve(results);
      return;
    }

    ws.on('open', () => {
      results.details.push({ phase: 'Connect', result: 'WebSocket connection established' });
      results.powerLevel = 1500;
    });

    ws.on('message', (data) => {
      clearTimeout(timeout);
      try {
        const state = JSON.parse(data.toString());
        results.debug.receivedState = state;

        if (state.chamber && state.chamber.status) {
          results.details.push({ phase: 'State', result: `Received chamber state (status: ${state.chamber.status})` });
          results.powerLevel = 3000;
          results.status = 'pass';
        } else {
          results.details.push({ phase: 'State', result: 'Received data but invalid format' });
        }
      } catch (err) {
        results.details.push({ phase: 'State', result: `Failed to parse: ${err.message}` });
      }
      ws.close();
      resolve(results);
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      results.details.push({ phase: 'Connect', result: `Error: ${err.message}` });
      results.debug.error = err.message;
      resolve(results);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      if (results.powerLevel === 0) {
        results.details.push({ phase: 'Connect', result: 'Connection closed without receiving data' });
      }
      resolve(results);
    });
  });
}

/**
 * Test that FQDN resolves to RFC1918 private address
 */
async function testPrivateNetwork(baseUrl, sendUpdate) {
  const results = {
    name: 'Private Network',
    test: 'private-network',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: {}
  };

  // Extract hostname from URL
  let hostname;
  try {
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch (err) {
    results.details.push({ phase: 'Parse URL', result: `Failed: ${err.message}` });
    return results;
  }

  results.debug.hostname = hostname;

  sendUpdate({ phase: 'Resolving FQDN...' });

  try {
    const addresses = await dns.resolve4(hostname);
    results.debug.resolvedAddresses = addresses;

    if (addresses.length === 0) {
      results.details.push({ phase: 'DNS Lookup', result: 'No A records found' });
      return results;
    }

    const ip = addresses[0];
    results.details.push({ phase: 'DNS Lookup', result: `Resolved to ${ip}` });
    results.powerLevel = 1000;

    if (isPrivateIP(ip)) {
      results.details.push({ phase: 'RFC1918 Check', result: `✓ ${ip} is a private address` });
      results.powerLevel = 3000;
      results.status = 'pass';
    } else {
      results.details.push({ phase: 'RFC1918 Check', result: `✗ ${ip} is a public address` });
      results.details.push({ phase: 'Warning', result: 'Chamber should not be publicly accessible' });
    }
  } catch (err) {
    if (err.code === 'ENOTFOUND') {
      results.details.push({ phase: 'DNS Lookup', result: `Hostname not found: ${hostname}` });
    } else {
      results.details.push({ phase: 'DNS Lookup', result: `Failed: ${err.message}` });
    }
    results.debug.error = err.message;
  }

  return results;
}

module.exports = {
  'availability': testAvailability,
  'private-network': testPrivateNetwork
};
```

Write to: `scouter-app/lib/tests/chamber.js`

**Step 2: Update runner.js to include chamber tests**

In `scouter-app/lib/runner.js`, add the chamber import and update testSuites:

Find line 1-7:
```javascript
const radarTests = require('./tests/radar');
const storeTests = require('./tests/store');

const testSuites = {
  radar: radarTests,
  store: storeTests
};
```

Replace with:
```javascript
const radarTests = require('./tests/radar');
const storeTests = require('./tests/store');
const chamberTests = require('./tests/chamber');

const testSuites = {
  radar: radarTests,
  store: storeTests,
  chamber: chamberTests
};
```

**Step 3: Update getTestDisplayName function**

Find the `getTestDisplayName` function (around line 91-103) and add chamber test names:

```javascript
function getTestDisplayName(testName) {
  const names = {
    'rate-limiting': 'Rate Limiting',
    'caching': 'Caching Strategy',
    'performance': 'Global Performance',
    'security': 'API Security',
    'waf': 'WAF Protection',
    'bot': 'Bot Protection',
    'ddos': 'DDoS Mitigation',
    'pci': 'PCI Compliance',
    'availability': 'Chamber Availability',
    'private-network': 'Private Network'
  };
  return names[testName] || testName;
}
```

**Step 4: Update getMaxPowerLevel function**

Find the `getMaxPowerLevel` function (around line 105-117) and add chamber power levels:

```javascript
function getMaxPowerLevel(testName) {
  const maxLevels = {
    'rate-limiting': 4000,
    'caching': 4000,
    'performance': 3000,
    'security': 3000,
    'waf': 4000,
    'bot': 3100,
    'ddos': 3000,
    'pci': 2500,
    'availability': 3000,
    'private-network': 3000
  };
  return maxLevels[testName] || 3000;
}
```

**Step 5: Commit**

```bash
git add scouter-app/lib/tests/chamber.js scouter-app/lib/runner.js
git commit -m "feat(scouter): add chamber availability and private network tests"
```

---

## Task 11: Integration Test

**Step 1: Start the Gravity Chamber locally**

```bash
cd gravity-chamber && npm install && npm start &
```

**Step 2: Start the Gravity Viewer locally**

```bash
cd gravity-viewer && npm install && npm start &
```

**Step 3: Test in browser**

Open http://localhost:3004 in browser.
- Enter `localhost` in the FQDN field
- Click CONNECT
- Verify gauge shows live gravity data
- Verify session info updates

**Step 4: Test Scouter integration**

```bash
cd scouter-app && npm install && npm start &
```

Use wscat or browser console to test:
```javascript
const ws = new WebSocket('ws://localhost:3002/ws/scan');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({
  action: 'scan',
  target: 'chamber',
  fqdn: 'localhost',
  tests: ['availability', 'private-network']
}));
```

Expected: Availability test passes (receives state), private-network may fail (localhost resolves to 127.0.0.1 which is loopback, not RFC1918).

**Step 5: Stop all services and clean up**

```bash
pkill -f "node server.js"
```

---

## Task 12: Final Docker Build Test

**Step 1: Build all containers**

```bash
docker compose build
```

Expected: All services build successfully including gravity-viewer.

**Step 2: Build gravity-chamber standalone**

```bash
cd gravity-chamber && docker compose build
```

Expected: Gravity chamber builds successfully.

**Step 3: Final commit with updated README mention**

```bash
git add -A
git status
```

If any uncommitted changes remain, commit them:

```bash
git commit -m "chore: finalize gravity chamber implementation"
```

---

## Summary

After completing all tasks you will have:

1. **gravity-chamber/** - Standalone WebSocket service (port 3003) for remote deployment
2. **gravity-viewer/** - Retro control panel UI (port 3004) in main docker-compose
3. **scouter-app/lib/tests/chamber.js** - Two new tests: availability and private-network

The Gravity Chamber auto-simulates training sessions cycling through Vegeta, Goku, Trunks, and Piccolo with gradually increasing gravity and occasional emergency events.

Lab participants can use the Gravity Viewer to enter an FQDN and visually verify connectivity to the private chamber service.
