# Dragon Ball Mockup Apps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build two containerized demo APIs (Dragon Radar + Capsule Store) for F5 XC onsite presentation.

**Architecture:** Two independent Express.js apps. Dragon Radar API returns dynamic ball positions with drift simulation. Capsule Store is server-rendered EJS with cart stored in session.

**Tech Stack:** Node.js 20, Express, EJS, express-session, Docker

---

## Part 1: Dragon Radar API

### Task 1: Initialize Dragon Radar API Project

**Files:**
- Create: `dragon-radar-api/package.json`
- Create: `dragon-radar-api/server.js`

**Step 1: Create directory structure**

```bash
mkdir -p dragon-radar-api
```

**Step 2: Create package.json**

Create `dragon-radar-api/package.json`:

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
    "express": "^4.18.2"
  }
}
```

**Step 3: Create minimal server.js**

Create `dragon-radar-api/server.js`:

```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.get('/api/radar/health', (req, res) => {
  res.json({ status: 'operational', message: 'Shenron awaits' });
});

app.listen(PORT, () => {
  console.log(`Dragon Radar API running on port ${PORT}`);
});
```

**Step 4: Install dependencies and test**

```bash
cd dragon-radar-api && npm install && npm start
```

Expected: Server starts, `curl http://localhost:3001/api/radar/health` returns health JSON.

**Step 5: Stop server (Ctrl+C)**

---

### Task 2: Add Ball Position Data and Drift Logic

**Files:**
- Create: `dragon-radar-api/data/balls.json`
- Create: `dragon-radar-api/lib/radar.js`

**Step 1: Create initial ball positions**

Create `dragon-radar-api/data/balls.json`:

```json
[
  { "id": 1, "stars": 1, "lat": 35.6762, "long": 139.6503, "region": "Japan" },
  { "id": 2, "stars": 2, "lat": -22.9068, "long": -43.1729, "region": "Brazil" },
  { "id": 3, "stars": 3, "lat": 51.5074, "long": -0.1278, "region": "UK" },
  { "id": 4, "stars": 4, "lat": 40.7128, "long": -74.0060, "region": "USA" },
  { "id": 5, "stars": 5, "lat": -33.8688, "long": 151.2093, "region": "Australia" },
  { "id": 6, "stars": 6, "lat": 55.7558, "long": 37.6173, "region": "Russia" },
  { "id": 7, "stars": 7, "lat": 30.0444, "long": 31.2357, "region": "Egypt" }
]
```

**Step 2: Create radar logic module**

Create `dragon-radar-api/lib/radar.js`:

```javascript
const initialBalls = require('../data/balls.json');

// West City coordinates (base location)
const WEST_CITY = { lat: 34.0522, long: -118.2437 };

// Store current positions (drifted from initial)
let balls = JSON.parse(JSON.stringify(initialBalls));
let lastUpdate = Date.now();

// Update ball positions every 30 seconds with small drift
function updatePositions() {
  const now = Date.now();
  if (now - lastUpdate < 30000) return;

  lastUpdate = now;
  balls = balls.map(ball => ({
    ...ball,
    lat: ball.lat + (Math.random() - 0.5) * 0.1,
    long: ball.long + (Math.random() - 0.5) * 0.1
  }));
}

// Calculate distance between two points (haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate signal strength (closer to West City = stronger)
function calculateSignal(ball) {
  const distance = calculateDistance(WEST_CITY.lat, WEST_CITY.long, ball.lat, ball.long);
  const maxDistance = 20000; // ~half Earth circumference
  return Math.max(0.1, 1 - (distance / maxDistance));
}

function getAllBalls() {
  updatePositions();
  return balls.map(ball => ({
    id: ball.id,
    stars: ball.stars,
    lat: Math.round(ball.lat * 10000) / 10000,
    long: Math.round(ball.long * 10000) / 10000,
    signal: Math.round(calculateSignal(ball) * 100) / 100,
    region: ball.region
  }));
}

function getBallById(id) {
  updatePositions();
  const ball = balls.find(b => b.id === id);
  if (!ball) return null;
  return {
    id: ball.id,
    stars: ball.stars,
    lat: Math.round(ball.lat * 10000) / 10000,
    long: Math.round(ball.long * 10000) / 10000,
    signal: Math.round(calculateSignal(ball) * 100) / 100,
    region: ball.region,
    distanceFromWestCity: Math.round(calculateDistance(WEST_CITY.lat, WEST_CITY.long, ball.lat, ball.long))
  };
}

function getNearestBall(lat, long) {
  updatePositions();
  let nearest = null;
  let minDistance = Infinity;

  for (const ball of balls) {
    const distance = calculateDistance(lat, long, ball.lat, ball.long);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = ball;
    }
  }

  return {
    ball: getBallById(nearest.id),
    distance: Math.round(minDistance)
  };
}

module.exports = { getAllBalls, getBallById, getNearestBall };
```

**Step 3: Verify file created**

```bash
ls -la dragon-radar-api/lib/
```

Expected: `radar.js` exists.

---

### Task 3: Add All Dragon Radar API Endpoints

**Files:**
- Modify: `dragon-radar-api/server.js`

**Step 1: Update server.js with all routes**

Replace `dragon-radar-api/server.js` with:

