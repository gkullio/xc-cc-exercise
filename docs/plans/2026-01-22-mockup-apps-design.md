# Dragon Ball Mockup Apps Design

Demo applications for F5 Distributed Cloud onsite presentation with Capsule Corp / Dragon Ball theming.

## Overview

Two containerized Node.js/Express applications:

| App | Port | Purpose |
|-----|------|---------|
| Dragon Radar API | 3001 | Dynamic API returning Dragon Ball locations |
| Capsule Store | 3000 | E-commerce site with cart functionality |

---

## Dragon Radar API

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/radar/scan` | GET | Returns all 7 balls with current coordinates, signal strength |
| `/api/radar/ball/:id` | GET | Single ball details (1-7) |
| `/api/radar/distance` | GET | Distance from provided lat/long to nearest ball |
| `/api/radar/health` | GET | Health check |

### Behavior

- Ball coordinates update every 30 seconds with small random drift
- Signal strength varies by "distance" from West City
- Responses include fake latency field for demo narratives
- Rate limit headers included in responses

### Sample Response

```json
{
  "timestamp": "2026-01-22T10:30:00Z",
  "source": "West City Research Lab",
  "balls": [
    { "id": 1, "stars": 1, "lat": 35.6762, "long": 139.6503, "signal": 0.87 },
    { "id": 2, "stars": 2, "lat": -22.9068, "long": -43.1729, "signal": 0.34 }
  ]
}
```

### Error Responses

Themed errors: `"error": "Radar interference detected - Red Ribbon jamming suspected"`

---

## Capsule Store E-Commerce

### Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with featured capsules |
| `/products` | Full catalog grid |
| `/products/:id` | Product detail page |
| `/cart` | View cart, update quantities |
| `/checkout` | Mock checkout form |
| `/login` | Simple login form |
| `/account` | Order history (mocked) |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | List all capsules |
| `/api/products/:id` | GET | Single product |
| `/api/cart` | GET | Current cart contents |
| `/api/cart` | POST | Add item to cart |
| `/api/cart/:id` | DELETE | Remove item |
| `/api/checkout` | POST | Submit order (mock) |
| `/api/auth/login` | POST | Login (returns session) |

### Product Catalog (~12 items)

| ID | Name | Price |
|----|------|-------|
| 1 | Capsule #1: House | Ƶ500,000 |
| 2 | Capsule #2: Sedan | Ƶ50,000 |
| 3 | Capsule #3: Motorcycle | Ƶ25,000 |
| 4 | Capsule #4: Boat | Ƶ75,000 |
| 5 | Capsule #5: Jet | Ƶ2,000,000 |
| 6 | Capsule #9: Refrigerator | Ƶ5,000 |
| 7 | Capsule #15: Camper | Ƶ150,000 |
| 8 | Capsule #21: Submarine | Ƶ500,000 |
| 9 | Capsule #30: Toolkit | Ƶ1,000 |
| 10 | Capsule #35: Emergency Kit | Ƶ2,500 |
| 11 | Capsule #40: Gravity Chamber | Ƶ10,000,000 |
| 12 | Capsule #50: Time Machine (Prototype) | Ƶ999,999,999 |

### Authentication

Simple mock auth with express-session. Username/password stored in memory. No real security - just demo flow for showing API protection.

### Theming

- Orange/blue Capsule Corp color scheme
- Capsule Corp logo in header
- Prices in Zeni (Ƶ)
- Product descriptions reference the show
- Error pages: "Oops! Looks like Vegeta broke something."
- Footer: "© Capsule Corporation - West City"

---

## Project Structure

```
onsite/
├── dragon-radar-api/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── lib/
│   │   └── radar.js
│   └── data/
│       └── balls.json
│
├── capsule-store/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── routes/
│   │   ├── pages.js
│   │   └── api.js
│   ├── lib/
│   │   ├── products.js
│   │   ├── cart.js
│   │   └── auth.js
│   ├── data/
│   │   └── products.json
│   └── views/
│       ├── layout.ejs
│       ├── home.ejs
│       ├── products.ejs
│       ├── product.ejs
│       ├── cart.ejs
│       ├── checkout.ejs
│       └── login.ejs
│
└── docs/
    └── plans/
```

---

## Container Setup

### Dockerfile (same pattern for both)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Build & Run

```bash
# Build
docker build -t dragon-radar-api ./dragon-radar-api
docker build -t capsule-store ./capsule-store

# Run
docker run -p 3001:3001 dragon-radar-api
docker run -p 3000:3000 capsule-store
```

### Environment Variables

| Var | Service | Description |
|-----|---------|-------------|
| `PORT` | Both | Override default port |
| `RADAR_API_URL` | capsule-store | Optional - if store needs to call radar |

---

## Dependencies

### dragon-radar-api

- `express` - Web framework

### capsule-store

- `express` - Web framework
- `ejs` - Templates
- `express-session` - Session handling

---

## Demo Scenarios

These apps support the following F5 XC demo scenarios:

1. **API Security** - Protect Dragon Radar and e-commerce APIs
2. **DDoS Protection** - Simulate attacks during "product launch"
3. **Bot Protection** - Cart/checkout endpoints
4. **Rate Limiting** - Dragon Radar scan endpoint
5. **WAF** - SQL injection attempts on product search
6. **Performance** - Show latency differences by region
