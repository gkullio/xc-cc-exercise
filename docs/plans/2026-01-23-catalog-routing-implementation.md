# Catalog-Based Path Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace subdomain-based routing with IP:port access and path-based routing through a new catalog service.

**Architecture:** New catalog nginx service on port 8081 proxies to store/api/gravity apps via path prefixes, adding `X-Internal-Request` and `X-Base-Path` headers. Apps detect these headers to show "INTERNAL ACCESS ONLY" banners and adjust asset paths.

**Tech Stack:** Nginx (catalog proxy), Express.js (Node apps), EJS templates, Swagger UI (OAS viewer)

---

## Task 1: Update Port Configurations

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.lab.yml`
- Modify: `gravity-viewer/server.js:30`
- Modify: `scouter-app/server.js:8`
- Modify: `capsule-info/Dockerfile:21`

**Step 1: Update gravity-viewer port**

In `gravity-viewer/server.js`, change port from 3004 to 3002:

```javascript
const PORT = process.env.PORT || 3002;
```

**Step 2: Update scouter-app port**

In `scouter-app/server.js`, change port from 3002 to 4000:

```javascript
const PORT = process.env.PORT || 4000;
```

**Step 3: Update capsule-info scouter proxy**

In `capsule-info/Dockerfile`, update the proxy_pass line (around line 21):

```dockerfile
    location /ws/scan { \
        proxy_pass http://scouter-app:4000; \
```

**Step 4: Update docker-compose.yml**

Replace entire file:

```yaml
services:
  capsule-info:
    build: ./capsule-info
    ports:
      - "8080:8080"
    restart: unless-stopped
    depends_on:
      - scouter-app

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
      - "4000:4000"
    restart: unless-stopped

  gravity-viewer:
    build: ./gravity-viewer
    ports:
      - "3002:3002"
    restart: unless-stopped
```

**Step 5: Run test to verify ports**

Run: `docker compose config | grep -E '^\s+- "[0-9]+:[0-9]+"'`
Expected: Shows 8080, 3000, 3001, 4000, 3002

**Step 6: Commit**

```bash
git add docker-compose.yml gravity-viewer/server.js scouter-app/server.js capsule-info/Dockerfile
git commit -m "$(cat <<'EOF'
Update port scheme for catalog routing

- gravity-viewer: 3004 -> 3002
- scouter-app: 3002 -> 4000
- Update capsule-info proxy to scouter at 4000
EOF
)"
```

---

## Task 2: Create Catalog Service Structure

**Files:**
- Create: `catalog/Dockerfile`
- Create: `catalog/nginx.conf`
- Create: `catalog/html/index.html`
- Create: `catalog/html/styles.css`

**Step 1: Create catalog directory**

Run: `mkdir -p catalog/html`

**Step 2: Create catalog Dockerfile**

Create `catalog/Dockerfile`:

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY html /usr/share/nginx/html

EXPOSE 8081

CMD ["nginx", "-g", "daemon off;"]
```

**Step 3: Create catalog nginx.conf**

