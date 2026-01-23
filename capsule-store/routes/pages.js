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
