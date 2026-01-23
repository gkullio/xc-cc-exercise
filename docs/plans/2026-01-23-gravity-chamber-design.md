# Gravity Chamber Control System - Design

## Overview

The Gravity Chamber Control System is the third demo app for the F5 XC demo environment. It demonstrates **private multi-cloud networking** (east/west traffic) by simulating a mission-critical on-premises system that cloud services can reach only through F5 XC's private connectivity.

### Demo Narrative

The Gravity Chamber is mission-critical R&D equipment at Capsule Corp's West City HQ. For safety and regulatory reasons, it cannot be exposed to the public internet. F5 XC provides private multi-cloud networking so cloud-based monitoring tools (the Scouter) can securely reach it without traversing the public internet.

### Architecture

```
Cloud (AWS/Azure)                    On-Premises (West City HQ)
┌─────────────────┐                  ┌─────────────────────────┐
│  Scouter App    │                  │  Gravity Chamber        │
│  (port 3002)    │─── F5 XC ───────▶│  (port 3003)            │
│                 │   Private MCN    │  WebSocket server       │
├─────────────────┤   (mTLS)         └─────────────────────────┘
│  Gravity Viewer │                             ▲
│  (port 3004)    │─────────────────────────────┘
│                 │   (via F5 XC or direct for demo)
└─────────────────┘
```

## Components

### 1. Gravity Chamber (Backend) - Port 3003

**Purpose:** WebSocket-based real-time gravity controller with automated training simulation.

**Deployment:** Standalone at remote/on-prem site (not in main docker-compose).

**Technology:** Node.js 20 / Express / ws library

#### WebSocket API

**Connection:** `ws://<fqdn>:3003/chamber`

**State Broadcast (every second):**
```json
{
  "chamber": {
    "status": "active",
    "gravityLevel": 150,
    "safetyThreshold": 300,
    "powerOutput": 847.5
  },
  "session": {
    "user": "Vegeta",
    "startedAt": "2026-01-23T10:30:00Z",
    "duration": 1847,
    "targetDuration": 3600
  },
  "timestamp": "2026-01-23T11:01:07Z"
}
```

**State Fields:**
- `chamber.status`: `idle` | `active` | `emergency`
- `chamber.gravityLevel`: 1-500 (gravity multiplier)
- `chamber.safetyThreshold`: Maximum safe level for current user
- `chamber.powerOutput`: Calculated kW based on gravity level
- `session.user`: Current trainee (null when idle)
- `session.duration`: Seconds elapsed
- `session.targetDuration`: Planned session length

#### Auto-Simulation Behavior

- Cycles through training sessions automatically
- Users rotate: Vegeta, Goku, Trunks, Piccolo
- Gravity ramps up gradually during session
- Drops to 1x between sessions
- Random "emergency" events (gravity spike, safety shutoff)
- 30-second idle periods between sessions

**No client commands** - read-only state streaming.

### 2. Gravity Viewer (Frontend) - Port 3004

**Purpose:** Retro/manga-inspired UI for lab participants to connect to the Gravity Chamber.

**Deployment:** Part of main docker-compose stack.

**Technology:** Node.js 20 / Express / EJS templates

#### User Flow

1. Participant opens Gravity Viewer in browser
2. Enters FQDN of Gravity Chamber
3. Clicks "CONNECT"
4. If successful: Live gauge shows gravity data
5. If failed: Retro error screen appears

#### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  GRAVITY CHAMBER CONTROL SYSTEM          [Capsule Corp] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  FQDN: [_________________________] [CONNECT]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│         ┌─────────────────────────┐                    │
│         │                         │                    │
│         │      ◯ 150x             │   STATUS: ACTIVE   │
│         │    ╱───────╲            │                    │
│         │   ╱ GRAVITY ╲           │   USER: Vegeta     │
│         │  │   LEVEL   │          │   TIME: 30:47      │
│         │   ╲         ╱           │   TARGET: 60:00    │
│         │    ╲───────╱            │                    │
│         │                         │   POWER: 847.5 kW  │
│         └─────────────────────────┘   SAFE MAX: 300x   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### UI States

- **Disconnected:** FQDN input visible, gauge grayed out
- **Connecting:** "ESTABLISHING LINK..." animation
- **Connected:** Live gauge updates, session info displayed
- **Error:** Retro error screen ("LINK FAILED - CHAMBER UNREACHABLE")

#### Styling

- Orange/dark color scheme (Capsule Corp brand)
- Blocky/bold fonts (DBZ inspired)
- Subtle CRT scanline effect (CSS)
- Dramatic value change animations

### 3. Scouter Tests

New test file: `scouter-app/lib/tests/chamber.js`

#### Test 1: Availability

- Resolve FQDN
- Attempt WebSocket connection to `/chamber`
- **Pass:** Receives at least one state broadcast
- **Fail:** Connection refused or timeout

#### Test 2: Private Network Validation

- DNS lookup on the FQDN
- **Pass:** Resolves to RFC1918 address:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
- **Fail:** Resolves to public IP

## Project Structure

### Gravity Chamber (deployed separately)

```
gravity-chamber/
├── Dockerfile
├── docker-compose.yml   # Standalone for remote deployment
├── package.json
├── server.js            # Express + WebSocket server
└── lib/
    └── simulator.js     # Training session state machine
```

### Gravity Viewer (in main stack)

```
gravity-viewer/
├── Dockerfile
├── package.json
├── server.js            # Express server
├── views/
│   └── index.ejs        # Control panel page
└── public/
    ├── styles.css       # Retro DBZ styling
    └── viewer.js        # WebSocket client, gauge updates
```

### Scouter Updates

```
scouter-app/
└── lib/
    └── tests/
        └── chamber.js   # New: availability + RFC1918 tests
```

## Docker Compose Changes

**Main `docker-compose.yml`** - add viewer only:

```yaml
gravity-viewer:
  build: ./gravity-viewer
  ports:
    - "3004:3004"
  restart: unless-stopped
```

**Gravity Chamber** gets its own `gravity-chamber/docker-compose.yml` for remote deployment.

## Port Summary

| Service | Port | Location |
|---------|------|----------|
| Capsule Store | 3000 | Main stack |
| Dragon Radar API | 3001 | Main stack |
| Scouter App | 3002 | Main stack |
| Gravity Chamber | 3003 | Remote/on-prem |
| Gravity Viewer | 3004 | Main stack |
| Capsule Info | 8080 | Main stack |
