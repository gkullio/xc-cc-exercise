# F5 XC Demo Environment

A containerized demo environment for F5 Distributed Cloud sales engineering exercises. Includes sample applications and a security configuration validator.

## Local Development

```bash
docker compose up -d
```

Open http://localhost:8080

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    capsule-info (:8080)                     │
│              Main portal with navigation                     │
│         Challenge | Demo Apps | Scouter (validator)         │
├─────────────────────────────────────────────────────────────┤
│  /ws/scan  ──proxy──►  scouter-app (:3002)                  │
│                        Security test backend                 │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
   dragon-radar-api (:3001)        capsule-store (:3000)
   REST API demo                   E-commerce demo
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| capsule-info | 8080 | Main portal - challenge brief, app docs, security validator |
| capsule-store | 3000 | E-commerce storefront (EJS templates, sessions, cart) |
| dragon-radar-api | 3001 | REST API returning mock geolocation data |
| scouter-app | 3002 | Security test backend (WebSocket, proxied through capsule-info) |

## Demo Applications

### Dragon Radar API

REST API simulating a location tracking service.

**Endpoints:**
- `GET /api/radar/scan` - Get all locations
- `GET /api/radar/ball/:id` - Get single location
- `GET /health` - Health check

**Test scenarios:** Rate limiting, caching, API security

### Capsule Store

Server-rendered e-commerce application.

**Pages:** Homepage, product catalog, cart, login, checkout

**Credentials:**
- `demo` / `demo`
- `bulma` / `capsule123`
- `goku` / `kamehameha`

**Test scenarios:** WAF (SQLi, XSS), bot protection, DDoS mitigation, PCI compliance

## Security Validator (Scouter)

The Scouter tab in capsule-info runs automated security tests against the demo apps.

**API Tests (Dragon Radar):**
- Rate Limiting - Sends 50 rapid requests, expects 429 responses
- Caching - Checks cache headers and response time improvement
- Performance - Measures latency
- Security - Tests SQLi, path traversal, oversized headers

**Web App Tests (Capsule Store):**
- WAF - SQLi, XSS, path traversal blocking
- Bot Protection - User-Agent filtering, credential stuffing limits
- DDoS Mitigation - 100 concurrent requests, expects throttling
- PCI Compliance - Security headers, HTTPS

**Target FQDNs (from within Docker):**
- Dragon Radar: `http://dragon-radar-api:3001`
- Capsule Store: `http://capsule-store:3000`

## Development

Run individual services locally:

```bash
cd dragon-radar-api && npm install && npm start
cd capsule-store && npm install && npm start
cd scouter-app && npm install && npm start
```

Rebuild after changes:

```bash
docker compose build
docker compose up -d
```

## Stack

- Node.js 20
- Express
- EJS (capsule-store)
- WebSocket (scouter-app)
- Nginx (capsule-info)
- Docker Compose