```javascript
const express = require('express');
const { getAllBalls, getBallById, getNearestBall } = require('./lib/radar');

const app = express();
const PORT = process.env.PORT || 3001;

// Add rate limit headers to all responses (for F5 demo)
app.use((req, res, next) => {
  res.set('X-RateLimit-Limit', '100');
  res.set('X-RateLimit-Remaining', '99');
  res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60);
  next();
});

// Health check
app.get('/api/radar/health', (req, res) => {
  res.json({
    status: 'operational',
    message: 'Shenron awaits',
    timestamp: new Date().toISOString()
  });
});

// Scan all balls
app.get('/api/radar/scan', (req, res) => {
  const startTime = Date.now();
  const balls = getAllBalls();
  const processingTime = Date.now() - startTime;

  res.json({
    timestamp: new Date().toISOString(),
    source: 'West City Research Lab',
    processingTimeMs: processingTime,
    count: balls.length,
    balls
  });
});

// Get single ball
app.get('/api/radar/ball/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id) || id < 1 || id > 7) {
    return res.status(400).json({
      error: 'Invalid ball ID',
      message: 'Dragon Balls are numbered 1-7. Did Pilaf steal your math skills?'
    });
  }

  const ball = getBallById(id);

  if (!ball) {
    return res.status(404).json({
      error: 'Ball not found',
      message: 'Radar interference detected - Red Ribbon jamming suspected'
    });
  }

  res.json({
    timestamp: new Date().toISOString(),
    source: 'West City Research Lab',
    ball
  });
});

// Get nearest ball from coordinates
app.get('/api/radar/distance', (req, res) => {
  const lat = parseFloat(req.query.lat);
  const long = parseFloat(req.query.long);

  if (isNaN(lat) || isNaN(long)) {
    return res.status(400).json({
      error: 'Invalid coordinates',
      message: 'Provide lat and long query parameters. Even Goku could figure this out.'
    });
  }

  if (lat < -90 || lat > 90 || long < -180 || long > 180) {
    return res.status(400).json({
      error: 'Coordinates out of range',
      message: 'Are you searching on Namek? Earth coordinates only please.'
    });
  }

  const result = getNearestBall(lat, long);

  res.json({
    timestamp: new Date().toISOString(),
    source: 'West City Research Lab',
    searchLocation: { lat, long },
    nearest: result.ball,
    distanceKm: result.distance
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'This radar frequency is not monitored. Try /api/radar/scan'
  });
});

app.listen(PORT, () => {
  console.log(`Dragon Radar API operational on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/radar/health');
  console.log('  GET /api/radar/scan');
  console.log('  GET /api/radar/ball/:id');
  console.log('  GET /api/radar/distance?lat=X&long=Y');
});
```

**Step 2: Test all endpoints**

```bash
cd dragon-radar-api && npm start
```

In another terminal:
```bash
curl http://localhost:3001/api/radar/health
curl http://localhost:3001/api/radar/scan
curl http://localhost:3001/api/radar/ball/1
curl "http://localhost:3001/api/radar/distance?lat=35.6&long=139.6"
```

Expected: All return themed JSON responses.

**Step 3: Stop server**

---

### Task 4: Add Dragon Radar Dockerfile

**Files:**
- Create: `dragon-radar-api/Dockerfile`

**Step 1: Create Dockerfile**

Create `dragon-radar-api/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

**Step 2: Build and test container**

```bash
docker build -t dragon-radar-api ./dragon-radar-api
docker run -p 3001:3001 dragon-radar-api
```

Expected: Container starts, endpoints work.

**Step 3: Stop container (Ctrl+C)**

---

## Part 2: Capsule Store

### Task 5: Initialize Capsule Store Project

**Files:**
- Create: `capsule-store/package.json`
- Create: `capsule-store/server.js`

**Step 1: Create directory structure**

```bash
mkdir -p capsule-store/{routes,lib,data,views,public/css,public/images}
```

**Step 2: Create package.json**

Create `capsule-store/package.json`:

```json
{
  "name": "capsule-store",
  "version": "1.0.0",
  "description": "Capsule Corp e-commerce demo for F5 XC",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ejs": "^3.1.9",
    "express-session": "^1.17.3"
  }
}
```

**Step 3: Create minimal server.js**

Create `capsule-store/server.js`:

```javascript
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'capsule-corp-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'operational', store: 'Capsule Corp' });
});

// Placeholder home route
app.get('/', (req, res) => {
  res.send('Capsule Corp Store - Coming Soon');
});

app.listen(PORT, () => {
  console.log(`Capsule Store running on port ${PORT}`);
});
```

**Step 4: Install dependencies and test**

```bash
cd capsule-store && npm install && npm start
```

Expected: Server starts on port 3000.

**Step 5: Stop server**

---

### Task 6: Add Product Catalog Data and Logic

**Files:**
- Create: `capsule-store/data/products.json`
- Create: `capsule-store/lib/products.js`

**Step 1: Create product catalog**

Create `capsule-store/data/products.json`:

