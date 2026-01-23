const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// Internal access detection middleware
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Gravity Chamber Control',
    basePath: res.locals.basePath,
    internal: res.locals.internal
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Gravity Chamber Viewer',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Gravity Viewer running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
