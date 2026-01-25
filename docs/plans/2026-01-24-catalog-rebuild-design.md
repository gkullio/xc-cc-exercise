# Catalog App Rebuild Design

## Overview

Rebuild the catalog app for consistency with other apps in the project. Currently a static HTML site served by nginx, it will become a Node.js/Express app with EJS templates. The nginx reverse proxy functionality moves to a dedicated gateway container.

## Goals

- **Tech stack consistency**: Node.js/Express/EJS like capsule-store and gravity-viewer
- **Visual consistency**: Clean sci-fi/Dragon Ball aesthetic matching gravity-viewer (without retro grain effects)
- **Clean separation**: Dedicated gateway container handles routing, apps handle app logic

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    gateway (nginx)                       │
│                      Port 8081                           │
├─────────────────────────────────────────────────────────┤
│  /            → catalog:3004                             │
│  /store/*     → capsule-store:3000                       │
│  /api/*       → dragon-radar-api:3001                    │
│  /gravity/*   → gravity-viewer:3002                      │
└─────────────────────────────────────────────────────────┘
```

### Container Changes

| Container | Change |
|-----------|--------|
| `gateway` | New - nginx reverse proxy (extracted from catalog) |
| `catalog` | Rebuilt as Node.js/Express app on port 3004 |
| `dragon-radar-api` | Add Swagger UI at `/docs` |

## Gateway Configuration

**Directory: `gateway/`**

```
gateway/
├── nginx.conf
└── Dockerfile
```

**Routing rules:**
- `/` → catalog:3004
- `/store/*` → capsule-store:3000
- `/api/*` → dragon-radar-api:3001
- `/gravity/*` → gravity-viewer:3002

**Headers passed to backends:**
- `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- `X-Internal-Request: true`
- `X-Base-Path` (so apps know their public path)

**Notes:**
- Remove static file serving (catalog app handles that)
- Remove `/api-docs/` (moves to dragon-radar-api)
- Use SSE headers for `/gravity/` (not WebSocket upgrade)

## Catalog App

**Directory: `catalog/`**

```
catalog/
├── server.js
├── package.json
├── Dockerfile
├── views/
│   └── index.ejs
└── public/
    └── css/
        └── styles.css
```

**Express server:**
- Serves static files from `public/`
- Renders single EJS template at `/`
- Health check at `/api/health`
- Listens on port 3004

**Functionality:**
- Static portal page displaying app cards
- No dynamic features or API calls
- Links to Store, Dragon Radar API docs, and Gravity Chamber

## Dragon Radar API Changes

**Add Swagger UI:**

```javascript
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const spec = YAML.load('./openapi.yaml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
```

**New endpoints:**
- `/docs` - Interactive Swagger UI viewer
- `/openapi.yaml` - Raw spec (existing)

**Dependencies to add:**
- `swagger-ui-express`
- `yamljs`

## Visual Design

**Style direction:** Clean sci-fi / Dragon Ball aesthetic (no retro grain)

**Color palette:**
- Background: Dark blue-gray (`#0a0f1a`)
- Accent: Cyan/teal highlights (`#00d4ff`)
- Secondary: Orange/amber (`#ff6b35`)
- Text: White/light gray
- Cards: Semi-transparent dark panels with subtle borders

**Typography:**
- Headers: Rajdhani (tech/sci-fi font)
- Body: Inter
- Monospace: Share Tech Mono (consistent with gravity-viewer)

**Layout:**
- Centered content with max-width container
- 3-column grid for app cards (responsive to 1-column on mobile)
- Internal access banner at top
- Footer with Capsule Corp branding and "Internal Development Portal" badge

**Card design:**
- Dark semi-transparent background
- Subtle glow/border on hover
- Icon, title, short description, action button
- Clean flat SVG icons

## Implementation Order

1. Create gateway container (move nginx config)
2. Rebuild catalog as Node.js app
3. Add Swagger UI to dragon-radar-api
4. Update docker-compose.yml
5. Test full stack

## Files to Create

- `gateway/Dockerfile`
- `gateway/nginx.conf`
- `catalog/server.js`
- `catalog/package.json`
- `catalog/Dockerfile`
- `catalog/views/index.ejs`
- `catalog/public/css/styles.css`

## Files to Modify

- `dragon-radar-api/server.js` - Add swagger-ui-express
- `dragon-radar-api/package.json` - Add dependencies
- `docker-compose.yml` - Add gateway service, update catalog

## Files to Delete

- `catalog/html/` - Old static files
- `catalog/nginx.conf` - Moves to gateway/
- `catalog/html/api-docs/` - Moves to dragon-radar-api