Create `catalog/nginx.conf`:

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

        root /usr/share/nginx/html;
        index index.html;

        # Catalog landing page
        location = / {
            try_files /index.html =404;
        }

        # Static assets for catalog
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            try_files $uri =404;
        }

        # OAS Viewer
        location /api-docs/ {
            alias /usr/share/nginx/html/api-docs/;
            try_files $uri $uri/ /api-docs/index.html;
        }

        # Proxy to capsule-store
        location /store/ {
            proxy_pass http://capsule-store:3000/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/store";
        }

        # Proxy to dragon-radar-api
        location /api/ {
            proxy_pass http://dragon-radar-api:3001/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/api";
        }

        # Proxy to gravity-viewer
        location /gravity/ {
            proxy_pass http://gravity-viewer:3002/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Internal-Request "true";
            proxy_set_header X-Base-Path "/gravity";
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

**Step 4: Verify nginx config syntax**

Run: `docker run --rm -v $(pwd)/catalog/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t`
Expected: "syntax is ok" and "test is successful"

**Step 5: Commit**

```bash
git add catalog/
git commit -m "$(cat <<'EOF'
Add catalog service with nginx proxy config

- Dockerfile for nginx-alpine based catalog
- nginx.conf with path-based proxy routing
- Adds X-Internal-Request and X-Base-Path headers
EOF
)"
```

---

## Task 3: Create Catalog Landing Page

**Files:**
- Create: `catalog/html/index.html`
- Create: `catalog/html/styles.css`

**Step 1: Create catalog index.html**

Create `catalog/html/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Internal App Catalog | Capsule Corporation</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Internal Banner -->
    <div class="internal-banner">
        <span class="banner-icon">&#9888;</span>
        <span>INTERNAL ACCESS ONLY</span>
    </div>

    <!-- Header -->
    <header class="header">
        <div class="logo">
            <div class="logo-circle">CC</div>
        </div>
        <h1>Internal App Catalog</h1>
        <p class="tagline">Capsule Corporation Development Resources</p>
    </header>

    <!-- App Grid -->
    <main class="main">
        <div class="app-grid">
            <!-- Store Card -->
            <div class="app-card">
                <div class="app-icon store-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                </div>
                <h2>Capsule Store</h2>
                <p>E-commerce platform for Hoi-Poi Capsules and Capsule Corp products.</p>
                <a href="/store/" class="app-btn">Browse Store</a>
            </div>

            <!-- API Card -->
            <div class="app-card">
                <div class="app-icon api-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                    </svg>
                </div>
                <h2>Dragon Radar API</h2>
                <p>REST API for Dragon Ball location tracking and geolocation queries.</p>
                <a href="/api-docs/" class="app-btn">View Docs</a>
            </div>

            <!-- Gravity Card -->
            <div class="app-card">
                <div class="app-icon gravity-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="16"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                </div>
                <h2>Gravity Chamber</h2>
                <p>Real-time monitoring and control interface for gravity training chambers.</p>
                <a href="/gravity/" class="app-btn">Open Control</a>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="logo-small">
            <div class="logo-circle logo-circle-sm">CC</div>
        </div>
        <p>Capsule Corporation</p>
        <div class="footer-badge">Internal Development Portal</div>
    </footer>
</body>
</html>
```

**Step 2: Create catalog styles.css**

Create `catalog/html/styles.css`:

```css
/* CSS Custom Properties - matching capsule-info branding */
:root {
    --color-primary: #FF6B35;
    --color-primary-glow: rgba(255, 107, 53, 0.5);
    --color-secondary: #1E90FF;
    --color-secondary-glow: rgba(30, 144, 255, 0.4);
    --color-ki-yellow: #FFD93D;
    --color-ki-gold: #F4A020;
    --color-bg-dark: #0D1B2A;
    --color-bg-card: #1B263B;
    --color-bg-card-hover: #243447;
    --color-text-primary: #FFFFFF;
    --color-text-secondary: #A0AEC0;
    --color-text-muted: #718096;
    --color-border: rgba(255, 255, 255, 0.1);
    --color-internal-banner: #f59e0b;
    --font-heading: 'Rajdhani', sans-serif;
    --font-body: 'Inter', sans-serif;
    --font-mono: 'Share Tech Mono', monospace;
    --card-clip: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
}

*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
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

/* Internal Banner */
.internal-banner {
    background: var(--color-internal-banner);
    color: #000;
    text-align: center;
    padding: 0.75rem 1rem;
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    position: sticky;
    top: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.banner-icon {
    font-size: 1.1rem;
}

/* Header */
.header {
    text-align: center;
    padding: 4rem 2rem 3rem;
    background: linear-gradient(135deg, var(--color-bg-dark) 0%, #152238 50%, var(--color-bg-dark) 100%);
}

.logo {
    margin-bottom: 1.5rem;
}

.logo-circle {
    width: 80px;
    height: 80px;
    border: 4px solid var(--color-primary);
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-heading);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-primary);
    background: radial-gradient(circle at 30% 30%, #2a3f5f 0%, var(--color-bg-dark) 70%);
    box-shadow: 0 0 20px var(--color-primary-glow), 0 0 40px var(--color-ki-gold);
}

.logo-circle-sm {
    width: 50px;
    height: 50px;
    font-size: 1.25rem;
}

h1 {
    font-family: var(--font-heading);
    font-size: 2.5rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    text-shadow: 0 0 40px var(--color-primary-glow);
}

.tagline {
    font-family: var(--font-heading);
    font-size: 1rem;
    color: var(--color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* Main Content */
.main {
    flex: 1;
    padding: 3rem 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

/* App Grid */
.app-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.app-card {
    background: var(--color-bg-card);
    padding: 2rem;
    clip-path: var(--card-clip);
    border: 2px solid var(--color-border);
    text-align: center;
    transition: all 0.3s ease;
}

.app-card:hover {
    background: var(--color-bg-card-hover);
    border-color: var(--color-primary);
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px var(--color-primary-glow);
}

.app-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.5rem;
    padding: 1rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.app-icon svg {
    width: 100%;
    height: 100%;
}

.store-icon {
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.1));
    color: var(--color-primary);
    border: 2px solid var(--color-primary);
    box-shadow: 0 0 20px var(--color-primary-glow);
}

.api-icon {
    background: linear-gradient(135deg, rgba(30, 144, 255, 0.2), rgba(30, 144, 255, 0.1));
    color: var(--color-secondary);
    border: 2px solid var(--color-secondary);
    box-shadow: 0 0 20px var(--color-secondary-glow);
}

.gravity-icon {
    background: linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(138, 43, 226, 0.1));
    color: #8A2BE2;
    border: 2px solid #8A2BE2;
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.3);
}

.app-card h2 {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
}

.app-card p {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    margin-bottom: 1.5rem;
}

.app-btn {
    display: inline-block;
    background: linear-gradient(135deg, var(--color-primary) 0%, #c54a20 100%);
    color: var(--color-text-primary);
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    font-family: var(--font-heading);
    font-weight: 600;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 4px;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px var(--color-primary-glow);
}

.app-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px var(--color-primary-glow);
}

/* Footer */
.footer {
    background: linear-gradient(180deg, var(--color-bg-dark) 0%, #050d15 100%);
    padding: 3rem 2rem;
    text-align: center;
}

.logo-small {
    margin-bottom: 1rem;
}

.footer p {
    font-family: var(--font-heading);
    font-size: 1rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
}

.footer-badge {
    display: inline-block;
    font-family: var(--font-heading);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-ki-yellow);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    padding: 0.5rem 1.5rem;
    border: 2px solid var(--color-primary);
    background: rgba(255, 107, 53, 0.1);
    box-shadow: 0 0 15px var(--color-primary-glow);
}

/* Responsive */
@media (max-width: 768px) {
    h1 {
        font-size: 1.75rem;
    }

    .app-grid {
        grid-template-columns: 1fr;
    }
}
```

**Step 3: Verify files exist**

Run: `ls -la catalog/html/`
Expected: Shows index.html and styles.css

**Step 4: Commit**

```bash
git add catalog/html/
git commit -m "$(cat <<'EOF'
Add catalog landing page with Capsule Corp branding

- index.html with app cards for store, API, gravity
- styles.css matching capsule-info theme
- Internal Access Only banner
EOF
)"
```

---

## Task 4: Add OAS Viewer to Catalog

**Files:**
- Create: `catalog/html/api-docs/index.html`

**Step 1: Create api-docs directory**

Run: `mkdir -p catalog/html/api-docs`

**Step 2: Create Swagger UI page**

Create `catalog/html/api-docs/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dragon Radar API | Capsule Corporation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        :root {
            --color-bg-dark: #0D1B2A;
            --color-internal-banner: #f59e0b;
        }
        body {
            margin: 0;
            background: var(--color-bg-dark);
        }
        .internal-banner {
            background: var(--color-internal-banner);
            color: #000;
            text-align: center;
            padding: 0.75rem 1rem;
            font-family: system-ui, sans-serif;
            font-weight: 700;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .swagger-ui {
            background: var(--color-bg-dark);
        }
        .swagger-ui .topbar {
            display: none;
        }
        .swagger-ui .info .title {
            color: #fff;
        }
        .swagger-ui .info .description p {
            color: #a0aec0;
        }
        .swagger-ui .scheme-container {
            background: #1B263B;
        }
        .swagger-ui .opblock-tag {
            color: #fff;
            border-bottom-color: rgba(255,255,255,0.1);
        }
        .swagger-ui .opblock {
            background: #1B263B;
            border-color: rgba(255,255,255,0.1);
        }
        .swagger-ui .opblock .opblock-summary-method {
            font-weight: 700;
        }
        .swagger-ui .opblock .opblock-summary-description {
            color: #a0aec0;
        }
        .swagger-ui .opblock .opblock-section-header {
            background: #243447;
        }
        .swagger-ui .opblock .opblock-section-header h4 {
            color: #fff;
        }
        .swagger-ui table thead tr th {
            color: #a0aec0;
        }
        .swagger-ui .parameter__name {
            color: #fff;
        }
        .swagger-ui .parameter__type {
            color: #a0aec0;
        }
        .swagger-ui .response-col_status {
            color: #fff;
        }
        .swagger-ui .response-col_description {
            color: #a0aec0;
        }
    </style>
</head>
<body>
    <div class="internal-banner">
        &#9888; INTERNAL ACCESS ONLY
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/api/radar/openapi.yaml",
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                deepLinking: true
            });
        };
    </script>
</body>
</html>
```

**Step 3: Update nginx.conf to serve OpenAPI spec**

Edit `catalog/nginx.conf` to add route for OpenAPI spec before the /api/ location:

```nginx
        # Serve OpenAPI spec from dragon-radar-api
        location = /api/radar/openapi.yaml {
            proxy_pass http://dragon-radar-api:3001/openapi.yaml;
            proxy_set_header Host $host;
        }
```

**Step 4: Update dragon-radar-api to serve openapi.yaml**

In `dragon-radar-api/server.js`, add static file serving before the routes (after line 5):

```javascript
const path = require('path');

// Serve OpenAPI spec
app.use('/openapi.yaml', express.static(path.join(__dirname, 'openapi.yaml')));
```

**Step 5: Verify file structure**

Run: `ls -la catalog/html/api-docs/`
Expected: Shows index.html

**Step 6: Commit**

```bash
git add catalog/html/api-docs/ catalog/nginx.conf dragon-radar-api/server.js
git commit -m "$(cat <<'EOF'
Add OAS viewer with Swagger UI

- Swagger UI page at /api-docs/
- Dark theme matching Capsule Corp branding
- Route to serve OpenAPI spec from dragon-radar-api
EOF
)"
```

---

## Task 5: Add Internal Banner to Capsule Store

**Files:**
- Modify: `capsule-store/server.js:27-40`
- Modify: `capsule-store/views/layout.ejs:9-11`
- Create: `capsule-store/public/css/internal-banner.css`

**Step 1: Add middleware for internal detection**

In `capsule-store/server.js`, add middleware after the session middleware (after line 21, before the layout middleware):

```javascript
// Internal access detection middleware
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});
```

**Step 2: Create internal-banner.css**

Create `capsule-store/public/css/internal-banner.css`:

```css
.internal-banner {
    background: #f59e0b;
    color: #000;
    text-align: center;
    padding: 0.75rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.internal-banner ~ .header {
    margin-top: 48px;
}

body.has-internal-banner {
    padding-top: 48px;
}
```

**Step 3: Update layout.ejs**

In `capsule-store/views/layout.ejs`, add after line 7 (after the stylesheet link):

```html
  <% if (internal) { %>
  <link rel="stylesheet" href="<%= basePath %>/css/internal-banner.css">
  <% } %>
```

Then add after line 9 (opening body tag):

```html
<% if (internal) { %>
<div class="internal-banner">
  <span>&#9888;</span>
  <span>INTERNAL ACCESS ONLY</span>
</div>
<% } %>
```

**Step 4: Update all asset paths in layout.ejs to use basePath**

Update the stylesheet and script tags:

```html
  <link rel="stylesheet" href="<%= basePath %>/css/style.css">
```

And:

```html
  <script src="<%= basePath %>/js/main.js"></script>
```

And the logo link:

```html
      <a href="<%= basePath %>/" class="logo">
```

**Step 5: Verify changes**

Run: `grep -n "basePath\|internal" capsule-store/views/layout.ejs`
Expected: Shows multiple lines with basePath and internal references

**Step 6: Commit**

```bash
git add capsule-store/
git commit -m "$(cat <<'EOF'
Add internal access banner to capsule-store

- Middleware to detect X-Internal-Request header
- Yellow banner displayed when accessed via catalog
- Dynamic basePath for all asset URLs
EOF
)"
```

---

## Task 6: Add Internal Banner to Gravity Viewer

**Files:**
- Modify: `gravity-viewer/server.js:7-15`
- Modify: `gravity-viewer/views/index.ejs:7-13`
- Create: `gravity-viewer/public/css/internal-banner.css`

**Step 1: Add middleware for internal detection**

In `gravity-viewer/server.js`, add after line 7 (after express.static):

```javascript
// Internal access detection middleware
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});
```

**Step 2: Update the render call to pass variables**

In `gravity-viewer/server.js`, update the render call (line 16):

```javascript
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Gravity Chamber Control',
    basePath: res.locals.basePath,
    internal: res.locals.internal
  });
});
```

**Step 3: Create internal-banner.css**

Create `gravity-viewer/public/css/internal-banner.css`:

```css
.internal-banner {
    background: #f59e0b;
    color: #000;
    text-align: center;
    padding: 0.75rem 1rem;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

body.has-internal-banner .header {
    margin-top: 48px;
}
```

**Step 4: Update views/index.ejs**

Add after line 7 (after the styles.css link):

```html
  <% if (internal) { %>
  <link rel="stylesheet" href="<%= basePath %>/css/internal-banner.css">
  <% } %>
```

Add after line 10 (opening body tag):

```html
<% if (internal) { %>
<div class="internal-banner">
  <span>&#9888;</span>
  <span>INTERNAL ACCESS ONLY</span>
</div>
<% } %>
```

Update the stylesheet link:

```html
  <link rel="stylesheet" href="<%= basePath %>/css/styles.css">
```

Update the script tag at the end:

```html
  <script src="<%= basePath %>/js/viewer.js"></script>
```

**Step 5: Verify changes**

Run: `grep -n "basePath\|internal" gravity-viewer/views/index.ejs`
Expected: Shows lines with basePath and internal references

**Step 6: Commit**

```bash
git add gravity-viewer/
git commit -m "$(cat <<'EOF'
Add internal access banner to gravity-viewer

- Middleware to detect X-Internal-Request header
- Yellow banner displayed when accessed via catalog
- Dynamic basePath for all asset URLs
EOF
)"
```

---

## Task 7: Add Internal Flag to Dragon Radar API

**Files:**
- Modify: `dragon-radar-api/server.js`

**Step 1: Add internal response wrapper middleware**

In `dragon-radar-api/server.js`, add after the rate limit middleware (after line 13):

```javascript
// Internal request detection - adds "internal" flag to responses
app.use((req, res, next) => {
  const isInternal = req.get('X-Internal-Request') === 'true';
  if (isInternal) {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (typeof data === 'object' && data !== null) {
        data.internal = true;
      }
      return originalJson(data);
    };
  }
  next();
});
```

**Step 2: Verify the middleware is in place**

Run: `grep -n "X-Internal-Request" dragon-radar-api/server.js`
Expected: Shows the line with internal request detection

**Step 3: Commit**

```bash
git add dragon-radar-api/server.js
git commit -m "$(cat <<'EOF'
Add internal flag to dragon-radar-api responses

When accessed via catalog (X-Internal-Request header),
all JSON responses include "internal": true
EOF
)"
```

---

## Task 8: Update Docker Compose Lab Configuration

**Files:**
- Modify: `docker-compose.lab.yml`

**Step 1: Replace docker-compose.lab.yml**

Replace entire `docker-compose.lab.yml`:

```yaml
networks:
  lab:
    driver: bridge

services:
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

  catalog:
    build: ./catalog
    ports:
      - "8081:8081"
    restart: always
    networks:
      - lab
    depends_on:
      - capsule-store
      - dragon-radar-api
      - gravity-viewer

  # --- App Ports (3000 range) ---
  capsule-store:
    image: ghcr.io/f5xc-salesdemos/capsule-store:latest
    pull_policy: always
    ports:
      - "3000:3000"
    restart: always
    networks:
      - lab

  dragon-radar-api:
    image: ghcr.io/f5xc-salesdemos/dragon-radar-api:latest
    pull_policy: always
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

  # --- Internal Services (4000 range) ---
  scouter-app:
    image: ghcr.io/f5xc-salesdemos/scouter-app:latest
    pull_policy: always
    restart: always
    networks:
      - lab

  gravity-chamber:
    image: ghcr.io/f5xc-salesdemos/gravity-chamber:latest
    pull_policy: always
    restart: always
    networks:
      - lab
```

**Step 2: Verify configuration**

Run: `docker compose -f docker-compose.lab.yml config | grep -E '^\s+- "[0-9]+:[0-9]+"'`
Expected: Shows 8080, 8081, 3000, 3001, 3002 (no 4000/4001 exposed)

**Step 3: Commit**

```bash
git add docker-compose.lab.yml
git commit -m "$(cat <<'EOF'
Update docker-compose.lab.yml for catalog routing

- Remove nginx reverse proxy and chrome services
- Add catalog service on port 8081
- Update port scheme (gravity-viewer 3002, scouter 4000)
- Internal services (scouter, gravity-chamber) not exposed
EOF
)"
```

---

## Task 9: Build and Test Locally

**Step 1: Build all services**

Run: `docker compose build`
Expected: All services build successfully

**Step 2: Start services**

Run: `docker compose up -d`
Expected: All services start

**Step 3: Test capsule-info**

Run: `curl -s http://localhost:8080 | head -20`
Expected: HTML with "Capsule Corporation" title

**Step 4: Test direct store access**

Run: `curl -s http://localhost:3000 | grep -o "INTERNAL ACCESS ONLY" || echo "No internal banner (correct)"`
Expected: "No internal banner (correct)"

**Step 5: Test catalog landing page**

Run: `curl -s http://localhost:8081 | grep -o "INTERNAL ACCESS ONLY"`
Expected: "INTERNAL ACCESS ONLY"

**Step 6: Test store via catalog**

Run: `curl -s http://localhost:8081/store/ | grep -o "INTERNAL ACCESS ONLY"`
Expected: "INTERNAL ACCESS ONLY"

**Step 7: Test API direct**

Run: `curl -s http://localhost:3001/api/radar/health | jq -r '.internal // "no internal flag"'`
Expected: "no internal flag"

**Step 8: Test API via catalog**

Run: `curl -s http://localhost:8081/api/radar/health | jq -r '.internal'`
Expected: "true"

**Step 9: Stop services**

Run: `docker compose down`

**Step 10: Commit test verification**

No code changes needed - tests are manual verification.

---

## Task 10: Final Commit and Summary

**Step 1: Review all changes**

Run: `git log --oneline feature/catalog-routing ^main`
Expected: Shows all commits for this feature

**Step 2: Create summary commit (if needed)**

If any uncommitted changes remain:

```bash
git status
git add -A
git commit -m "Complete catalog-based path routing implementation"
```

**Step 3: Verify branch is ready**

Run: `git diff main..feature/catalog-routing --stat`
Expected: Shows summary of all changed files

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| **Ports** | gravity-viewer 3004→3002, scouter 3002→4000, gravity-chamber 3003→4001 |
| **New Service** | catalog on 8081 with nginx proxy |
| **Removed** | nginx (port 80), chrome (port 6901) |
| **capsule-store** | Internal banner, basePath support |
| **gravity-viewer** | Internal banner, basePath support |
| **dragon-radar-api** | Internal flag in responses |
| **catalog** | Landing page, OAS viewer, proxy routes |
