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

// Shadow endpoint - NOT documented in OpenAPI spec
// Used to test OAS enforcement in F5 XC
app.get('/api/radar/shadow-protocol', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    source: 'West City Research Lab - CLASSIFIED',
    message: 'Shadow protocol active. This endpoint should be blocked by OAS enforcement.',
    classification: 'TOP SECRET - RED RIBBON COUNTERMEASURES'
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