```json
[
  {
    "id": 1,
    "name": "Capsule #1: House",
    "capsuleNumber": 1,
    "description": "A fully-furnished 3-bedroom house. Just throw it on the ground and watch it expand! Perfect for adventurers who need a comfortable base camp.",
    "price": 500000,
    "category": "housing",
    "image": "/images/capsule-house.png",
    "inStock": true
  },
  {
    "id": 2,
    "name": "Capsule #2: Sedan",
    "capsuleNumber": 2,
    "description": "Dr. Brief's daily driver. Reliable hover-car with excellent fuel efficiency. Fits 5 passengers comfortably.",
    "price": 50000,
    "category": "vehicles",
    "image": "/images/capsule-car.png",
    "inStock": true
  },
  {
    "id": 3,
    "name": "Capsule #3: Motorcycle",
    "capsuleNumber": 3,
    "description": "High-speed hover-bike. Bulma's favorite for quick trips. Top speed: 500 km/h.",
    "price": 25000,
    "category": "vehicles",
    "image": "/images/capsule-bike.png",
    "inStock": true
  },
  {
    "id": 4,
    "name": "Capsule #4: Boat",
    "capsuleNumber": 4,
    "description": "Luxury yacht with sleeping quarters. Transforms in water automatically. Includes fishing gear.",
    "price": 75000,
    "category": "vehicles",
    "image": "/images/capsule-boat.png",
    "inStock": true
  },
  {
    "id": 5,
    "name": "Capsule #5: Jet",
    "capsuleNumber": 5,
    "description": "Mach 2.5 capable personal jet. Fits in your pocket, flies you anywhere. Autopilot included.",
    "price": 2000000,
    "category": "vehicles",
    "image": "/images/capsule-jet.png",
    "inStock": true
  },
  {
    "id": 6,
    "name": "Capsule #9: Refrigerator",
    "capsuleNumber": 9,
    "description": "Portable refrigerator perfect for picnics and training sessions. Keeps senzu beans fresh!",
    "price": 5000,
    "category": "appliances",
    "image": "/images/capsule-fridge.png",
    "inStock": true
  },
  {
    "id": 7,
    "name": "Capsule #15: Camper",
    "capsuleNumber": 15,
    "description": "Mobile home with kitchen, bathroom, and sleeping for 4. Essential for Dragon Ball hunting expeditions.",
    "price": 150000,
    "category": "housing",
    "image": "/images/capsule-camper.png",
    "inStock": true
  },
  {
    "id": 8,
    "name": "Capsule #21: Submarine",
    "capsuleNumber": 21,
    "description": "Deep-sea exploration vessel. Rated to 10,000 meters. Perfect for underwater Dragon Ball retrieval.",
    "price": 500000,
    "category": "vehicles",
    "image": "/images/capsule-sub.png",
    "inStock": true
  },
  {
    "id": 9,
    "name": "Capsule #30: Toolkit",
    "capsuleNumber": 30,
    "description": "Complete mechanic's toolkit. Everything you need to repair vehicles or build a time machine.",
    "price": 1000,
    "category": "tools",
    "image": "/images/capsule-tools.png",
    "inStock": true
  },
  {
    "id": 10,
    "name": "Capsule #35: Emergency Kit",
    "capsuleNumber": 35,
    "description": "Survival essentials: first aid, food rations, water, shelter. Recommended by Kami himself.",
    "price": 2500,
    "category": "tools",
    "image": "/images/capsule-emergency.png",
    "inStock": true
  },
  {
    "id": 11,
    "name": "Capsule #40: Gravity Chamber",
    "capsuleNumber": 40,
    "description": "As used by Vegeta for 400G training. Adjustable gravity from 1x to 500x Earth normal. Saiyan-grade construction.",
    "price": 10000000,
    "category": "training",
    "image": "/images/capsule-gravity.png",
    "inStock": true
  },
  {
    "id": 12,
    "name": "Capsule #50: Time Machine (Prototype)",
    "capsuleNumber": 50,
    "description": "PROTOTYPE - NOT FOR SALE TO GENERAL PUBLIC. Trunks-approved temporal displacement device. Warning: May create alternate timelines.",
    "price": 999999999,
    "category": "experimental",
    "image": "/images/capsule-time.png",
    "inStock": false
  }
]
```

**Step 2: Create products module**

Create `capsule-store/lib/products.js`:

```javascript
const products = require('../data/products.json');

function getAllProducts() {
  return products;
}

function getProductById(id) {
  return products.find(p => p.id === id) || null;
}

function getProductsByCategory(category) {
  return products.filter(p => p.category === category);
}

function getFeaturedProducts() {
  // Return a few popular items for homepage
  return [1, 2, 5, 11].map(id => getProductById(id)).filter(Boolean);
}

function formatPrice(price) {
  return `Ƶ${price.toLocaleString()}`;
}

module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  getFeaturedProducts,
  formatPrice
};
```

**Step 3: Verify files created**

```bash
ls -la capsule-store/data/
ls -la capsule-store/lib/
```

---

### Task 7: Add Cart Logic

**Files:**
- Create: `capsule-store/lib/cart.js`

**Step 1: Create cart module**

Create `capsule-store/lib/cart.js`:

```javascript
const { getProductById } = require('./products');

function getCart(session) {
  if (!session.cart) {
    session.cart = [];
  }
  return session.cart;
}

function addToCart(session, productId, quantity = 1) {
  const cart = getCart(session);
  const product = getProductById(productId);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  if (!product.inStock) {
    return { success: false, error: 'Product out of stock' };
  }

  const existing = cart.find(item => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      productId,
      quantity,
      addedAt: new Date().toISOString()
    });
  }

  return { success: true, cart: getCartWithDetails(session) };
}

function removeFromCart(session, productId) {
  const cart = getCart(session);
  const index = cart.findIndex(item => item.productId === productId);

  if (index === -1) {
    return { success: false, error: 'Item not in cart' };
  }

  cart.splice(index, 1);
  return { success: true, cart: getCartWithDetails(session) };
}

function updateQuantity(session, productId, quantity) {
  const cart = getCart(session);
  const item = cart.find(item => item.productId === productId);

  if (!item) {
    return { success: false, error: 'Item not in cart' };
  }

  if (quantity <= 0) {
    return removeFromCart(session, productId);
  }

  item.quantity = quantity;
  return { success: true, cart: getCartWithDetails(session) };
}

function getCartWithDetails(session) {
  const cart = getCart(session);
  let total = 0;

  const items = cart.map(item => {
    const product = getProductById(item.productId);
    const subtotal = product.price * item.quantity;
    total += subtotal;

    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      subtotal,
      image: product.image
    };
  });

  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total
  };
}

function clearCart(session) {
  session.cart = [];
  return { success: true };
}

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  getCartWithDetails,
  clearCart
};
```

