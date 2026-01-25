const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3004;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Internal App Catalog',
    basePath: req.get('X-Base-Path') || ''
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    service: 'Catalog Portal',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Catalog Portal running on port ${PORT}`);
});
