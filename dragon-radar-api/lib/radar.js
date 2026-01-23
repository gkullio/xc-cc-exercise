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