---

### Task 8: Add Mock Auth Logic

**Files:**
- Create: `capsule-store/lib/auth.js`

**Step 1: Create auth module**

Create `capsule-store/lib/auth.js`:

```javascript
// Mock users (in-memory, for demo only)
const users = [
  { id: 1, username: 'bulma', password: 'capsule123', name: 'Bulma Brief' },
  { id: 2, username: 'vegeta', password: 'prince123', name: 'Vegeta' },
  { id: 3, username: 'goku', password: 'kamehameha', name: 'Son Goku' },
  { id: 4, username: 'demo', password: 'demo', name: 'Demo User' }
];

// Mock order history
const orderHistory = {
  1: [
    { id: 'ORD-001', date: '2026-01-15', items: ['Capsule #5: Jet'], total: 2000000, status: 'Delivered' },
    { id: 'ORD-002', date: '2026-01-20', items: ['Capsule #40: Gravity Chamber'], total: 10000000, status: 'Processing' }
  ],
  2: [
    { id: 'ORD-003', date: '2026-01-10', items: ['Capsule #40: Gravity Chamber', 'Capsule #40: Gravity Chamber'], total: 20000000, status: 'Delivered' }
  ],
  3: [
    { id: 'ORD-004', date: '2026-01-18', items: ['Capsule #9: Refrigerator'], total: 5000, status: 'Delivered' }
  ]
};

function login(session, username, password) {
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  session.user = {
    id: user.id,
    username: user.username,
    name: user.name
  };

  return { success: true, user: session.user };
}

function logout(session) {
  delete session.user;
  return { success: true };
}

function getCurrentUser(session) {
  return session.user || null;
}

function isLoggedIn(session) {
  return !!session.user;
}

function getOrderHistory(session) {
  if (!session.user) {
    return [];
  }
  return orderHistory[session.user.id] || [];
}

// Middleware to require auth
function requireAuth(req, res, next) {
  if (!isLoggedIn(req.session)) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  isLoggedIn,
  getOrderHistory,
  requireAuth
};
```

---

### Task 9: Add API Routes

**Files:**
- Create: `capsule-store/routes/api.js`

**Step 1: Create API routes**

Create `capsule-store/routes/api.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, formatPrice } = require('../lib/products');
const { addToCart, removeFromCart, updateQuantity, getCartWithDetails, clearCart } = require('../lib/cart');
const { login, logout, getCurrentUser, isLoggedIn } = require('../lib/auth');

// Products
router.get('/products', (req, res) => {
  const products = getAllProducts();
  res.json({
    count: products.length,
    products: products.map(p => ({
      ...p,
      priceFormatted: formatPrice(p.price)
    }))
  });
});

router.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = getProductById(id);

  if (!product) {
    return res.status(404).json({
      error: 'Product not found',
      message: 'That capsule does not exist in our inventory.'
    });
  }

  res.json({
    ...product,
    priceFormatted: formatPrice(product.price)
  });
});

// Cart
router.get('/cart', (req, res) => {
  const cart = getCartWithDetails(req.session);
  res.json({
    ...cart,
    totalFormatted: formatPrice(cart.total)
  });
});

router.post('/cart', (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const result = addToCart(req.session, parseInt(productId, 10), parseInt(quantity, 10) || 1);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    message: 'Item added to cart',
    cart: {
      ...result.cart,
      totalFormatted: formatPrice(result.cart.total)
    }
  });
});

router.delete('/cart/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const result = removeFromCart(req.session, productId);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    message: 'Item removed from cart',
    cart: {
      ...result.cart,
      totalFormatted: formatPrice(result.cart.total)
    }
  });
});

router.put('/cart/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const { quantity } = req.body;

  const result = updateQuantity(req.session, productId, parseInt(quantity, 10));

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    message: 'Cart updated',
    cart: {
      ...result.cart,
      totalFormatted: formatPrice(result.cart.total)
    }
  });
});

// Checkout
router.post('/checkout', (req, res) => {
  const cart = getCartWithDetails(req.session);

  if (cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Generate mock order
  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // Clear cart after "order"
  clearCart(req.session);

  res.json({
    success: true,
    message: 'Order placed successfully!',
    order: {
      id: orderId,
      items: cart.items,
      total: cart.total,
      totalFormatted: formatPrice(cart.total),
      status: 'Processing',
      estimatedDelivery: 'Instant (it\'s a capsule!)'
    }
  });
});

// Auth
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = login(req.session, username, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({
    message: 'Login successful',
    user: result.user
  });
});

router.post('/auth/logout', (req, res) => {
  logout(req.session);
  res.json({ message: 'Logged out successfully' });
});

router.get('/auth/me', (req, res) => {
  const user = getCurrentUser(req.session);

  if (!user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  res.json({ user });
});

module.exports = router;
```

---

### Task 10: Add Page Routes

**Files:**
- Create: `capsule-store/routes/pages.js`

**Step 1: Create page routes**

Create `capsule-store/routes/pages.js`:

