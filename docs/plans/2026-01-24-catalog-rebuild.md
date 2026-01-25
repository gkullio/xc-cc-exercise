# Catalog Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the catalog app as a Node.js/Express application with clean sci-fi styling, and extract nginx to a dedicated gateway container.

**Architecture:** Gateway (nginx) handles routing to all services. Catalog becomes a Node.js/Express app serving EJS templates. Dragon-radar-api gets self-hosted Swagger UI docs.

**Tech Stack:** Node.js, Express, EJS, nginx, swagger-ui-express, yamljs

---

## Task 1: Create Gateway Container

**Files:**
- Create: `gateway/Dockerfile`
- Create: `gateway/nginx.conf`

**Step 1: Create gateway directory**

```bash
mkdir -p gateway
```

**Step 2: Create gateway/Dockerfile**

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: Create gateway/nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 8081;
        server_name _;

        # Catalog app (portal)
        location / {
            proxy_pass http://catalog:3004/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "";
        }

        # Proxy to capsule-store
        location ^~ /store/ {
            proxy_pass http://capsule-store:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/store";
        }

        # Proxy to dragon-radar-api
        location ^~ /api/ {
            proxy_pass http://dragon-radar-api:3001/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/api";
        }

        # Proxy to gravity-viewer (SSE, no WebSocket upgrade)
        location ^~ /gravity/ {
            proxy_pass http://gravity-viewer:3002/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/gravity";
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 86400;
        }
    }
}
```

**Step 4: Verify files exist**

```bash
ls -la gateway/
```

Expected: `Dockerfile` and `nginx.conf`

**Step 5: Commit**

```bash
git add gateway/
git commit -m "feat(gateway): create nginx gateway container"
```

---

## Task 2: Create Catalog Node.js App Structure

**Files:**
- Create: `catalog/server.js`
- Create: `catalog/package.json`
- Create: `catalog/Dockerfile`

**Step 1: Create catalog server.js**

```javascript
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Internal App Catalog',
    basePath: req.get('X-Base-Path') || ''
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Catalog Portal',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Catalog Portal running on port ${PORT}`);
});
```

**Step 2: Create catalog package.json**

```json
{
  "name": "catalog",
  "version": "1.0.0",
  "description": "Internal App Catalog Portal",
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

**Step 3: Create catalog Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3004

CMD ["npm", "start"]
```

**Step 4: Create directory structure**

```bash
mkdir -p catalog/views catalog/public/css
```

**Step 5: Commit**

```bash
git add catalog/server.js catalog/package.json catalog/Dockerfile
git commit -m "feat(catalog): create Node.js app structure"
```

---

## Task 3: Create Catalog View Template

**Files:**
- Create: `catalog/views/index.ejs`

**Step 1: Create catalog/views/index.ejs**

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | Capsule Corp</title>
  <link rel="stylesheet" href="<%= basePath %>/css/styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="internal-banner">
    <span class="banner-icon">&#9888;</span>
    <span>INTERNAL ACCESS ONLY</span>
  </div>

  <header class="header">
    <div class="logo">
      <div class="logo-circle">CC</div>
    </div>
    <h1>Internal App Catalog</h1>
    <p class="tagline">Capsule Corporation Development Resources</p>
  </header>

  <main class="main">
    <div class="app-grid">
      <!-- Store Card -->
      <a href="/store/" class="app-card">
        <div class="app-icon store-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </div>
        <h2>Capsule Store</h2>
        <p>E-commerce platform for Hoi-Poi Capsules and Capsule Corp products.</p>
        <span class="app-btn">Launch App</span>
      </a>

      <!-- API Card -->
      <a href="/api/docs" class="app-card">
        <div class="app-icon api-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
        </div>
        <h2>Dragon Radar API</h2>
        <p>REST API for Dragon Ball location tracking and geolocation queries.</p>
        <span class="app-btn">View Docs</span>
      </a>

      <!-- Gravity Card -->
      <a href="/gravity/" class="app-card">
        <div class="app-icon gravity-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <h2>Gravity Chamber</h2>
        <p>Real-time monitoring interface for gravity training chambers.</p>
        <span class="app-btn">Open Control</span>
      </a>
    </div>
  </main>

  <footer class="footer">
    <div class="footer-logo">
      <div class="logo-circle logo-sm">CC</div>
    </div>
    <p>Capsule Corporation</p>
    <div class="footer-badge">Internal Development Portal</div>
  </footer>
</body>
</html>
```

**Step 2: Commit**

```bash
git add catalog/views/index.ejs
git commit -m "feat(catalog): add portal page template"
```

---

## Task 4: Create Catalog Styles

**Files:**
- Create: `catalog/public/css/styles.css`

**Step 1: Create catalog/public/css/styles.css**

```css
/* Catalog Portal - Clean Sci-Fi Theme */
:root {
  --bg-dark: #0a0f1a;
  --bg-panel: #111827;
  --bg-card: rgba(17, 24, 39, 0.8);
  --accent: #00d4ff;
  --accent-glow: rgba(0, 212, 255, 0.3);
  --secondary: #ff6b35;
  --text: #ffffff;
  --text-dim: #9ca3af;
  --border: #1f2937;
  --success: #10b981;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-dark);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Internal Banner */
.internal-banner {
  background: linear-gradient(90deg, #dc2626, #b91c1c);
  color: white;
  padding: 8px 20px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.banner-icon {
  font-size: 1rem;
}

/* Header */
.header {
  background: linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-dark) 100%);
  padding: 40px 20px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #0891b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 0 30px var(--accent-glow);
}

.header h1 {
  font-family: 'Rajdhani', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, var(--text), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  color: var(--text-dim);
  font-size: 1rem;
  letter-spacing: 1px;
}

/* Main */
.main {
  flex: 1;
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* App Grid */
.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

/* App Card */
.app-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.app-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 30px var(--accent-glow);
  transform: translateY(-4px);
}

.app-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.app-icon svg {
  width: 32px;
  height: 32px;
}

.store-icon {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.api-icon {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.gravity-icon {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.app-card h2 {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.app-card p {
  color: var(--text-dim);
  font-size: 0.95rem;
  line-height: 1.6;
  margin-bottom: 24px;
  flex: 1;
}

.app-btn {
  display: inline-block;
  padding: 12px 24px;
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.9rem;
  letter-spacing: 1px;
  transition: all 0.3s ease;
}

.app-card:hover .app-btn {
  background: var(--accent);
  color: var(--bg-dark);
}

/* Footer */
.footer {
  background: var(--bg-panel);
  padding: 30px 20px;
  text-align: center;
  border-top: 1px solid var(--border);
}

.footer-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.logo-sm {
  width: 40px;
  height: 40px;
  font-size: 1rem;
}

.footer p {
  color: var(--text-dim);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.footer-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid #dc2626;
  border-radius: 4px;
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* Responsive */
@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }

  .app-grid {
    grid-template-columns: 1fr;
  }
}
```

**Step 2: Commit**

```bash
git add catalog/public/css/styles.css
git commit -m "feat(catalog): add clean sci-fi styles"
```

---

## Task 5: Add Swagger UI to Dragon Radar API

**Files:**
- Modify: `dragon-radar-api/server.js`
- Modify: `dragon-radar-api/package.json`

**Step 1: Update dragon-radar-api/package.json**

Add dependencies:

```json
{
  "name": "dragon-radar-api",
  "version": "1.0.0",
  "description": "Dragon Ball location tracking API for F5 XC demo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "swagger-ui-express": "^5.0.0",
    "yamljs": "^0.3.0"
  }
}
```

**Step 2: Update dragon-radar-api/server.js**

Add after line 3 (after the require statements):

```javascript
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerSpec = YAML.load(path.join(__dirname, 'openapi.yaml'));
```

Add after line 9 (after the openapi.yaml static route):

```javascript
// Swagger UI docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dragon Radar API Docs'
}));
```

**Step 3: Install dependencies locally for testing**

```bash
cd dragon-radar-api && npm install && cd ..
```

**Step 4: Test locally**

```bash
cd dragon-radar-api && npm start &
sleep 2
curl -s http://localhost:3001/docs | head -20
pkill -f "node.*dragon-radar"
```

Expected: HTML response with Swagger UI content

**Step 5: Commit**

```bash
git add dragon-radar-api/server.js dragon-radar-api/package.json
git commit -m "feat(dragon-radar-api): add Swagger UI at /docs"
```

---

## Task 6: Update docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

**Step 1: Replace docker-compose.yml content**

```yaml
networks:
  lab:
    driver: bridge

services:
  # --- Gateway (8081) ---
  gateway:
    build: ./gateway
    ports:
      - "8081:8081"
    restart: always
    networks:
      - lab
    depends_on:
      - catalog
      - capsule-store
      - dragon-radar-api
      - gravity-viewer

  # --- Entry Points (8080 range) ---
  capsule-info:
    image: ghcr.io/f5xc-salesdemos/capsule-info:latest
    pull_policy: always
    ports:
      - "8080:8080"
    restart: always
    networks:
      - lab
    depends_on:
      - scouter-app

  # --- App Ports (3000 range) ---
  catalog:
    build: ./catalog
    restart: always
    networks:
      - lab

  capsule-store:
    image: ghcr.io/f5xc-salesdemos/capsule-store:latest
    pull_policy: always
    ports:
      - "3000:3000"
    restart: always
    networks:
      - lab

  dragon-radar-api:
    build: ./dragon-radar-api
    ports:
      - "3001:3001"
    restart: always
    networks:
      - lab

  gravity-viewer:
    image: ghcr.io/f5xc-salesdemos/gravity-viewer:latest
    pull_policy: always
    ports:
      - "3002:3002"
    restart: always
    networks:
      - lab

  # --- Internal Services ---
  scouter-app:
    image: ghcr.io/f5xc-salesdemos/scouter-app:latest
    pull_policy: always
    restart: always
    networks:
      - lab
```

**Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: update docker-compose for gateway and rebuilt catalog"
```

---

## Task 7: Clean Up Old Catalog Files

**Files:**
- Delete: `catalog/html/` (directory)
- Delete: `catalog/nginx.conf`
- Delete: `catalog/styles.css` (if exists at root)

**Step 1: Remove old files**

```bash
rm -rf catalog/html catalog/nginx.conf catalog/styles.css 2>/dev/null
git add -A catalog/
```

**Step 2: Verify catalog structure**

```bash
ls -la catalog/
```

Expected: Only `server.js`, `package.json`, `Dockerfile`, `views/`, `public/`

**Step 3: Commit**

```bash
git commit -m "chore(catalog): remove old static files"
```

---

## Task 8: Install Dependencies and Test

**Step 1: Install catalog dependencies**

```bash
cd catalog && npm install && cd ..
```

**Step 2: Build and start containers**

```bash
docker compose build gateway catalog dragon-radar-api
docker compose up -d
```

**Step 3: Test gateway routing**

```bash
# Test catalog portal
curl -s http://localhost:8081/ | grep -o "<title>.*</title>"

# Test API docs
curl -s http://localhost:8081/api/docs | head -5

# Test store proxy
curl -s http://localhost:8081/store/api/health

# Test gravity proxy
curl -s http://localhost:8081/gravity/api/health
```

Expected:
- Catalog: `<title>Internal App Catalog | Capsule Corp</title>`
- API docs: HTML with Swagger UI
- Store: JSON health response
- Gravity: JSON health response

**Step 4: Open in browser and verify**

Open http://localhost:8081 and verify:
- Internal banner displays
- Three app cards render with icons
- Footer shows "Internal Development Portal" badge
- Clicking cards navigates to correct apps

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete catalog rebuild with gateway" --allow-empty
git push
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create gateway nginx container |
| 2 | Create catalog Node.js app structure |
| 3 | Create catalog EJS template |
| 4 | Create catalog CSS styles |
| 5 | Add Swagger UI to dragon-radar-api |
| 6 | Update docker-compose.yml |
| 7 | Clean up old catalog files |
| 8 | Install, build, and test |
