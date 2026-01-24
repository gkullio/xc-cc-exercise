# SSE Proxy Connections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace WebSocket browser→container communication with SSE/HTTP to work through UDF proxy that doesn't support WebSocket upgrades.

**Architecture:** Both scouter-app and gravity-viewer will expose HTTP/SSE endpoints for browser communication. The container services maintain their existing outbound connections (HTTP for scouter tests, WebSocket for gravity-chamber). Browser connects via EventSource (SSE) for streaming or HTTP POST for request/response.

**Tech Stack:** Express.js, Server-Sent Events (SSE), existing WebSocket client (ws) for outbound connections only.

---

## Overview

Current flow (broken through UDF):
```
Browser --WebSocket--> UDF Proxy --X--> Container --WebSocket--> Target
```

New flow (works through UDF):
```
Browser --HTTP/SSE--> UDF Proxy --HTTP--> Container --WebSocket--> Target
```

---

## Task 1: Gravity-Viewer SSE Endpoint

**Files:**
- Modify: `gravity-viewer/server.js`

**Step 1: Add SSE endpoint for chamber streaming**

Add this endpoint after the health check route:

```javascript
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
```

**Step 2: Remove WebSocket server code**

Remove or comment out these lines:
- Line 43: `const wss = new WebSocketServer({ server, path: '/ws/chamber' });`
- Lines 45-162: The entire `wss.on('connection', ...)` block
- Line 167: Update console.log to say 'SSE endpoint' instead of 'WebSocket proxy'

**Step 3: Clean up imports**

Change line 4 from:
```javascript
const { WebSocketServer, WebSocket } = require('ws');
```
to:
```javascript
const { WebSocket } = require('ws');
```

**Step 4: Simplify server creation**

Change line 42 from:
```javascript
const server = http.createServer(app);
```
and line 164 from:
```javascript
server.listen(PORT, () => {
```
to just use Express directly:
```javascript
app.listen(PORT, () => {
```

Remove line 2: `const http = require('http');`

**Step 5: Test locally**

Run: `cd gravity-viewer && npm start`

In another terminal:
```bash
curl -N "http://localhost:3002/api/chamber/stream?fqdn=localhost:3003"
```

Expected: SSE stream with `data: {"type":"status","status":"connecting"}` followed by error (since no chamber running).

**Step 6: Commit**

```bash
git add gravity-viewer/server.js
git commit -m "feat(gravity-viewer): replace WebSocket with SSE for browser connection"
```

---

## Task 2: Gravity-Viewer Client SSE

**Files:**
- Modify: `gravity-viewer/public/js/viewer.js`

**Step 1: Replace WebSocket client with EventSource**

Replace the entire file with:

```javascript
// Gravity Chamber Viewer - SSE Client

let eventSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;
let currentFqdn = '';

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

  currentFqdn = fqdn;
  connect(fqdn);
}

function connect(fqdn) {
  // Close existing connection
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  setStatus('connecting');
  connectBtn.disabled = true;
  connectBtn.textContent = 'CONNECTING...';

  // Build SSE URL - use current page's base path
  const basePath = window.location.pathname.replace(/\/$/, '');
  const sseUrl = `${basePath}/api/chamber/stream?fqdn=${encodeURIComponent(fqdn)}`;

  console.log('Connecting to SSE:', sseUrl);

  eventSource = new EventSource(sseUrl);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          handleStatusMessage(data);
          break;
        case 'state':
          updateDisplay(data);
          break;
        case 'error':
          showError(data.message);
          disconnect();
          break;
        default:
          if (data.chamber) {
            updateDisplay(data);
          }
      }
    } catch (err) {
      console.error('Failed to parse SSE message:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE error:', err);

    if (eventSource.readyState === EventSource.CLOSED) {
      if (reconnectAttempts < MAX_RECONNECT && currentFqdn) {
        reconnectAttempts++;
        console.log(`Reconnecting (${reconnectAttempts}/${MAX_RECONNECT})...`);
        setStatus('connecting');
        setTimeout(() => connect(currentFqdn), 2000);
      } else {
        showError('Connection lost. Please try again.');
        resetConnection();
      }
    }
  };
}

function handleStatusMessage(data) {
  switch (data.status) {
    case 'connecting':
      setStatus('connecting');
      break;
    case 'connected':
      console.log('Connected to gravity chamber via SSE');
      setStatus('connected');
      reconnectAttempts = 0;
      connectBtn.textContent = 'DISCONNECT';
      connectBtn.disabled = false;
      connectBtn.onclick = disconnect;
      break;
    case 'disconnected':
      console.log('Disconnected from chamber:', data.reason);
      resetConnection();
      break;
  }
}

function disconnect() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
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

  if (!chamber) return;

  gravityValue.textContent = chamber.gravityLevel;

  const percentage = chamber.gravityLevel / 500;
  const circumference = 534;
  const offset = circumference - (percentage * circumference);
  gaugeFill.style.strokeDashoffset = offset;

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

  chamberStatus.textContent = chamber.status.toUpperCase();
  chamberStatus.className = 'info-value status-value ' + chamber.status;

  if (session) {
    sessionUser.textContent = session.user || '---';
    sessionTime.textContent = session.user ? formatTime(session.duration) : '--:--';
    sessionTarget.textContent = session.user ? formatTime(session.targetDuration) : '--:--';
  }

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

**Step 2: Test in browser**

Open `http://localhost:3002` and check browser console for SSE connection.