```javascript
const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, getFeaturedProducts, formatPrice } = require('../lib/products');
const { getCartWithDetails } = require('../lib/cart');
const { getCurrentUser, isLoggedIn, getOrderHistory, requireAuth } = require('../lib/auth');

// Helper to add common view data
function viewData(req, data = {}) {
  const cart = getCartWithDetails(req.session);
  return {
    user: getCurrentUser(req.session),
    cartCount: cart.itemCount,
    formatPrice,
    ...data
  };
}

// Home
router.get('/', (req, res) => {
  res.render('home', viewData(req, {
    title: 'Capsule Corp Store',
    featured: getFeaturedProducts()
  }));
});

// Products list
router.get('/products', (req, res) => {
  res.render('products', viewData(req, {
    title: 'All Capsules',
    products: getAllProducts()
  }));
});

// Single product
router.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const product = getProductById(id);

  if (!product) {
    return res.status(404).render('error', viewData(req, {
      title: 'Not Found',
      message: 'That capsule does not exist in our inventory.'
    }));
  }

  res.render('product', viewData(req, {
    title: product.name,
    product
  }));
});

// Cart
router.get('/cart', (req, res) => {
  res.render('cart', viewData(req, {
    title: 'Your Cart',
    cart: getCartWithDetails(req.session)
  }));
});

// Checkout
router.get('/checkout', (req, res) => {
  const cart = getCartWithDetails(req.session);

  if (cart.items.length === 0) {
    return res.redirect('/cart');
  }

  res.render('checkout', viewData(req, {
    title: 'Checkout',
    cart
  }));
});

// Login
router.get('/login', (req, res) => {
  if (isLoggedIn(req.session)) {
    return res.redirect('/account');
  }

  res.render('login', viewData(req, {
    title: 'Login'
  }));
});

// Account (requires auth)
router.get('/account', requireAuth, (req, res) => {
  res.render('account', viewData(req, {
    title: 'My Account',
    orders: getOrderHistory(req.session)
  }));
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
```

---

### Task 11: Create EJS Layout Template

**Files:**
- Create: `capsule-store/views/layout.ejs`

**Step 1: Create layout template**

Create `capsule-store/views/layout.ejs`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %> | Capsule Corp</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header class="header">
    <div class="container">
      <a href="/" class="logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">CAPSULE CORP</span>
      </a>
      <nav class="nav">
        <a href="/products">All Capsules</a>
        <a href="/cart" class="cart-link">
          Cart <span class="cart-badge"><%= cartCount %></span>
        </a>
        <% if (user) { %>
          <a href="/account"><%= user.name %></a>
          <a href="/logout">Logout</a>
        <% } else { %>
          <a href="/login">Login</a>
        <% } %>
      </nav>
    </div>
  </header>

  <main class="main">
    <div class="container">
      <%- body %>
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      <p>&copy; Capsule Corporation - West City</p>
      <p class="footer-tagline">Hoi-Poi Capsules: The Future in Your Pocket</p>
    </div>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>
```

---

### Task 12: Create Home Page Template

**Files:**
- Create: `capsule-store/views/home.ejs`

**Step 1: Create home template**

Create `capsule-store/views/home.ejs`:

```html
<% layout('layout') -%>

<section class="hero">
  <h1>Welcome to Capsule Corp</h1>
  <p>The world's most advanced portable technology. Houses, vehicles, and more - all in your pocket.</p>
  <a href="/products" class="btn btn-primary">Shop All Capsules</a>
</section>

<section class="featured">
  <h2>Featured Capsules</h2>
  <div class="product-grid">
    <% featured.forEach(product => { %>
      <div class="product-card">
        <div class="product-image">
          <div class="capsule-icon capsule-<%= product.capsuleNumber %>">
            #<%= product.capsuleNumber %>
          </div>
        </div>
        <h3><%= product.name %></h3>
        <p class="price"><%= formatPrice(product.price) %></p>
        <a href="/products/<%= product.id %>" class="btn">View Details</a>
      </div>
    <% }) %>
  </div>
</section>

<section class="about">
  <h2>Why Capsule Corp?</h2>
  <div class="features">
    <div class="feature">
      <span class="feature-icon">📦</span>
      <h3>Instant Deployment</h3>
      <p>Just click and throw - your capsule expands in seconds.</p>
    </div>
    <div class="feature">
      <span class="feature-icon">🌍</span>
      <h3>Global Support</h3>
      <p>Service centers in every major city on Earth (and Namek).</p>
    </div>
    <div class="feature">
      <span class="feature-icon">🔒</span>
      <h3>Secure Storage</h3>
      <p>Bio-locked capsules keep your belongings safe.</p>
    </div>
  </div>
</section>
```

---

### Task 13: Create Products List Template

**Files:**
- Create: `capsule-store/views/products.ejs`

**Step 1: Create products template**

Create `capsule-store/views/products.ejs`:

```html
<% layout('layout') -%>

<h1>All Capsules</h1>

<div class="product-grid">
  <% products.forEach(product => { %>
    <div class="product-card <%= !product.inStock ? 'out-of-stock' : '' %>">
      <div class="product-image">
        <div class="capsule-icon capsule-<%= product.capsuleNumber %>">
          #<%= product.capsuleNumber %>
        </div>
        <% if (!product.inStock) { %>
          <span class="stock-badge">Out of Stock</span>
        <% } %>
      </div>
      <h3><%= product.name %></h3>
      <p class="category"><%= product.category %></p>
      <p class="price"><%= formatPrice(product.price) %></p>
      <a href="/products/<%= product.id %>" class="btn">View Details</a>
    </div>
  <% }) %>
</div>
```

---

### Task 14: Create Product Detail Template

**Files:**
- Create: `capsule-store/views/product.ejs`

**Step 1: Create product detail template**

Create `capsule-store/views/product.ejs`:

```html
<% layout('layout') -%>

