# Catalog-Based Path Routing Design

**Date:** 2026-01-23
**Status:** Approved

## Overview

Simplify lab system app exposure by replacing subdomain-based routing with IP:port access and path-based routing through a catalog service.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LAB NETWORK                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   EXTERNAL ACCESS:                                              │
│   Port 8080 ──► capsule-info (portal + scouter proxy)          │
│   Port 8081 ──► catalog (nginx, adds X-Internal-Request)       │
│                    ├── /              → catalog landing page    │
│                    ├── /store/*       → capsule-store:3000     │
│                    ├── /api/*         → dragon-radar-api:3001  │
│                    ├── /api-docs/     → OAS viewer (static)    │
│                    └── /gravity/*     → gravity-viewer:3002    │
│                                                                 │
│   APP PORTS (directly accessible):                             │
│   Port 3000 ──► capsule-store                                  │
│   Port 3001 ──► dragon-radar-api                               │
│   Port 3002 ──► gravity-viewer                                 │
│                                                                 │
│   INTERNAL ONLY (not exposed to host):                         │
│   Port 4000 ──► scouter-app (proxied through info)             │
│   Port 4001 ──► gravity-chamber (backend for viewer)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Port Scheme

- `8080-8081` - Entry points (info, catalog)
- `3000-3002` - Browsable apps (store, API, gravity-viewer)
- `4000-4001` - Internal services (scouter, gravity-chamber)

### What's Removed

- Nginx reverse proxy on port 80
- All subdomain routing (*.cc.local)
- Chrome/Kasm browser container

## Internal Access Indicator

### Header Mechanism

When catalog proxies requests, nginx adds:
```
X-Internal-Request: true
X-Base-Path: /store  (or /api, /gravity)
```

### Visual Banner

Fixed yellow/orange banner at top of page: "INTERNAL ACCESS ONLY"

- **Catalog:** Always shows the banner
- **Store & Gravity-viewer:** Show banner only when `X-Internal-Request: true` header present
- **Style:** `background: #f59e0b` (amber), white text, full-width, fixed position

### API Response Modification

When `X-Internal-Request: true` header is present, dragon-radar-api adds `"internal": true` to all responses:

```json
// Direct access (port 3001)
{ "balls": [...] }

// Via catalog (port 8081/api/*)
{ "balls": [...], "internal": true }
```

## Catalog Page Design

### Branding

Matches capsule-info's Capsule Corp branding:
- Same color scheme (blues, corporate feel)
- Same fonts and styling
- Capsule Corp logo/header

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠  INTERNAL ACCESS ONLY                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            [Capsule Corp Logo]                                  │
│            INTERNAL APP CATALOG                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │   STORE     │  │  RADAR API  │  │   GRAVITY   │            │
│   │             │  │             │  │   CHAMBER   │            │
│   │ E-commerce  │  │ Dragon Ball │  │             │            │
│   │ Platform    │  │ Locations   │  │  Training   │            │
│   │             │  │             │  │  Simulator  │            │
│   │  [Browse]   │  │   [Docs]    │  │   [Open]    │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Store card → `/store/`
- Radar API card → `/api-docs/` (OAS viewer)
- Gravity Chamber card → `/gravity/`

### OAS Viewer

Catalog serves a lightweight OpenAPI viewer (Swagger UI or Redoc) at `/api-docs/` that loads the spec. The API at `/api/*` remains directly usable and returns JSON.

## Path-Based Routing & Asset Handling

### The Challenge

Apps accessed via `/store/*`, `/gravity/*` need their internal links and assets to work correctly when mounted at a non-root path.

### Dynamic Base Path Detection

Apps check for `X-Base-Path` header to determine their base path:

```javascript
// Middleware in store/gravity-viewer
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});
```

### Template Usage

```html
<base href="<%= basePath %>/">
<!-- or prefix assets -->
<link href="<%= basePath %>/css/style.css">
<a href="<%= basePath %>/products">Products</a>
```

### Access Behavior

| Access method | `X-Base-Path` | `basePath` value | Asset URL |
|---------------|---------------|------------------|-----------|
| `:3000/` | (none) | `""` | `/css/style.css` |
| `:8081/store/` | `/store` | `/store` | `/store/css/style.css` |

Same app code, same container, works in both contexts.

## Docker Compose Changes

### Services to Modify

| Service | Port change | Other changes |
|---------|-------------|---------------|
| capsule-info | 8080 (unchanged) | Update scouter proxy to 4000 |
| catalog | New service on 8081 | Nginx with proxy config |
| capsule-store | 3000 (unchanged) | Add basePath/internal middleware |
| dragon-radar-api | 3001 (unchanged) | Add internal response wrapper |
| gravity-viewer | 3004 → 3002 | Add basePath/internal middleware |
| gravity-chamber | 3003 → 4001 | Internal only (no host port) |
| scouter-app | 3002 → 4000 | Internal only (no host port) |

### Services to Remove

- `nginx` (port 80 reverse proxy)
- `chrome` (Kasm browser)

### New Catalog Service

```yaml
catalog:
  build: ./catalog
  ports:
    - "8081:8081"
  depends_on:
    - capsule-store
    - dragon-radar-api
    - gravity-viewer
```

### Network

Single `lab` bridge network (unchanged concept, simplified routing).
