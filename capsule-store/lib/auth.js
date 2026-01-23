// Mock users (in-memory, for demo only)
const users = [
  { id: 1, username: 'bulma', password: 'capsule123', name: 'Bulma Brief' },
  { id: 2, username: 'vegeta', password: 'prince123', name: 'Vegeta' },
  { id: 3, username: 'goku', password: 'kamehameha', name: 'Son Goku' },
  { id: 4, username: 'demo', password: 'demo', name: 'Demo User' }
];

// Mock order history
const orderHistory = {
  1: [
    { id: 'ORD-001', date: '2026-01-15', items: ['Capsule #5: Jet'], total: 2000000, status: 'Delivered' },
    { id: 'ORD-002', date: '2026-01-20', items: ['Capsule #40: Gravity Chamber'], total: 10000000, status: 'Processing' }
  ],
  2: [
    { id: 'ORD-003', date: '2026-01-10', items: ['Capsule #40: Gravity Chamber', 'Capsule #40: Gravity Chamber'], total: 20000000, status: 'Delivered' }
  ],
  3: [
    { id: 'ORD-004', date: '2026-01-18', items: ['Capsule #9: Refrigerator'], total: 5000, status: 'Delivered' }
  ]
};

function login(session, username, password) {
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  session.user = {
    id: user.id,
    username: user.username,
    name: user.name
  };

  return { success: true, user: session.user };
}

function logout(session) {
  delete session.user;
  return { success: true };
}

function getCurrentUser(session) {
  return session.user || null;
}

function isLoggedIn(session) {
  return !!session.user;
}

function getOrderHistory(session) {
  if (!session.user) {
    return [];
  }
  return orderHistory[session.user.id] || [];
}

// Middleware to require auth
function requireAuth(req, res, next) {
  if (!isLoggedIn(req.session)) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  isLoggedIn,
  getOrderHistory,
  requireAuth
};
