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
