# Lab Environment Compose Design

## Overview

Docker Compose configuration for F5 XC lab environments. Each participant gets an isolated environment with Chrome-in-container access to demo services via NGINX reverse proxy.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Lab Participant Environment                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐         ┌──────────────────────────────────┐     │
│   │   Kasmweb    │         │      NGINX Reverse Proxy         │     │
│   │   Chrome     │────────►│           :80                    │     │
│   │   :6901      │         │  cc.local/info  → info:8080      │     │
│   │              │         │  cc.local/store → store:3000     │     │
│   │ extra_hosts: │         │  cc.local/radar → radar:3001     │     │
│   │ cc.local→nginx│        │  cc.local/gravity→gravity:3002   │     │
│   └──────────────┘         └──────────────────────────────────┘     │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Application Services                      │   │
│   ├─────────────┬─────────────┬─────────────┬───────────────────┤   │
│   │ capsule-info│ capsule-store│dragon-radar │ gravity-viewer   │   │
│   │    :8080    │    :3000     │   :3001     │     :3002        │   │
│   ├─────────────┼─────────────┴─────────────┴───────────────────┤   │
│   │ scouter-app │         ▲ CE Origin Pool Targets              │   │
│   │    :8081    │         (IP:3000, IP:3001, IP:3002)           │   │
│   └─────────────┴───────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Port Assignments

| Component | Port | Purpose |
|-----------|------|---------|
| Kasmweb Chrome | 6901 | Browser access (no auth) |
| NGINX | 80 | Path routing for `cc.local` |
| capsule-info | 8080 | Portal (internal) |
| scouter-app | 8081 | Security validator (internal) |
| capsule-store | 3000 | CE origin pool target |
| dragon-radar-api | 3001 | CE origin pool target |
| gravity-viewer | 3002 | CE origin pool target |

## Access Paths

- **Lab participant:** `http://<host-ip>:6901` → Kasmweb Chrome (no password)
- **Inside Chrome:** `http://cc.local/info`, `/store`, `/radar`, `/gravity`
- **CE origin pools:** `<host-ip>:3000`, `:3001`, `:3002` (direct IP:port)

## Files to Create

### docker-compose.lab.yml

```yaml
services:
  # --- Browser Access ---
  chrome:
    image: kasmweb/chrome:1.15.0
    ports:
      - "6901:6901"
    environment:
      - VNC_PW=
    extra_hosts:
      - "cc.local:nginx"
    shm_size: "2g"
    restart: always
    depends_on:
      - nginx

  # --- Reverse Proxy ---
  nginx:
    build: ./nginx
    ports:
      - "80:80"
    restart: always
    depends_on:
      - capsule-info
      - capsule-store
      - dragon-radar-api
      - gravity-viewer

  # --- Internal Services (8080 range) ---
  capsule-info:
    image: ghcr.io/f5xc-salesdemos/capsule-info:latest
    pull_policy: always
    ports:
      - "8080:8080"
    restart: always
    depends_on:
      - scouter-app

  scouter-app:
    image: ghcr.io/f5xc-salesdemos/scouter-app:latest
    pull_policy: always
    ports:
      - "8081:3002"
    restart: always

  # --- Origin Pool Targets (3000 range) ---
  capsule-store:
    image: ghcr.io/f5xc-salesdemos/capsule-store:latest
    pull_policy: always
    ports:
      - "3000:3000"
    restart: always

  dragon-radar-api:
    image: ghcr.io/f5xc-salesdemos/dragon-radar-api:latest
    pull_policy: always
    ports:
      - "3001:3001"
    restart: always

  gravity-viewer:
    image: ghcr.io/f5xc-salesdemos/gravity-viewer:latest
    pull_policy: always
    ports:
      - "3002:3004"
    restart: always
```

### nginx/Dockerfile

```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### nginx/nginx.conf

```nginx
upstream capsule_info {
    server capsule-info:8080;
}
upstream capsule_store {
    server capsule-store:3000;
}
upstream dragon_radar {
    server dragon-radar-api:3001;
}
upstream gravity_viewer {
    server gravity-viewer:3004;
}

server {
    listen 80;
    server_name cc.local;

    # Portal
    location /info {
        proxy_pass http://capsule_info/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Origin pool targets
    location /store {
        proxy_pass http://capsule_store/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /radar {
        proxy_pass http://dragon_radar/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /gravity {
        proxy_pass http://gravity_viewer/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Default redirect to portal
    location / {
        return 302 /info;
    }
}
```

## Usage

```bash
# Start lab environment
docker compose -f docker-compose.lab.yml up -d

# Stop lab environment
docker compose -f docker-compose.lab.yml down
```

## Lab Snapshot Notes

- Run `docker compose -f docker-compose.lab.yml up -d` before snapshotting
- `restart: always` ensures containers start on VM boot
- `pull_policy: always` ensures fresh images on every `docker compose up`