**Step 3: Commit**

```bash
git add gravity-viewer/public/js/viewer.js
git commit -m "feat(gravity-viewer): update client to use SSE instead of WebSocket"
```

---

## Task 3: Scouter-App SSE Endpoint

**Files:**
- Modify: `scouter-app/server.js`
- Modify: `scouter-app/lib/runner.js`

**Step 1: Add SSE endpoint to server.js**

Add after the health check:

```javascript
// SSE endpoint for scan streaming
app.get('/api/scan/stream', async (req, res) => {
  const { target, fqdn, tests } = req.query;

  if (!target || !fqdn || !tests) {
    return res.status(400).json({ error: 'Missing required parameters: target, fqdn, tests' });
  }

  const testList = tests.split(',');

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  console.log(`SSE scan starting for ${target}: ${fqdn}`);

  // Create a send function that writes to SSE
  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await runTests(sendEvent, target, fqdn, testList);
  } catch (error) {
    sendEvent({ type: 'error', message: error.message });
  }

  res.end();
});
```

**Step 2: Update runner.js to accept callback instead of WebSocket**

Change the `runTests` function signature and all `ws.send()` calls to use a callback:

```javascript
/**
 * Run tests for a target and stream results via callback
 */
async function runTests(sendEvent, target, fqdn, tests) {
  const suite = testSuites[target];
  if (!suite) {
    sendEvent({
      type: 'error',
      target: target,
      message: `Unknown target: ${target}`
    });
    return;
  }

  // Ensure HTTPS protocol
  let baseUrl = fqdn;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  let totalPowerLevel = 0;
  let maxPossible = 0;

  for (const testName of tests) {
    const testFn = suite[testName];
    if (!testFn) {
      sendEvent({
        type: 'error',
        target: target,
        message: `Unknown test: ${testName}`
      });
      continue;
    }

    // Send test start
    sendEvent({
      type: 'test-start',
      target: target,
      test: testName,
      name: getTestDisplayName(testName)
    });

    // Run test
    const sendUpdate = (update) => {
      console.log(`[${target}/${testName}] ${update.phase}`);
    };

    try {
      const result = await testFn(baseUrl, sendUpdate);
      result.target = target;
      totalPowerLevel += result.powerLevel;
      maxPossible += getMaxPowerLevel(testName);

      sendEvent({
        type: 'test-result',
        ...result
      });
    } catch (error) {
      sendEvent({
        type: 'test-result',
        target: target,
        test: testName,
        name: getTestDisplayName(testName),
        status: 'fail',
        powerLevel: 0,
        details: [{ phase: 'Error', result: error.message }],
        debug: { error: error.stack }
      });
    }
  }

  // Send scan complete
  sendEvent({
    type: 'scan-complete',
    target: target,
    totalPowerLevel: totalPowerLevel,
    maxPossible: maxPossible,
    message: totalPowerLevel > 9000 ? "IT'S OVER 9000!" : null
  });
}
```

