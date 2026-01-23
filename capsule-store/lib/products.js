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
