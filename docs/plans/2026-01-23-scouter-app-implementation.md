# Scouter App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based testing tool that validates F5 XC configurations by running security tests against the Dragon Radar API and Capsule Store applications.

**Architecture:** Node.js/Express server with WebSocket for real-time test streaming. Single-page frontend with two panels (one per target app). Tests run server-side, results stream to client as they complete.

**Tech Stack:** Node.js 20, Express, ws (WebSocket), axios (HTTP client), vanilla HTML/CSS/JS frontend

---

## Task 1: Project Scaffolding

**Files:**
- Create: `scouter-app/package.json`
- Create: `scouter-app/server.js`
- Create: `scouter-app/Dockerfile`

**Step 1: Create package.json**

Create file `scouter-app/package.json`:

```json
{
  "name": "scouter-app",
  "version": "1.0.0",
  "description": "F5 XC Configuration Validator - Scanning Security Power Levels",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0",
    "axios": "^1.6.5"
  }
}
```

**Step 2: Create basic server.js**

Create file `scouter-app/server.js`:

```javascript
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

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

  ws.on('message', (message) => {
    // Will be implemented in Task 4
    console.log('Received scan request');
  });

  ws.on('close', () => {
    console.log('Scouter connection closed');
  });
});

server.listen(PORT, () => {
  console.log(`Scouter App operational on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/health');
  console.log('  WS  /ws/scan');
});
```

**Step 3: Create Dockerfile**

Create file `scouter-app/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
```

**Step 4: Run npm install and verify server starts**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && npm install && node server.js`
Expected: Server starts and shows "Scouter App operational on port 3002"
Stop with Ctrl+C after verification.

---

## Task 2: HTML Structure

**Files:**
- Create: `scouter-app/public/index.html`

**Step 1: Create the HTML file**

Create file `scouter-app/public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scouter App - F5 XC Configuration Validator</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="header-content">
            <div class="logo">
                <div class="scouter-icon">
                    <div class="scouter-visor"></div>
                </div>
                <div class="logo-text">
                    <h1>SCOUTER</h1>
                    <span class="tagline">Scanning Security Power Levels...</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content - Two Panels -->
    <main class="panels">
        <!-- Dragon Radar API Panel -->
        <section class="panel" id="radar-panel">
            <div class="panel-header">
                <div class="panel-icon radar-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="6"/>
                        <circle cx="12" cy="12" r="2"/>
                        <line x1="12" y1="2" x2="12" y2="6"/>
                        <line x1="12" y1="18" x2="12" y2="22"/>
                        <line x1="2" y1="12" x2="6" y2="12"/>
                        <line x1="18" y1="12" x2="22" y2="12"/>
                    </svg>
                </div>
                <h2>Dragon Radar API</h2>
            </div>

            <div class="panel-body">
                <div class="input-group">
                    <label for="radar-fqdn">Target FQDN</label>
                    <input type="text" id="radar-fqdn" placeholder="radar.student01.f5demo.com">
                </div>

                <div class="test-options">
                    <label class="test-option">
                        <input type="checkbox" name="radar-test" value="rate-limiting" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">Rate Limiting</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="radar-test" value="caching" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">Caching Strategy</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="radar-test" value="performance" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">Global Performance</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="radar-test" value="security" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">API Security</span>
                    </label>
                </div>

                <button class="scan-button" id="radar-scan" data-target="radar">
                    <span class="button-icon">&#9889;</span>
                    SCAN POWER LEVEL
                </button>

                <div class="results-area" id="radar-results">
                    <div class="results-placeholder">
                        Select tests and enter FQDN to begin scanning
                    </div>
                </div>

                <div class="power-level-display" id="radar-power-level" style="display: none;">
                    <span class="power-label">POWER LEVEL</span>
                    <span class="power-value">0</span>
                </div>
            </div>
        </section>

        <!-- Capsule Store Panel -->
        <section class="panel" id="store-panel">
            <div class="panel-header">
                <div class="panel-icon store-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                </div>
                <h2>Capsule Store</h2>
            </div>

            <div class="panel-body">
                <div class="input-group">
                    <label for="store-fqdn">Target FQDN</label>
                    <input type="text" id="store-fqdn" placeholder="store.student01.f5demo.com">
                </div>

                <div class="test-options">
                    <label class="test-option">
                        <input type="checkbox" name="store-test" value="waf" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">WAF Protection</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="store-test" value="bot" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">Bot Protection</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="store-test" value="ddos" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">DDoS Mitigation</span>
                    </label>
                    <label class="test-option">
                        <input type="checkbox" name="store-test" value="pci" checked>
                        <span class="checkbox-custom"></span>
                        <span class="test-name">PCI Compliance</span>
                    </label>
                </div>

                <button class="scan-button" id="store-scan" data-target="store">
                    <span class="button-icon">&#9889;</span>
                    SCAN POWER LEVEL
                </button>

                <div class="results-area" id="store-results">
                    <div class="results-placeholder">
                        Select tests and enter FQDN to begin scanning
                    </div>
                </div>

                <div class="power-level-display" id="store-power-level" style="display: none;">
                    <span class="power-label">POWER LEVEL</span>
                    <span class="power-value">0</span>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <p>Capsule Corporation Security Division</p>
        <p class="footer-sub">"It's over 9000!" - Vegeta, probably</p>
    </footer>

    <script src="js/app.js"></script>
</body>
</html>
```

**Step 2: Verify file loads**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node server.js`
Open browser to http://localhost:3002 - should see unstyled HTML structure
Stop server after verification.

---

## Task 3: CSS Styling

**Files:**
- Create: `scouter-app/public/css/style.css`

**Step 1: Create the CSS file**

Create file `scouter-app/public/css/style.css`:

```css
/* ===================================
   Scouter App - DBZ-Inspired Theme
   =================================== */

