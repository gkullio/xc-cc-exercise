const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Main page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Gravity Chamber Control'
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
