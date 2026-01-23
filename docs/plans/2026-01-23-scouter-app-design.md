# Scouter App Design

F5 XC Configuration Validator for Capsule Corporation Demo

## Overview

The Scouter App is a web-based testing tool that helps lab participants verify their F5 Distributed Cloud configurations are working correctly. Named after the power-level scanning devices from Dragon Ball Z, it "scans" the target applications to measure their security "power level."

## Purpose

Lab participants expose the Dragon Radar API and Capsule Store via F5 XC to the internet. The Scouter App validates that F5 XC protections (WAF, rate limiting, bot protection, etc.) are properly configured by:

1. **Verifying** normal functionality works
2. **Attacking** with malicious requests to confirm they get blocked

## Architecture

### Technology Stack

- **Runtime:** Node.js 20 Alpine
- **Framework:** Express.js
- **Real-time:** WebSocket (ws library)
- **HTTP Client:** axios
- **Port:** 3002

### Directory Structure

```
scouter-app/
├── server.js              # Express + WebSocket server
├── lib/
│   ├── tests/
│   │   ├── radar.js       # Dragon Radar API test implementations
│   │   └── store.js       # Capsule Store test implementations
│   └── runner.js          # Test execution engine with streaming
├── public/
│   ├── index.html         # Single-page UI
│   ├── css/
│   │   └── style.css      # Scouter-themed styling
│   └── js/
│       └── app.js         # WebSocket client, UI interactions
├── Dockerfile             # Node 20 Alpine
└── package.json
```

### Communication Flow

1. User enters FQDNs for Dragon Radar API and/or Capsule Store
2. User selects which test scenarios to run
3. User clicks "Scan Power Level" button
4. Frontend opens WebSocket connection to `/ws/scan`
5. Backend runs tests sequentially, streaming results as JSON messages
6. Frontend updates UI in real-time as each test completes
7. Final "power level" score calculated and displayed
8. Debug data available on-demand for each test

## User Interface

### Layout

Two-panel design:

```
┌─────────────────────────────────────────────────────────────────┐
│  [Scouter Logo]  SCOUTER APP - Scanning Security Power Levels   │
├────────────────────────────┬────────────────────────────────────┤
│                            │                                    │
│   DRAGON RADAR API         │   CAPSULE STORE                    │
│   [radar.example.com    ]  │   [store.example.com           ]   │
│                            │                                    │
│   ☑ Rate Limiting          │   ☑ WAF Protection                 │
│   ☑ Caching Strategy       │   ☑ Bot Protection                 │
│   ☑ Global Performance     │   ☑ DDoS Mitigation                │
│   ☑ API Security           │   ☑ PCI Compliance                 │
│                            │                                    │
│   [⚡ SCAN POWER LEVEL]     │   [⚡ SCAN POWER LEVEL]             │
│                            │                                    │
│   ┌─ Results ────────────┐ │   ┌─ Results ────────────────────┐ │
│   │ ...streaming...      │ │   │ ...streaming...              │ │
│   └──────────────────────┘ │   └──────────────────────────────┘ │
│                            │                                    │
└────────────────────────────┴────────────────────────────────────┘
```

### Result Cards

Each test result displays as a "scouter reading":

```
┌─────────────────────────────────┐
│ ● WAF Protection     [PASS ✓]  │
│ Power Level: 9001              │
│ ───────────────────────────────│
│ ▸ Normal request: 200 OK       │
│ ▸ SQL injection: 403 Blocked   │
│ ▸ XSS attempt: 403 Blocked     │
│                                │
│ [Show Debug Data ▾]            │
└─────────────────────────────────┘
```

### Visual Theme