/* CSS Custom Properties - matching capsule-info */
:root {
    --color-primary: #FF6B35;
    --color-primary-glow: rgba(255, 107, 53, 0.5);
    --color-secondary: #1E90FF;
    --color-secondary-glow: rgba(30, 144, 255, 0.4);
    --color-scouter-red: #E53E3E;
    --color-scouter-glow: rgba(229, 62, 62, 0.6);
    --color-ki-yellow: #FFD93D;
    --color-ki-gold: #F4A020;
    --color-success: #38A169;
    --color-success-glow: rgba(56, 161, 105, 0.4);
    --color-bg-dark: #0D1B2A;
    --color-bg-card: #1B263B;
    --color-bg-card-hover: #243447;
    --color-text-primary: #FFFFFF;
    --color-text-secondary: #A0AEC0;
    --color-text-muted: #718096;
    --color-border: rgba(255, 255, 255, 0.1);

    --font-heading: 'Rajdhani', sans-serif;
    --font-body: 'Inter', sans-serif;
    --font-mono: 'Share Tech Mono', monospace;

    --card-clip: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
}

/* Keyframe Animations */
@keyframes scanPulse {
    0%, 100% {
        box-shadow: 0 0 20px var(--color-scouter-glow);
        opacity: 1;
    }
    50% {
        box-shadow: 0 0 40px var(--color-scouter-glow), 0 0 60px var(--color-primary-glow);
        opacity: 0.8;
    }
}

@keyframes powerUp {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

@keyframes scanLine {
    0% { transform: translateY(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateY(100%); opacity: 0; }
}

@keyframes resultSlideIn {
    0% { transform: translateX(-20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
}

@keyframes numberTick {
    0% { transform: translateY(0); }
    10% { transform: translateY(-2px); }
    20% { transform: translateY(0); }
}

/* Reset & Base */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
}

body {
    font-family: var(--font-body);
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* ===================================
   Header
   =================================== */
.header {
    background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-dark) 100%);
    border-bottom: 1px solid var(--color-border);
    padding: 1.5rem 2rem;
}

.header-content {
    max-width: 1400px;
    margin: 0 auto;
}

.logo {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.scouter-icon {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #333 0%, #1a1a1a 100%);
    border-radius: 50%;
    position: relative;
    border: 3px solid #444;
    display: flex;
    align-items: center;
    justify-content: center;
}

.scouter-visor {
    width: 30px;
    height: 20px;
    background: linear-gradient(135deg, var(--color-scouter-red) 0%, #ff4444 100%);
    border-radius: 2px 10px 10px 2px;
    position: relative;
    box-shadow: 0 0 20px var(--color-scouter-glow), inset 0 0 10px rgba(0,0,0,0.3);
}

.scouter-visor::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 8px;
    height: 8px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
}

.logo-text h1 {
    font-family: var(--font-heading);
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--color-text-primary);
    text-shadow: 0 0 20px var(--color-scouter-glow);
}

.tagline {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--color-text-muted);
    letter-spacing: 0.05em;
}

/* ===================================
   Panels Layout
   =================================== */
.panels {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
}

@media (max-width: 900px) {
    .panels {
        grid-template-columns: 1fr;
    }
}

.panel {
    background: var(--color-bg-card);
    clip-path: var(--card-clip);
    padding: 0;
    display: flex;
    flex-direction: column;
}

.panel-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
    background: linear-gradient(135deg, var(--color-bg-card-hover) 0%, var(--color-bg-card) 100%);
}

.panel-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.panel-icon svg {
    width: 32px;
    height: 32px;
}

.radar-icon svg {
    stroke: var(--color-ki-gold);
}

.store-icon svg {
    stroke: var(--color-secondary);
}

.panel-header h2 {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.panel-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex: 1;
}

/* ===================================
   Form Elements
   =================================== */
.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.input-group label {
    font-family: var(--font-heading);
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.input-group input {
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.75rem 1rem;
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--color-text-primary);
    transition: border-color 0.2s, box-shadow 0.2s;
}

.input-group input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-glow);
}

.input-group input::placeholder {
    color: var(--color-text-muted);
}

/* ===================================
   Test Options (Checkboxes)
   =================================== */
.test-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.test-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
}

.test-option:hover {
    background: var(--color-bg-card-hover);
}

.test-option input[type="checkbox"] {
    display: none;
}

.checkbox-custom {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-radius: 4px;
    position: relative;
    transition: all 0.2s;
    background: var(--color-bg-dark);
}

.test-option input:checked + .checkbox-custom {
    background: var(--color-primary);
    border-color: var(--color-primary);
}

.test-option input:checked + .checkbox-custom::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 6px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.test-name {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--color-text-primary);
}

/* ===================================
   Scan Button
   =================================== */
.scan-button {
    background: linear-gradient(135deg, var(--color-scouter-red) 0%, #c53030 100%);
    border: none;
    border-radius: 4px;
    padding: 1rem 2rem;
    font-family: var(--font-heading);
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: all 0.2s;
    box-shadow: 0 4px 15px var(--color-scouter-glow);
}

.scan-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px var(--color-scouter-glow);
}

.scan-button:active:not(:disabled) {
    transform: translateY(0);
}

.scan-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.scan-button.scanning {
    animation: scanPulse 1s ease-in-out infinite;
}

.button-icon {
    font-size: 1.2rem;
}

/* ===================================
   Results Area
   =================================== */
.results-area {
    flex: 1;
    min-height: 200px;
    background: var(--color-bg-dark);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1rem;
    overflow-y: auto;
    position: relative;
}

.results-placeholder {
    color: var(--color-text-muted);
    text-align: center;
    padding: 2rem;
    font-family: var(--font-mono);
    font-size: 0.9rem;
}

/* Result Card */
.result-card {
    background: var(--color-bg-card);
    border-radius: 4px;
    margin-bottom: 1rem;
    overflow: hidden;
    animation: resultSlideIn 0.3s ease-out;
    border-left: 4px solid var(--color-text-muted);
}

.result-card.pass {
    border-left-color: var(--color-success);
}

.result-card.fail {
    border-left-color: var(--color-scouter-red);
}

.result-card.running {
    border-left-color: var(--color-ki-gold);
}

.result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-bg-card-hover);
}

.result-name {
    font-family: var(--font-heading);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.result-status {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    text-transform: uppercase;
}

.result-status.pass {
    background: var(--color-success);
    color: white;
}

.result-status.fail {
    background: var(--color-scouter-red);
    color: white;
}

.result-status.running {
    background: var(--color-ki-gold);
    color: var(--color-bg-dark);
}

.result-power {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--color-ki-gold);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.result-details {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border);
}

