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

// Internal access detection middleware
app.use((req, res, next) => {
  res.locals.basePath = req.get('X-Base-Path') || '';
  res.locals.internal = req.get('X-Internal-Request') === 'true';
  next();
});

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