<div class="product-detail">
  <div class="product-image-large">
    <div class="capsule-icon-large capsule-<%= product.capsuleNumber %>">
      #<%= product.capsuleNumber %>
    </div>
  </div>

  <div class="product-info">
    <h1><%= product.name %></h1>
    <p class="category">Category: <%= product.category %></p>
    <p class="price-large"><%= formatPrice(product.price) %></p>
    <p class="description"><%= product.description %></p>

    <% if (product.inStock) { %>
      <form class="add-to-cart-form" action="/api/cart" method="POST">
        <input type="hidden" name="productId" value="<%= product.id %>">
        <div class="quantity-selector">
          <label for="quantity">Quantity:</label>
          <input type="number" id="quantity" name="quantity" value="1" min="1" max="99">
        </div>
        <button type="submit" class="btn btn-primary btn-large">Add to Cart</button>
      </form>
    <% } else { %>
      <p class="out-of-stock-message">This item is currently out of stock.</p>
      <button class="btn btn-disabled" disabled>Out of Stock</button>
    <% } %>

    <a href="/products" class="back-link">&larr; Back to All Capsules</a>
  </div>
</div>
```

---

### Task 15: Create Cart Template

**Files:**
- Create: `capsule-store/views/cart.ejs`

**Step 1: Create cart template**

Create `capsule-store/views/cart.ejs`:

```html
<% layout('layout') -%>

<h1>Your Cart</h1>

<% if (cart.items.length === 0) { %>
  <div class="empty-cart">
    <p>Your cart is empty.</p>
    <a href="/products" class="btn btn-primary">Start Shopping</a>
  </div>
<% } else { %>
  <div class="cart-container">
    <div class="cart-items">
      <% cart.items.forEach(item => { %>
        <div class="cart-item" data-product-id="<%= item.productId %>">
          <div class="cart-item-image">
            <div class="capsule-icon-small">#</div>
          </div>
          <div class="cart-item-details">
            <h3><%= item.name %></h3>
            <p class="item-price"><%= formatPrice(item.price) %> each</p>
          </div>
          <div class="cart-item-quantity">
            <button class="qty-btn qty-minus" data-action="decrease">-</button>
            <span class="qty-value"><%= item.quantity %></span>
            <button class="qty-btn qty-plus" data-action="increase">+</button>
          </div>
          <div class="cart-item-subtotal">
            <p><%= formatPrice(item.subtotal) %></p>
          </div>
          <button class="remove-btn" data-action="remove">&times;</button>
        </div>
      <% }) %>
    </div>

    <div class="cart-summary">
      <h2>Order Summary</h2>
      <div class="summary-row">
        <span>Items (<%= cart.itemCount %>)</span>
        <span><%= formatPrice(cart.total) %></span>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <span><%= formatPrice(cart.total) %></span>
      </div>
      <a href="/checkout" class="btn btn-primary btn-large">Proceed to Checkout</a>
    </div>
  </div>
<% } %>
```

---

### Task 16: Create Checkout Template

**Files:**
- Create: `capsule-store/views/checkout.ejs`

**Step 1: Create checkout template**

Create `capsule-store/views/checkout.ejs`:

```html
<% layout('layout') -%>

<h1>Checkout</h1>

<div class="checkout-container">
  <div class="checkout-form">
    <h2>Shipping Information</h2>
    <form id="checkout-form" action="/api/checkout" method="POST">
      <div class="form-group">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" value="<%= user ? user.name : '' %>" required>
      </div>
      <div class="form-group">
        <label for="address">Delivery Address</label>
        <input type="text" id="address" name="address" placeholder="Where should we throw the capsule?" required>
      </div>
      <div class="form-group">
        <label for="city">City</label>
        <input type="text" id="city" name="city" placeholder="West City, Satan City, etc." required>
      </div>
      <div class="form-group">
        <label for="notes">Special Instructions</label>
        <textarea id="notes" name="notes" placeholder="e.g., Watch out for Vegeta"></textarea>
      </div>

      <h2>Payment</h2>
      <div class="form-group">
        <label for="card">Card Number (Demo)</label>
        <input type="text" id="card" name="card" value="4242-4242-4242-4242" readonly>
        <small>This is a demo - no real payment processed</small>
      </div>

      <button type="submit" class="btn btn-primary btn-large">Place Order</button>
    </form>
  </div>

  <div class="checkout-summary">
    <h2>Order Summary</h2>
    <div class="summary-items">
      <% cart.items.forEach(item => { %>
        <div class="summary-item">
          <span><%= item.name %> x<%= item.quantity %></span>
          <span><%= formatPrice(item.subtotal) %></span>
        </div>
      <% }) %>
    </div>
    <div class="summary-total">
      <span>Total</span>
      <span><%= formatPrice(cart.total) %></span>
    </div>
  </div>
</div>
```

---

### Task 17: Create Login and Account Templates

**Files:**
- Create: `capsule-store/views/login.ejs`
- Create: `capsule-store/views/account.ejs`

**Step 1: Create login template**

Create `capsule-store/views/login.ejs`:

```html
<% layout('layout') -%>

<div class="auth-container">
  <h1>Login</h1>

  <form id="login-form" class="auth-form" action="/api/auth/login" method="POST">
    <div class="form-group">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required>
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required>
    </div>
    <button type="submit" class="btn btn-primary">Login</button>
  </form>

  <div class="demo-credentials">
    <h3>Demo Accounts</h3>
    <ul>
      <li><strong>bulma</strong> / capsule123</li>
      <li><strong>vegeta</strong> / prince123</li>
      <li><strong>goku</strong> / kamehameha</li>
      <li><strong>demo</strong> / demo</li>
    </ul>
  </div>
</div>
```

**Step 2: Create account template**

Create `capsule-store/views/account.ejs`:

```html
<% layout('layout') -%>