- Red tint on scanning animation (scouter visor effect)
- Pulsing glow during active scans
- "Power Level" score aggregates test results
- "It's over 9000!" celebration when all tests pass
- Cracked scouter animation on failures (Vegeta's reaction)
- Consistent with capsule-info styling (dark blue, orange/blue accents)

## Test Specifications

### Dragon Radar API Tests

#### 1. Rate Limiting

**Verify Phase:**
- Send single request to `GET /api/radar/scan`
- Expect: 200 response with valid JSON

**Attack Phase:**
- Send 50 requests in 2 seconds
- Expect: Most requests return 429 (Too Many Requests)

**Pass Criteria:**
- Normal request succeeds (200)
- Rapid requests get rate limited (429s)

**Power Level Calculation:**
- Base: 1000 if normal works
- Bonus: +500 per blocked request (up to 3000)

#### 2. Caching Strategy

**Verify Phase:**
- Send request to `GET /api/radar/scan`
- Note response time and cache headers

**Attack Phase (Observation):**
- Send identical request again
- Compare response time and check for cache hit headers

**Pass Criteria:**
- Cache headers present (X-Cache, Age, or similar F5 XC headers)
- Second request faster than first

**Power Level Calculation:**
- Base: 1000 if cache headers present
- Bonus: +100 per 10ms improvement (up to 2000)

#### 3. Global Performance

**Verify Phase:**
- Measure response time to `GET /api/radar/scan`
- Check for F5 XC edge headers

**Pass Criteria:**
- Response time < 200ms

**Power Level Calculation:**
- < 50ms: 3000
- < 100ms: 2500
- < 150ms: 2000
- < 200ms: 1500
- >= 200ms: 500

#### 4. API Security

**Verify Phase:**
- Send valid request to `GET /api/radar/scan`
- Expect: 200 with proper JSON response

**Attack Phase:**
- Malformed JSON in POST body (if applicable)
- SQL-like payload: `GET /api/radar/ball/1' OR '1'='1`
- Oversized request header

**Pass Criteria:**
- Valid requests succeed
- Malicious payloads return 400 or 403

**Power Level Calculation:**
- Base: 1000 if normal works
- Bonus: +500 per blocked attack vector

### Capsule Store Tests

#### 1. WAF Protection

**Verify Phase:**
- Load `GET /` homepage
- Expect: 200 with valid HTML

**Attack Phase:**
- SQL injection: `GET /products?search=' OR '1'='1`
- XSS: `GET /products?search=<script>alert(1)</script>`
- Path traversal: `GET /../../etc/passwd`

**Pass Criteria:**
- Normal requests succeed
- Attack payloads return 403

**Power Level Calculation:**
- Base: 1000 if normal works
- Bonus: +1000 per blocked attack type (up to 3000)

#### 2. Bot Protection

**Verify Phase:**
- Send normal request with standard browser User-Agent
- Expect: 200 response

**Attack Phase:**
- Rapid login attempts: 10 POST requests to `/api/auth/login` in 5 seconds
- Bad User-Agent: `python-requests/2.25.1` or empty
- Missing headers: No cookies, no referer

**Pass Criteria:**
- Normal request works
- Bot-like behavior challenged or blocked (403, CAPTCHA redirect, or rate limit)

**Power Level Calculation:**
- Base: 1000 if normal works
- Bonus: +700 per detected bot behavior

#### 3. DDoS Mitigation

**Verify Phase:**
- Confirm store responds normally to single request
- Expect: 200 with reasonable response time

**Attack Phase:**
- Send 100 requests in 3 seconds (simulated traffic spike)
- Track how many succeed vs throttled

**Pass Criteria:**
- Some requests get rate limited or queued
- No complete service denial (at least some 200s)

**Power Level Calculation:**
- All requests succeed (no protection): 500
- 20-50% throttled: 2000
- 50%+ throttled: 3000

#### 4. PCI Compliance

**Verify Phase:**
- Check HTTPS enforcement (redirect from HTTP)
- Verify security headers present:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security
- Check no sensitive data in URL parameters

**Attack Phase:**
- Attempt to access checkout via HTTP
- Try to send card number in URL query param

**Pass Criteria:**
- Security headers present
- HTTP redirects to HTTPS
- Sensitive data in URLs blocked

**Power Level Calculation:**
- +500 per security header present
- +500 for HTTPS enforcement
- +500 for URL data protection

## Integration

### Docker Configuration

Add to `docker-compose.yml`:

```yaml
scouter-app:
  build: ./scouter-app
  ports:
    - "3002:3002"
  restart: unless-stopped
```

### Capsule-Info Navigation

Add "Scouter" as third tab in navigation bar, linking to the Scouter App (either embedded or as external link to port 3002).

## WebSocket Protocol

### Client -> Server

```json
{
  "action": "scan",
  "targets": {
    "radar": {
      "fqdn": "radar.student01.f5demo.com",
      "tests": ["rate-limiting", "caching", "performance", "security"]
    },
    "store": {
      "fqdn": "store.student01.f5demo.com",
      "tests": ["waf", "bot", "ddos", "pci"]
    }
  }
}
```

### Server -> Client (Streaming)

Test start:
```json
{
  "type": "test-start",
  "target": "radar",
  "test": "rate-limiting",
  "name": "Rate Limiting"
}
```

Test result:
```json
{
  "type": "test-result",
  "target": "radar",
  "test": "rate-limiting",
  "status": "pass",
  "powerLevel": 3500,
  "summary": "Normal request: 200 OK. 47/50 rapid requests blocked.",
  "details": [
    {"phase": "verify", "result": "200 OK", "timing": 45},
    {"phase": "attack", "result": "47 blocked, 3 allowed", "timing": 2100}
  ],
  "debug": {
    "requests": [...],
    "responses": [...],
    "headers": {...}
  }
}
```

Scan complete:
```json
{
  "type": "scan-complete",
  "target": "radar",
  "totalPowerLevel": 11500,
  "maxPossible": 12000,
  "message": "It's over 9000!"
}
```

## Error Handling

- Connection timeout: Show "Target unreachable" with troubleshooting tips
- Invalid FQDN: Client-side validation before scanning
- Test failure: Show detailed error with debug data expanded by default
- WebSocket disconnect: Auto-reconnect with exponential backoff

## Future Considerations (Not in Scope)

- Test result persistence/history
- Comparison between scans
- Custom test thresholds
- Export results as PDF/JSON
- Multi-student leaderboard