.result-detail-item {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    padding: 0.25rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.result-detail-item::before {
    content: '\25B8';
    color: var(--color-text-muted);
}

.result-detail-item.success::before {
    color: var(--color-success);
}

.result-detail-item.blocked::before {
    color: var(--color-scouter-red);
}

/* Debug Toggle */
.debug-toggle {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    width: 100%;
    text-align: left;
    border-top: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: color 0.2s;
}

.debug-toggle:hover {
    color: var(--color-text-secondary);
}

.debug-content {
    display: none;
    padding: 1rem;
    background: var(--color-bg-dark);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-muted);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
}

.debug-content.visible {
    display: block;
}

/* ===================================
   Power Level Display
   =================================== */
.power-level-display {
    background: linear-gradient(135deg, var(--color-bg-card-hover) 0%, var(--color-bg-card) 100%);
    border: 2px solid var(--color-ki-gold);
    border-radius: 4px;
    padding: 1.5rem;
    text-align: center;
    box-shadow: 0 0 30px rgba(244, 160, 32, 0.3);
}

.power-label {
    display: block;
    font-family: var(--font-heading);
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.5rem;
}

.power-value {
    font-family: var(--font-mono);
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-ki-gold);
    text-shadow: 0 0 30px var(--color-ki-gold);
    animation: numberTick 0.1s ease-out;
}

.power-level-display.over-9000 .power-value {
    color: var(--color-primary);
    text-shadow: 0 0 30px var(--color-primary-glow), 0 0 60px var(--color-ki-yellow);
    animation: powerUp 0.5s ease-in-out infinite;
}

.power-level-display .power-message {
    font-family: var(--font-heading);
    font-size: 1.2rem;
    color: var(--color-primary);
    margin-top: 0.5rem;
    text-transform: uppercase;
}

/* ===================================
   Footer
   =================================== */
.footer {
    background: var(--color-bg-card);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem;
    text-align: center;
}

.footer p {
    font-family: var(--font-heading);
    font-size: 0.9rem;
    color: var(--color-text-secondary);
}

.footer-sub {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-top: 0.5rem;
}

/* ===================================
   Scanning Animation Overlay
   =================================== */
.panel.scanning::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--color-scouter-red), transparent);
    animation: scanLine 1.5s ease-in-out infinite;
    z-index: 10;
}

.panel {
    position: relative;
    overflow: hidden;
}
```

**Step 2: Verify styling**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node server.js`
Open browser to http://localhost:3002 - should see styled two-panel layout
Stop server after verification.

---

## Task 4: Frontend JavaScript

**Files:**
- Create: `scouter-app/public/js/app.js`

**Step 1: Create the JavaScript file**

Create file `scouter-app/public/js/app.js`:

```javascript
// Scouter App - Frontend JavaScript

class ScouterApp {
  constructor() {
    this.ws = null;
    this.activeScans = new Set();
    this.initEventListeners();
  }

  initEventListeners() {
    // Radar scan button
    document.getElementById('radar-scan').addEventListener('click', () => {
      this.startScan('radar');
    });

    // Store scan button
    document.getElementById('store-scan').addEventListener('click', () => {
      this.startScan('store');
    });
  }

  getSelectedTests(target) {
    const checkboxes = document.querySelectorAll(`input[name="${target}-test"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
  }

  getFqdn(target) {
    const input = document.getElementById(`${target}-fqdn`);
    return input.value.trim();
  }

  startScan(target) {
    const fqdn = this.getFqdn(target);
    const tests = this.getSelectedTests(target);

    // Validation
    if (!fqdn) {
      this.showError(target, 'Please enter a target FQDN');
      return;
    }

    if (tests.length === 0) {
      this.showError(target, 'Please select at least one test');
      return;
    }

    // Check if already scanning this target
    if (this.activeScans.has(target)) {
      return;
    }

    // Clear previous results
    this.clearResults(target);

    // Start scanning state
    this.setScanning(target, true);

    // Connect WebSocket and send scan request
    this.connectAndScan(target, fqdn, tests);
  }

  connectAndScan(target, fqdn, tests) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/scan`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected for ${target} scan`);
      ws.send(JSON.stringify({
        action: 'scan',
        target: target,
        fqdn: fqdn,
        tests: tests
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.showError(target, 'Connection error - please try again');
      this.setScanning(target, false);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for ${target}`);
      this.setScanning(target, false);
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case 'test-start':
        this.showTestStart(data);
        break;
      case 'test-result':
        this.showTestResult(data);
        break;
      case 'scan-complete':
        this.showScanComplete(data);
        break;
      case 'error':
        this.showError(data.target, data.message);
        break;
    }
  }

  showTestStart(data) {
    const resultsArea = document.getElementById(`${data.target}-results`);

    // Remove placeholder if exists
    const placeholder = resultsArea.querySelector('.results-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    // Add running result card
    const card = document.createElement('div');
    card.className = 'result-card running';
    card.id = `result-${data.target}-${data.test}`;
    card.innerHTML = `
      <div class="result-header">
        <span class="result-name">${data.name}</span>
        <span class="result-status running">Scanning...</span>
      </div>
    `;
    resultsArea.appendChild(card);
  }

  showTestResult(data) {
    const card = document.getElementById(`result-${data.target}-${data.test}`);
    if (!card) return;

    const statusClass = data.status === 'pass' ? 'pass' : 'fail';
    card.className = `result-card ${statusClass}`;

    // Build details HTML
    let detailsHtml = '';
    if (data.details && data.details.length > 0) {
      detailsHtml = `
        <div class="result-details">
          ${data.details.map(d => {
            const itemClass = d.result.includes('Blocked') ? 'blocked' :
                             d.result.includes('OK') || d.result.includes('✓') ? 'success' : '';
            return `<div class="result-detail-item ${itemClass}">${d.phase}: ${d.result}</div>`;
          }).join('')}
        </div>
      `;
    }

    // Build debug HTML
    let debugHtml = '';
    if (data.debug) {
      debugHtml = `
        <button class="debug-toggle" onclick="this.nextElementSibling.classList.toggle('visible')">
          ▸ Show Debug Data
        </button>
        <div class="debug-content">${JSON.stringify(data.debug, null, 2)}</div>
      `;
    }

    card.innerHTML = `
      <div class="result-header">
        <span class="result-name">${data.name || data.test}</span>
        <span class="result-status ${statusClass}">${data.status.toUpperCase()}</span>
      </div>
      <div class="result-power">Power Level: ${data.powerLevel.toLocaleString()}</div>
      ${detailsHtml}
      ${debugHtml}
    `;
  }

  showScanComplete(data) {
    const powerDisplay = document.getElementById(`${data.target}-power-level`);
    const powerValue = powerDisplay.querySelector('.power-value');

    powerDisplay.style.display = 'block';

    // Animate power level counting up
    this.animatePowerLevel(powerValue, data.totalPowerLevel, data.target);

    // Add message if over 9000
    if (data.totalPowerLevel > 9000) {
      powerDisplay.classList.add('over-9000');
      const existingMsg = powerDisplay.querySelector('.power-message');
      if (!existingMsg) {
        const msg = document.createElement('div');
        msg.className = 'power-message';
        msg.textContent = data.message || "IT'S OVER 9000!";
        powerDisplay.appendChild(msg);
      }
    } else {
      powerDisplay.classList.remove('over-9000');
    }
  }

  animatePowerLevel(element, targetValue, target) {
    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOut);

      element.textContent = currentValue.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  showError(target, message) {
    const resultsArea = document.getElementById(`${target}-results`);
    resultsArea.innerHTML = `
      <div class="result-card fail">
        <div class="result-header">
          <span class="result-name">Error</span>
          <span class="result-status fail">FAILED</span>
        </div>
        <div class="result-details">
          <div class="result-detail-item">${message}</div>
        </div>
      </div>
    `;
    this.setScanning(target, false);
  }

  clearResults(target) {
    const resultsArea = document.getElementById(`${target}-results`);
    resultsArea.innerHTML = '';

    const powerDisplay = document.getElementById(`${target}-power-level`);
    powerDisplay.style.display = 'none';
    powerDisplay.classList.remove('over-9000');
    const msg = powerDisplay.querySelector('.power-message');
    if (msg) msg.remove();
  }

  setScanning(target, isScanning) {
    const button = document.getElementById(`${target}-scan`);
    const panel = document.getElementById(`${target}-panel`);

    if (isScanning) {
      this.activeScans.add(target);
      button.disabled = true;
      button.classList.add('scanning');
      panel.classList.add('scanning');
    } else {
      this.activeScans.delete(target);
      button.disabled = false;
      button.classList.remove('scanning');
      panel.classList.remove('scanning');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.scouter = new ScouterApp();
});
```

**Step 2: Verify JavaScript loads**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node server.js`
Open browser to http://localhost:3002, open console, type `scouter` - should see ScouterApp object
Stop server after verification.

---

## Task 5: Dragon Radar API Tests Implementation

**Files:**
- Create: `scouter-app/lib/tests/radar.js`

**Step 1: Create the radar tests file**

Create file `scouter-app/lib/tests/radar.js`:

```javascript
const axios = require('axios');

// Test configurations
const RATE_LIMIT_REQUESTS = 50;
const RATE_LIMIT_WINDOW_MS = 2000;

/**
 * Run rate limiting test
 */
async function testRateLimiting(baseUrl, sendUpdate) {
  const results = {
    name: 'Rate Limiting',
    test: 'rate-limiting',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status,
      headers: normalResponse.headers
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - Rapid requests
    sendUpdate({ phase: 'Sending rapid requests to trigger rate limiting...' });

    const rapidPromises = [];
    for (let i = 0; i < RATE_LIMIT_REQUESTS; i++) {
      rapidPromises.push(
        axios.get(`${baseUrl}/api/radar/scan`, {
          timeout: 10000,
          validateStatus: () => true
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    // Wait for rate limit window
    await new Promise(resolve => setTimeout(resolve, 100));

    const rapidResponses = await Promise.all(rapidPromises);
    const blocked = rapidResponses.filter(r => r.status === 429).length;
    const succeeded = rapidResponses.filter(r => r.status === 200).length;

    results.debug.responses.push({
      phase: 'attack',
      total: rapidResponses.length,
      blocked: blocked,
      succeeded: succeeded
    });

    if (blocked > 0) {
      results.details.push({ phase: 'Attack', result: `${blocked}/${RATE_LIMIT_REQUESTS} requests blocked (429)` });
      results.powerLevel += Math.min(blocked * 50, 3000);
      results.status = 'pass';
    } else {
      results.details.push({ phase: 'Attack', result: `No requests blocked - rate limiting not configured` });
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run caching strategy test
 */
async function testCaching(baseUrl, sendUpdate) {
  const results = {
    name: 'Caching Strategy',
    test: 'caching',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: First request (cache miss expected)
    sendUpdate({ phase: 'Sending first request (cache miss)...' });
    const start1 = Date.now();
    const response1 = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });
    const time1 = Date.now() - start1;

    const cacheHeaders1 = {
      'x-cache': response1.headers['x-cache'],
      'age': response1.headers['age'],
      'cache-control': response1.headers['cache-control'],
      'x-cache-status': response1.headers['x-cache-status']
    };

    results.debug.responses.push({
      phase: 'first-request',
      status: response1.status,
      timing: time1,
      cacheHeaders: cacheHeaders1
    });

    // Phase 2: Second request (cache hit expected)
    sendUpdate({ phase: 'Sending second request (cache hit expected)...' });
    const start2 = Date.now();
    const response2 = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });
    const time2 = Date.now() - start2;

    const cacheHeaders2 = {
      'x-cache': response2.headers['x-cache'],
      'age': response2.headers['age'],
      'cache-control': response2.headers['cache-control'],
      'x-cache-status': response2.headers['x-cache-status']
    };

    results.debug.responses.push({
      phase: 'second-request',
      status: response2.status,
      timing: time2,
      cacheHeaders: cacheHeaders2
    });

    // Check for cache headers
    const hasCacheHeaders = cacheHeaders2['x-cache'] || cacheHeaders2['age'] || cacheHeaders2['x-cache-status'];
    const isCacheHit = (cacheHeaders2['x-cache'] || '').toLowerCase().includes('hit') ||
                       (cacheHeaders2['x-cache-status'] || '').toLowerCase().includes('hit');
    const timingImproved = time2 < time1;

    results.details.push({
      phase: 'First request',
      result: `${time1}ms${cacheHeaders1['x-cache'] ? ` (X-Cache: ${cacheHeaders1['x-cache']})` : ''}`
    });
    results.details.push({
      phase: 'Second request',
      result: `${time2}ms${cacheHeaders2['x-cache'] ? ` (X-Cache: ${cacheHeaders2['x-cache']})` : ''}`
    });

    if (hasCacheHeaders) {
      results.powerLevel = 1000;
      results.details.push({ phase: 'Cache headers', result: '✓ Present' });
    } else {
      results.details.push({ phase: 'Cache headers', result: 'Not detected' });
    }

    if (isCacheHit) {
      results.powerLevel += 1500;
      results.status = 'pass';
    }

    if (timingImproved && time1 - time2 > 10) {
      const improvement = Math.round(((time1 - time2) / time1) * 100);
      results.powerLevel += Math.min(improvement * 10, 1500);
      results.details.push({ phase: 'Performance', result: `✓ ${improvement}% faster on second request` });
      if (!isCacheHit) results.status = 'pass';
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run global performance test
 */
async function testPerformance(baseUrl, sendUpdate) {
  const results = {
    name: 'Global Performance',
    test: 'performance',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    sendUpdate({ phase: 'Measuring response time...' });

    // Take multiple measurements
    const timings = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      const response = await axios.get(`${baseUrl}/api/radar/scan`, {
        timeout: 10000,
        validateStatus: () => true
      });
      const elapsed = Date.now() - start;
      timings.push(elapsed);

      results.debug.responses.push({
        attempt: i + 1,
        status: response.status,
        timing: elapsed,
        headers: {
          'x-response-time': response.headers['x-response-time'],
          'x-edge-location': response.headers['x-edge-location'],
          'server': response.headers['server']
        }
      });
    }

    const avgTime = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    const minTime = Math.min(...timings);

    results.details.push({ phase: 'Average latency', result: `${avgTime}ms` });
    results.details.push({ phase: 'Best latency', result: `${minTime}ms` });

    // Score based on latency
    if (avgTime < 50) {
      results.powerLevel = 3000;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Excellent (<50ms)' });
    } else if (avgTime < 100) {
      results.powerLevel = 2500;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Good (<100ms)' });
    } else if (avgTime < 150) {
      results.powerLevel = 2000;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: '✓ Acceptable (<150ms)' });
    } else if (avgTime < 200) {
      results.powerLevel = 1500;
      results.status = 'pass';
      results.details.push({ phase: 'Rating', result: 'Marginal (<200ms)' });
    } else {
      results.powerLevel = 500;
      results.details.push({ phase: 'Rating', result: 'Poor (>200ms)' });
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run API security test
 */
async function testSecurity(baseUrl, sendUpdate) {
  const results = {
    name: 'API Security',
    test: 'security',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - SQL injection in path
    sendUpdate({ phase: 'Testing SQL injection protection...' });
    const sqlResponse = await axios.get(`${baseUrl}/api/radar/ball/1' OR '1'='1`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sql-injection',
      url: `/api/radar/ball/1' OR '1'='1`,
      status: sqlResponse.status
    });

    if (sqlResponse.status === 403 || sqlResponse.status === 400) {
      results.details.push({ phase: 'SQL Injection', result: `Blocked (${sqlResponse.status})` });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'SQL Injection', result: `Not blocked (${sqlResponse.status})` });
    }

    // Phase 3: Attack - Path traversal
    sendUpdate({ phase: 'Testing path traversal protection...' });
    const pathResponse = await axios.get(`${baseUrl}/api/radar/../../etc/passwd`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'path-traversal',
      url: `/api/radar/../../etc/passwd`,
      status: pathResponse.status
    });

    if (pathResponse.status === 403 || pathResponse.status === 400) {
      results.details.push({ phase: 'Path Traversal', result: `Blocked (${pathResponse.status})` });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'Path Traversal', result: `Not blocked (${pathResponse.status})` });
    }

    // Phase 4: Attack - Oversized header
    sendUpdate({ phase: 'Testing oversized header protection...' });
    try {
      const oversizedResponse = await axios.get(`${baseUrl}/api/radar/scan`, {
        timeout: 10000,
        validateStatus: () => true,
        headers: {
          'X-Custom-Header': 'A'.repeat(10000)
        }
      });

      results.debug.responses.push({
        phase: 'oversized-header',
        status: oversizedResponse.status
      });

      if (oversizedResponse.status === 403 || oversizedResponse.status === 431) {
        results.details.push({ phase: 'Oversized Header', result: `Blocked (${oversizedResponse.status})` });
        results.powerLevel += 500;
      } else {
        results.details.push({ phase: 'Oversized Header', result: `Not blocked (${oversizedResponse.status})` });
      }
    } catch (err) {
      // Connection reset or similar might indicate blocking
      if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
        results.details.push({ phase: 'Oversized Header', result: 'Blocked (connection reset)' });
        results.powerLevel += 500;
      } else {
        results.details.push({ phase: 'Oversized Header', result: `Error: ${err.message}` });
      }
    }

    // Determine overall status
    if (results.powerLevel >= 2500) {
      results.status = 'pass';
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

module.exports = {
  'rate-limiting': testRateLimiting,
  'caching': testCaching,
  'performance': testPerformance,
  'security': testSecurity
};
```

**Step 2: Verify module loads**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node -e "const t = require('./lib/tests/radar'); console.log(Object.keys(t))"`
Expected: `[ 'rate-limiting', 'caching', 'performance', 'security' ]`

---

## Task 6: Capsule Store Tests Implementation

**Files:**
- Create: `scouter-app/lib/tests/store.js`

**Step 1: Create the store tests file**

Create file `scouter-app/lib/tests/store.js`:

```javascript
const axios = require('axios');

/**
 * Run WAF protection test
 */
async function testWaf(baseUrl, sendUpdate) {
  const results = {
    name: 'WAF Protection',
    test: 'waf',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - SQL injection
    sendUpdate({ phase: 'Testing SQL injection protection...' });
    const sqlResponse = await axios.get(`${baseUrl}/products?search=' OR '1'='1`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sql-injection',
      url: `/products?search=' OR '1'='1`,
      status: sqlResponse.status
    });

    if (sqlResponse.status === 403) {
      results.details.push({ phase: 'SQL Injection', result: 'Blocked (403)' });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'SQL Injection', result: `Not blocked (${sqlResponse.status})` });
    }

    // Phase 3: Attack - XSS
    sendUpdate({ phase: 'Testing XSS protection...' });
    const xssResponse = await axios.get(`${baseUrl}/products?search=<script>alert(1)</script>`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'xss',
      url: `/products?search=<script>alert(1)</script>`,
      status: xssResponse.status
    });

    if (xssResponse.status === 403) {
      results.details.push({ phase: 'XSS Attack', result: 'Blocked (403)' });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'XSS Attack', result: `Not blocked (${xssResponse.status})` });
    }

    // Phase 4: Attack - Path traversal
    sendUpdate({ phase: 'Testing path traversal protection...' });
    const pathResponse = await axios.get(`${baseUrl}/../../etc/passwd`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'path-traversal',
      url: `/../../etc/passwd`,
      status: pathResponse.status
    });

    if (pathResponse.status === 403 || pathResponse.status === 400) {
      results.details.push({ phase: 'Path Traversal', result: `Blocked (${pathResponse.status})` });
      results.powerLevel += 1000;
    } else {
      results.details.push({ phase: 'Path Traversal', result: `Not blocked (${pathResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 3000) {
      results.status = 'pass';
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run bot protection test
 */
async function testBot(baseUrl, sendUpdate) {
  const results = {
    name: 'Bot Protection',
    test: 'bot',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  try {
    // Phase 1: Verify normal request works (with browser-like headers)
    sendUpdate({ phase: 'Verifying normal request with browser headers...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    results.debug.responses.push({
      phase: 'verify',
      status: normalResponse.status
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Browser request succeeded' });
      results.powerLevel = 1000;
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Attack - Bad User-Agent
    sendUpdate({ phase: 'Testing bot User-Agent detection...' });
    const botResponse = await axios.get(`${baseUrl}/api/products`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'User-Agent': 'python-requests/2.25.1'
      }
    });

    results.debug.responses.push({
      phase: 'bad-user-agent',
      status: botResponse.status,
      headers: botResponse.headers
    });

    // Check for bot challenge (could be 403, 429, or redirect to challenge page)
    if (botResponse.status === 403 || botResponse.status === 429 ||
        (botResponse.headers['content-type'] || '').includes('text/html')) {
      results.details.push({ phase: 'Bot User-Agent', result: `Challenged/Blocked (${botResponse.status})` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Bot User-Agent', result: `Not detected (${botResponse.status})` });
    }

    // Phase 3: Attack - Rapid login attempts
    sendUpdate({ phase: 'Testing credential stuffing protection...' });
    const loginPromises = [];
    for (let i = 0; i < 10; i++) {
      loginPromises.push(
        axios.post(`${baseUrl}/api/auth/login`, {
          username: 'test' + i,
          password: 'wrongpassword'
        }, {
          timeout: 10000,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json'
          }
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    const loginResponses = await Promise.all(loginPromises);
    const blocked = loginResponses.filter(r => r.status === 429 || r.status === 403).length;
    const failed401 = loginResponses.filter(r => r.status === 401).length;

    results.debug.responses.push({
      phase: 'credential-stuffing',
      total: loginResponses.length,
      blocked: blocked,
      failed401: failed401
    });

    if (blocked > 0) {
      results.details.push({ phase: 'Credential Stuffing', result: `${blocked}/10 attempts blocked` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Credential Stuffing', result: 'Not rate limited' });
    }

    // Phase 4: Attack - No headers at all
    sendUpdate({ phase: 'Testing headerless request detection...' });
    const noHeaderResponse = await axios.get(`${baseUrl}/api/products`, {
      timeout: 10000,
      validateStatus: () => true,
      headers: {}
    });

    results.debug.responses.push({
      phase: 'no-headers',
      status: noHeaderResponse.status
    });

    if (noHeaderResponse.status === 403 || noHeaderResponse.status === 429) {
      results.details.push({ phase: 'Headerless Request', result: `Blocked (${noHeaderResponse.status})` });
      results.powerLevel += 700;
    } else {
      results.details.push({ phase: 'Headerless Request', result: `Not blocked (${noHeaderResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 2400) {
      results.status = 'pass';
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run DDoS mitigation test
 */
async function testDdos(baseUrl, sendUpdate) {
  const results = {
    name: 'DDoS Mitigation',
    test: 'ddos',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  const BURST_SIZE = 100;

  try {
    // Phase 1: Verify normal request works
    sendUpdate({ phase: 'Verifying normal request...' });
    const normalResponse = await axios.get(`${baseUrl}/`, {
      timeout: 10000,
      validateStatus: () => true
    });

    if (normalResponse.status === 200) {
      results.details.push({ phase: 'Verify', result: '200 OK - Normal request succeeded' });
    } else {
      results.details.push({ phase: 'Verify', result: `${normalResponse.status} - Normal request failed` });
      return results;
    }

    // Phase 2: Burst traffic
    sendUpdate({ phase: `Sending ${BURST_SIZE} concurrent requests...` });

    const burstPromises = [];
    const startTime = Date.now();

    for (let i = 0; i < BURST_SIZE; i++) {
      burstPromises.push(
        axios.get(`${baseUrl}/api/products`, {
          timeout: 30000,
          validateStatus: () => true
        }).catch(err => ({ status: 0, error: err.message }))
      );
    }

    const burstResponses = await Promise.all(burstPromises);
    const elapsed = Date.now() - startTime;

    const succeeded = burstResponses.filter(r => r.status === 200).length;
    const throttled = burstResponses.filter(r => r.status === 429).length;
    const errors = burstResponses.filter(r => r.status === 0 || r.status >= 500).length;

    results.debug.responses.push({
      phase: 'burst',
      total: BURST_SIZE,
      succeeded: succeeded,
      throttled: throttled,
      errors: errors,
      elapsed: elapsed
    });

    results.details.push({ phase: 'Total Requests', result: `${BURST_SIZE}` });
    results.details.push({ phase: 'Succeeded (200)', result: `${succeeded}` });
    results.details.push({ phase: 'Throttled (429)', result: `${throttled}` });
    results.details.push({ phase: 'Errors', result: `${errors}` });
    results.details.push({ phase: 'Time Elapsed', result: `${elapsed}ms` });

    // Scoring
    const throttledPercent = (throttled / BURST_SIZE) * 100;

    if (throttled === 0 && errors === 0) {
      // No protection detected
      results.powerLevel = 500;
      results.details.push({ phase: 'Assessment', result: 'No rate limiting detected' });
    } else if (throttledPercent >= 50) {
      // Strong protection
      results.powerLevel = 3000;
      results.status = 'pass';
      results.details.push({ phase: 'Assessment', result: `✓ Strong protection (${throttledPercent.toFixed(0)}% throttled)` });
    } else if (throttledPercent >= 20) {
      // Moderate protection
      results.powerLevel = 2000;
      results.status = 'pass';
      results.details.push({ phase: 'Assessment', result: `✓ Moderate protection (${throttledPercent.toFixed(0)}% throttled)` });
    } else if (throttled > 0 || errors > 0) {
      // Some protection
      results.powerLevel = 1500;
      results.details.push({ phase: 'Assessment', result: `Weak protection (${throttledPercent.toFixed(0)}% throttled)` });
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

/**
 * Run PCI compliance test
 */
async function testPci(baseUrl, sendUpdate) {
  const results = {
    name: 'PCI Compliance',
    test: 'pci',
    status: 'fail',
    powerLevel: 0,
    details: [],
    debug: { requests: [], responses: [] }
  };

  const requiredHeaders = [
    { name: 'X-Frame-Options', expected: ['DENY', 'SAMEORIGIN'] },
    { name: 'X-Content-Type-Options', expected: ['nosniff'] },
    { name: 'Strict-Transport-Security', expected: null }, // Just needs to be present
    { name: 'Content-Security-Policy', expected: null }
  ];

  try {
    // Phase 1: Check security headers
    sendUpdate({ phase: 'Checking security headers...' });
    const response = await axios.get(`${baseUrl}/checkout`, {
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 0
    }).catch(err => {
      if (err.response) return err.response;
      throw err;
    });

    results.debug.responses.push({
      phase: 'headers',
      status: response.status,
      headers: response.headers
    });

    let headersFound = 0;
    for (const header of requiredHeaders) {
      const value = response.headers[header.name.toLowerCase()];
      if (value) {
        if (header.expected === null || header.expected.some(e => value.toUpperCase().includes(e.toUpperCase()))) {
          results.details.push({ phase: header.name, result: `✓ ${value}` });
          results.powerLevel += 500;
          headersFound++;
        } else {
          results.details.push({ phase: header.name, result: `Present but unexpected: ${value}` });
        }
      } else {
        results.details.push({ phase: header.name, result: 'Missing' });
      }
    }

    // Phase 2: Check HTTPS redirect (for HTTP URL)
    sendUpdate({ phase: 'Checking HTTPS enforcement...' });

    // We can only really test this by checking if the original URL was HTTP and got redirected
    // Since we're testing via HTTPS typically, we'll note it
    const isHttps = baseUrl.startsWith('https://');
    if (isHttps) {
      results.details.push({ phase: 'HTTPS', result: '✓ Connection is secure' });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'HTTPS', result: 'Not using HTTPS' });
    }

    // Phase 3: Check that sensitive params in URL are handled
    sendUpdate({ phase: 'Testing sensitive data in URL protection...' });
    const sensitiveResponse = await axios.get(`${baseUrl}/checkout?card=4242424242424242`, {
      timeout: 10000,
      validateStatus: () => true
    });

    results.debug.responses.push({
      phase: 'sensitive-url',
      status: sensitiveResponse.status
    });

    if (sensitiveResponse.status === 403 || sensitiveResponse.status === 400) {
      results.details.push({ phase: 'Sensitive URL Params', result: 'Blocked' });
      results.powerLevel += 500;
    } else {
      results.details.push({ phase: 'Sensitive URL Params', result: `Not blocked (${sensitiveResponse.status})` });
    }

    // Determine overall status
    if (results.powerLevel >= 2000) {
      results.status = 'pass';
    }

  } catch (error) {
    results.details.push({ phase: 'Error', result: error.message });
    results.debug.error = error.message;
  }

  return results;
}

module.exports = {
  'waf': testWaf,
  'bot': testBot,
  'ddos': testDdos,
  'pci': testPci
};
```

**Step 2: Verify module loads**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node -e "const t = require('./lib/tests/store'); console.log(Object.keys(t))"`
Expected: `[ 'waf', 'bot', 'ddos', 'pci' ]`

---

## Task 7: Test Runner Implementation

**Files:**
- Create: `scouter-app/lib/runner.js`
- Modify: `scouter-app/server.js`

**Step 1: Create the test runner**

Create file `scouter-app/lib/runner.js`:

```javascript
const radarTests = require('./tests/radar');
const storeTests = require('./tests/store');

const testSuites = {
  radar: radarTests,
  store: storeTests
};

/**
 * Run tests for a target and stream results via WebSocket
 */
async function runTests(ws, target, fqdn, tests) {
  const suite = testSuites[target];
  if (!suite) {
    ws.send(JSON.stringify({
      type: 'error',
      target: target,
      message: `Unknown target: ${target}`
    }));
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
      ws.send(JSON.stringify({
        type: 'error',
        target: target,
        message: `Unknown test: ${testName}`
      }));
      continue;
    }

    // Send test start
    ws.send(JSON.stringify({
      type: 'test-start',
      target: target,
      test: testName,
      name: getTestDisplayName(testName)
    }));

    // Run test with update callback
    const sendUpdate = (update) => {
      // Could be used for progress updates during test
      console.log(`[${target}/${testName}] ${update.phase}`);
    };

    try {
      const result = await testFn(baseUrl, sendUpdate);
      result.target = target;
      totalPowerLevel += result.powerLevel;
      maxPossible += getMaxPowerLevel(testName);

      ws.send(JSON.stringify({
        type: 'test-result',
        ...result
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'test-result',
        target: target,
        test: testName,
        name: getTestDisplayName(testName),
        status: 'fail',
        powerLevel: 0,
        details: [{ phase: 'Error', result: error.message }],
        debug: { error: error.stack }
      }));
    }
  }

  // Send scan complete
  ws.send(JSON.stringify({
    type: 'scan-complete',
    target: target,
    totalPowerLevel: totalPowerLevel,
    maxPossible: maxPossible,
    message: totalPowerLevel > 9000 ? "IT'S OVER 9000!" : null
  }));
}

function getTestDisplayName(testName) {
  const names = {
    'rate-limiting': 'Rate Limiting',
    'caching': 'Caching Strategy',
    'performance': 'Global Performance',
    'security': 'API Security',
    'waf': 'WAF Protection',
    'bot': 'Bot Protection',
    'ddos': 'DDoS Mitigation',
    'pci': 'PCI Compliance'
  };
  return names[testName] || testName;
}

function getMaxPowerLevel(testName) {
  const maxLevels = {
    'rate-limiting': 4000,
    'caching': 4000,
    'performance': 3000,
    'security': 3000,
    'waf': 4000,
    'bot': 3100,
    'ddos': 3000,
    'pci': 2500
  };
  return maxLevels[testName] || 3000;
}

module.exports = { runTests };
```

**Step 2: Update server.js to use runner**

Replace the content of `scouter-app/server.js`:

```javascript
const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const { runTests } = require('./lib/runner');

const app = express();
const PORT = process.env.PORT || 3002;

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
```

**Step 3: Verify full app works**

Run: `cd /Users/kevin/Projects/onsite/scouter-app && node server.js`
Open browser to http://localhost:3002
Enter `localhost:3001` as Dragon Radar API FQDN
Click "Scan Power Level"
Expected: Tests run and stream results (will show connection errors since localhost:3001 needs to be running)
Stop server after verification.

---

## Task 8: Docker Integration

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Add scouter-app to docker-compose.yml**

Add the following service to the existing `docker-compose.yml`:

```yaml
  scouter-app:
    build: ./scouter-app
    ports:
      - "3002:3002"
    restart: unless-stopped
```

The full file should look like:

```yaml
services:
  capsule-info:
    build: ./capsule-info
    ports:
      - "8080:8080"
    restart: unless-stopped

  capsule-store:
    build: ./capsule-store
    ports:
      - "3000:3000"
    restart: unless-stopped

  dragon-radar-api:
    build: ./dragon-radar-api
    ports:
      - "3001:3001"
    restart: unless-stopped

  scouter-app:
    build: ./scouter-app
    ports:
      - "3002:3002"
    restart: unless-stopped
```

**Step 2: Test Docker build**

Run: `cd /Users/kevin/Projects/onsite && docker compose build scouter-app`
Expected: Build completes successfully

**Step 3: Test Docker run**

Run: `docker compose up scouter-app -d && sleep 3 && curl http://localhost:3002/api/health && docker compose stop scouter-app`
Expected: Health check returns JSON with "operational" status

---

## Task 9: Capsule-Info Navigation Update

**Files:**
- Modify: `capsule-info/index.html`
- Modify: `capsule-info/apps.html`

**Step 1: Update index.html navigation**

In `capsule-info/index.html`, find the nav-links div (around line 18-21) and add the Scouter link:

```html
        <div class="nav-links">
            <a href="index.html" class="active">Challenge</a>
            <a href="apps.html">Demo Apps</a>
            <a href="http://localhost:3002" target="_blank">Scouter</a>
        </div>
```

**Step 2: Update apps.html navigation**

In `capsule-info/apps.html`, find the nav-links div and add the same Scouter link:

```html
        <div class="nav-links">
            <a href="index.html">Challenge</a>
            <a href="apps.html" class="active">Demo Apps</a>
            <a href="http://localhost:3002" target="_blank">Scouter</a>
        </div>
```

**Step 3: Verify navigation works**

Run: `docker compose up -d`
Open browser to http://localhost:8080
Click "Scouter" link in navigation
Expected: Opens Scouter App in new tab at http://localhost:3002

---

## Task 10: Final Verification

**Step 1: Run all services**

Run: `cd /Users/kevin/Projects/onsite && docker compose up --build -d`

**Step 2: Verify all containers are running**

Run: `docker compose ps`
Expected: All 4 services (capsule-info, capsule-store, dragon-radar-api, scouter-app) show as "running"

**Step 3: Test Dragon Radar API scan locally**

Open http://localhost:3002
Enter `localhost:3001` in Dragon Radar API FQDN
Select all tests
Click "Scan Power Level"
Expected: Tests run and show results (will show failures/low scores since no F5 XC is in front)

**Step 4: Test Capsule Store scan locally**

Enter `localhost:3000` in Capsule Store FQDN
Select all tests
Click "Scan Power Level"
Expected: Tests run and show results (will show failures/low scores since no F5 XC is in front)

**Step 5: Verify navigation integration**

Open http://localhost:8080
Click through Challenge and Demo Apps tabs
Click Scouter link
Expected: All navigation works, Scouter opens in new tab

---

## Summary

The implementation creates:

1. **scouter-app/** - New Node.js application
   - `server.js` - Express + WebSocket server
   - `lib/runner.js` - Test orchestration
   - `lib/tests/radar.js` - 4 Dragon Radar API tests
   - `lib/tests/store.js` - 4 Capsule Store tests
   - `public/index.html` - Two-panel UI
   - `public/css/style.css` - DBZ-themed styling
   - `public/js/app.js` - WebSocket client
   - `Dockerfile` - Container configuration
   - `package.json` - Dependencies

2. **docker-compose.yml** - Updated with scouter-app service

3. **capsule-info/** - Navigation updated with Scouter link

Total: 8 test scenarios covering rate limiting, caching, performance, API security, WAF, bot protection, DDoS mitigation, and PCI compliance.