<h1>Welcome, <%= user.name %>!</h1>

<div class="account-container">
  <section class="account-section">
    <h2>Order History</h2>

    <% if (orders.length === 0) { %>
      <p>No orders yet. <a href="/products">Start shopping!</a></p>
    <% } else { %>
      <div class="orders-list">
        <% orders.forEach(order => { %>
          <div class="order-card">
            <div class="order-header">
              <span class="order-id"><%= order.id %></span>
              <span class="order-date"><%= order.date %></span>
              <span class="order-status status-<%= order.status.toLowerCase() %>"><%= order.status %></span>
            </div>
            <div class="order-items">
              <% order.items.forEach(item => { %>
                <span class="order-item"><%= item %></span>
              <% }) %>
            </div>
            <div class="order-total">
              Total: <%= formatPrice(order.total) %>
            </div>
          </div>
        <% }) %>
      </div>
    <% } %>
  </section>
</div>
```

---

### Task 18: Create Error Template

**Files:**
- Create: `capsule-store/views/error.ejs`

**Step 1: Create error template**

Create `capsule-store/views/error.ejs`:

```html
<% layout('layout') -%>

<div class="error-page">
  <h1>Oops!</h1>
  <p class="error-message"><%= message || "Looks like Vegeta broke something." %></p>
  <a href="/" class="btn btn-primary">Return Home</a>
</div>
```

---

### Task 19: Create CSS Stylesheet

**Files:**
- Create: `capsule-store/public/css/style.css`

**Step 1: Create stylesheet**

Create `capsule-store/public/css/style.css`:

```css
/* Capsule Corp Theme - Orange/Blue */
:root {
  --primary: #ff6b00;
  --primary-dark: #e05a00;
  --secondary: #0066cc;
  --background: #f5f5f5;
  --surface: #ffffff;
  --text: #333333;
  --text-light: #666666;
  --border: #dddddd;
  --success: #28a745;
  --error: #dc3545;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--background);
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Header */
.header {
  background: var(--secondary);
  color: white;
  padding: 15px 0;
}

.header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: white;
  font-weight: bold;
  font-size: 1.5rem;
}

.logo-icon {
  font-size: 2rem;
  margin-right: 10px;
  color: var(--primary);
}

.nav {
  display: flex;
  gap: 20px;
}

.nav a {
  color: white;
  text-decoration: none;
}

.nav a:hover {
  color: var(--primary);
}

.cart-badge {
  background: var(--primary);
  border-radius: 50%;
  padding: 2px 8px;
  font-size: 0.8rem;
}

/* Main */
.main {
  min-height: calc(100vh - 200px);
  padding: 40px 0;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-large {
  padding: 15px 30px;
  font-size: 1.1rem;
}

.btn-disabled {
  background: var(--border);
  color: var(--text-light);
  cursor: not-allowed;
}

/* Hero */
.hero {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, var(--secondary), var(--primary));
  color: white;
  border-radius: 10px;
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 25px;
  opacity: 0.9;
}

/* Product Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

.product-card {
  background: var(--surface);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.product-card:hover {
  transform: translateY(-5px);
}

.product-card.out-of-stock {
  opacity: 0.7;
}

.capsule-icon {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
  color: white;
  font-weight: bold;
  font-size: 1.5rem;
}

.product-card h3 {
  margin-bottom: 10px;
}

.category {
  color: var(--text-light);
  font-size: 0.9rem;
}

.price {
  color: var(--primary);
  font-weight: bold;
  font-size: 1.2rem;
  margin: 10px 0;
}

/* Product Detail */
.product-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  background: var(--surface);
  padding: 40px;
  border-radius: 10px;
}

.capsule-icon-large {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  color: white;
  font-weight: bold;
  font-size: 3rem;
}

.price-large {
  color: var(--primary);
  font-size: 2rem;
  font-weight: bold;
  margin: 20px 0;
}

.description {
  color: var(--text-light);
  margin-bottom: 20px;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.quantity-selector input {
  width: 60px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  text-align: center;
}

/* Cart */
.cart-container {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--surface);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 15px;
}

.cart-item-details {
  flex: 1;
}

.cart-item-quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qty-btn {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 5px;
  cursor: pointer;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-light);
  cursor: pointer;
}

.remove-btn:hover {
  color: var(--error);
}

.cart-summary {
  background: var(--surface);
  padding: 25px;
  border-radius: 10px;
  height: fit-content;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.summary-row.total {
  font-weight: bold;
  font-size: 1.2rem;
  border-bottom: none;
  margin-top: 10px;
}

.empty-cart {
  text-align: center;
  padding: 60px;
}

/* Forms */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 1rem;
}

.form-group small {
  color: var(--text-light);
  font-size: 0.85rem;
}

/* Auth */
.auth-container {
  max-width: 400px;
  margin: 0 auto;
}