**Step 3: Remove WebSocket server from scouter-app/server.js**

Remove:
- Line 2: `const { WebSocketServer } = require('ws');`
- Lines 22-24: `const server = http.createServer(app);` and `const wss = new WebSocketServer({ server, path: '/ws/scan' });`
- Lines 26-49: The entire `wss.on('connection', ...)` block
- Change `server.listen` to `app.listen`

**Step 4: Test locally**

```bash
cd scouter-app && npm start
```

Then:
```bash
curl -N "http://localhost:4000/api/scan/stream?target=radar&fqdn=example.com&tests=rate-limiting,oas-validation"
```

**Step 5: Commit**

```bash
git add scouter-app/server.js scouter-app/lib/runner.js
git commit -m "feat(scouter-app): replace WebSocket with SSE for scan streaming"
```

---

## Task 4: Scouter Client SSE

**Files:**
- Modify: `capsule-info/scouter.js`

**Step 1: Replace WebSocket with EventSource**

Update the `connectAndScan` method:

```javascript
connectAndScan(target, fqdn, tests) {
  // Build SSE URL with query params
  const params = new URLSearchParams({
    target: target,
    fqdn: fqdn,
    tests: tests.join(',')
  });
  const sseUrl = `/ws/scan/stream?${params}`;  // Goes through nginx proxy to scouter-app

  console.log(`Starting SSE scan for ${target}:`, sseUrl);

  const eventSource = new EventSource(sseUrl);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    this.handleMessage(data);

    // Close EventSource after scan completes
    if (data.type === 'scan-complete') {
      eventSource.close();
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    this.showError(target, 'Connection error - please try again');
    this.setScanning(target, false);
    eventSource.close();
  };
}
```

**Step 2: Commit**

```bash
git add capsule-info/scouter.js
git commit -m "feat(scouter): update client to use SSE instead of WebSocket"
```

---

## Task 5: Update Capsule-Info Nginx Proxy

**Files:**
- Modify: `capsule-info/Dockerfile`

**Step 1: Update nginx config to proxy SSE endpoint**

Change the `/ws/scan` location block to:

```nginx
location /ws/scan/stream {
    proxy_pass http://scouter-app:4000/api/scan/stream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400;
}
```

Note: Remove WebSocket upgrade headers since we're using SSE now.

**Step 2: Commit**

```bash
git add capsule-info/Dockerfile
git commit -m "feat(capsule-info): update nginx to proxy SSE instead of WebSocket"
```

---

## Task 6: Integration Testing

**Step 1: Build and test locally with Docker Compose**

```bash
docker compose build gravity-viewer scouter-app capsule-info
docker compose up -d
```

**Step 2: Test gravity-viewer**

1. Open `http://localhost:3002`
2. Enter `gravity-chamber:3003` as FQDN
3. Click CONNECT
4. Verify connection status and data streaming

**Step 3: Test scouter**

1. Open `http://localhost:8080/scouter.html`
2. Enter a target FQDN
3. Run a scan
4. Verify results stream in

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing fixes"
```

---

## Task 7: Final Cleanup

**Step 1: Remove ws dependency from gravity-viewer if possible**

Check if `ws` is still needed (it is - for outbound WebSocket to gravity-chamber).

**Step 2: Update package.json descriptions if needed**

**Step 3: Final commit and push**

```bash
git push -u origin feature/sse-proxy-connections
```

---

## Summary

After completing all tasks:

| Component | Browser → Container | Container → Target |
|-----------|--------------------|--------------------|
| gravity-viewer | SSE `/api/chamber/stream` | WebSocket to chamber |
| scouter-app | SSE `/api/scan/stream` | HTTP to targets |
| capsule-info | Proxies SSE to scouter | N/A |

This removes all WebSocket requirements for browser→container communication, allowing the apps to work through proxies that don't support WebSocket upgrades.
