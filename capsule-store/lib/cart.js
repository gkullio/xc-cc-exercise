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