.auth-form {
  background: var(--surface);
  padding: 30px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.demo-credentials {
  background: var(--surface);
  padding: 20px;
  border-radius: 10px;
}

.demo-credentials h3 {
  margin-bottom: 10px;
}

.demo-credentials li {
  margin-left: 20px;
  color: var(--text-light);
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 20px;
}

.feature {
  text-align: center;
  padding: 20px;
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

/* Orders */
.order-card {
  background: var(--surface);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 15px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.order-status {
  padding: 3px 10px;
  border-radius: 15px;
  font-size: 0.85rem;
}

.status-delivered {
  background: #d4edda;
  color: #155724;
}

.status-processing {
  background: #fff3cd;
  color: #856404;
}

/* Footer */
.footer {
  background: var(--secondary);
  color: white;
  text-align: center;
  padding: 30px;
  margin-top: 40px;
}

.footer-tagline {
  opacity: 0.7;
  font-size: 0.9rem;
  margin-top: 5px;
}

/* Error Page */
.error-page {
  text-align: center;
  padding: 60px;
}

.error-page h1 {
  font-size: 3rem;
  color: var(--primary);
}

.error-message {
  font-size: 1.2rem;
  color: var(--text-light);
  margin: 20px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .product-detail {
    grid-template-columns: 1fr;
  }

  .cart-container {
    grid-template-columns: 1fr;
  }

  .features {
    grid-template-columns: 1fr;
  }

  .header .container {
    flex-direction: column;
    gap: 15px;
  }
}
```

---

### Task 20: Create JavaScript for Cart Interactions

**Files:**
- Create: `capsule-store/public/js/main.js`

**Step 1: Create main.js**

Create `capsule-store/public/js/main.js`:

```javascript
// Cart interactions
document.addEventListener('DOMContentLoaded', function() {

  // Add to cart form
  const addToCartForm = document.querySelector('.add-to-cart-form');
  if (addToCartForm) {
    addToCartForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = {
        productId: formData.get('productId'),
        quantity: formData.get('quantity') || 1
      };

      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          window.location.href = '/cart';
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to add to cart');
        }
      } catch (err) {
        alert('Error adding to cart');
      }
    });
  }

  // Cart item buttons
  document.querySelectorAll('.cart-item').forEach(item => {
    const productId = item.dataset.productId;
    const qtyValue = item.querySelector('.qty-value');

    item.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        let qty = parseInt(qtyValue.textContent);

        if (this.dataset.action === 'increase') {
          qty++;
        } else if (this.dataset.action === 'decrease') {
          qty--;
        }

        if (qty < 1) {
          await removeItem(productId);
        } else {
          await updateQuantity(productId, qty);
        }
      });
    });

    const removeBtn = item.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeItem(productId));
    }
  });

  async function updateQuantity(productId, quantity) {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      alert('Error updating cart');
    }
  }

  async function removeItem(productId) {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      alert('Error removing item');
    }
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password')
          })
        });

        if (res.ok) {
          window.location.href = '/account';
        } else {
          const err = await res.json();
          alert(err.error || 'Login failed');
        }
      } catch (err) {
        alert('Error logging in');
      }
    });
  }

  // Checkout form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const data = await res.json();

        if (res.ok) {
          alert(`Order ${data.order.id} placed successfully!`);
          window.location.href = '/';
        } else {
          alert(data.error || 'Checkout failed');
        }
      } catch (err) {
        alert('Error processing checkout');
      }
    });
  }
});
```

---

### Task 21: Update Server.js with All Routes

**Files:**
- Modify: `capsule-store/server.js`

**Step 1: Update server.js**

Replace `capsule-store/server.js` with:

```javascript
const express = require('express');
const session = require('express-session');
const path = require('path');

const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'capsule-corp-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine with express-ejs-layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Custom layout middleware (simple implementation)
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = function(view, options = {}) {
    originalRender(view, options, (err, html) => {
      if (err) return next(err);
      if (options.layout === false) {
        return res.send(html);
      }
      originalRender('layout', { ...options, body: html });
    });
  };
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/', pageRoutes);

// Health check (also at root API level)
app.get('/api/health', (req, res) => {
  res.json({ status: 'operational', store: 'Capsule Corp' });
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found',
    user: null,
    cartCount: 0,
    formatPrice: (p) => `Ƶ${p.toLocaleString()}`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('error', {
    title: 'Error',
    message: 'Oops! Looks like Vegeta broke something.',
    user: null,
    cartCount: 0,
    formatPrice: (p) => `Ƶ${p.toLocaleString()}`
  });
});

app.listen(PORT, () => {
  console.log(`Capsule Corp Store running on port ${PORT}`);
  console.log('Pages: /, /products, /cart, /checkout, /login, /account');
  console.log('API: /api/products, /api/cart, /api/auth/*');
});
```

---

### Task 22: Add Capsule Store Dockerfile

**Files:**
- Create: `capsule-store/Dockerfile`

**Step 1: Create Dockerfile**

Create `capsule-store/Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

**Step 2: Build and test container**

```bash
docker build -t capsule-store ./capsule-store
docker run -p 3000:3000 capsule-store
```

Expected: Container starts, browse to http://localhost:3000

**Step 3: Stop container**

---

### Task 23: Final Integration Test

**Step 1: Run both containers**

Terminal 1:
```bash
docker run -p 3001:3001 dragon-radar-api
```

Terminal 2:
```bash
docker run -p 3000:3000 capsule-store
```

**Step 2: Test Dragon Radar API**

```bash
curl http://localhost:3001/api/radar/scan
curl http://localhost:3001/api/radar/ball/4
curl "http://localhost:3001/api/radar/distance?lat=40.7&long=-74.0"
```

Expected: All return themed JSON with rate limit headers.

**Step 3: Test Capsule Store**

- Browse to http://localhost:3000
- View products
- Add item to cart
- View cart
- Login with demo/demo
- Complete checkout

Expected: Full flow works with Dragon Ball theming.

**Step 4: Stop both containers**

---

## Summary

| App | Port | Container | Key Endpoints |
|-----|------|-----------|---------------|
| Dragon Radar API | 3001 | `dragon-radar-api` | `/api/radar/scan`, `/api/radar/ball/:id` |
| Capsule Store | 3000 | `capsule-store` | `/`, `/products`, `/cart`, `/api/*` |

Both apps ready for F5 XC demo scenarios: API security, rate limiting, bot protection, WAF.
