// Cart interactions
document.addEventListener('DOMContentLoaded', function() {

  // Add to cart form
  const addToCartForm = document.querySelector('.add-to-cart-form');
  if (addToCartForm) {
    addToCartForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const data = {
        productId: formData.get('productId'),
        quantity: formData.get('quantity') || 1
      };

      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          window.location.href = '/cart';
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to add to cart');
        }
      } catch (err) {
        alert('Error adding to cart');
      }
    });
  }

  // Cart item buttons
  document.querySelectorAll('.cart-item').forEach(item => {
    const productId = item.dataset.productId;
    const qtyValue = item.querySelector('.qty-value');

    item.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        let qty = parseInt(qtyValue.textContent);

        if (this.dataset.action === 'increase') {
          qty++;
        } else if (this.dataset.action === 'decrease') {
          qty--;
        }

        if (qty < 1) {
          await removeItem(productId);
        } else {
          await updateQuantity(productId, qty);
        }
      });
    });

    const removeBtn = item.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeItem(productId));
    }
  });

  async function updateQuantity(productId, quantity) {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      alert('Error updating cart');
    }
  }

  async function removeItem(productId) {
    try {
      const res = await fetch(`/api/cart/${productId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      alert('Error removing item');
    }
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const formData = new FormData(this);

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.get('username'),
            password: formData.get('password')
          })
        });

        if (res.ok) {
          window.location.href = '/account';
        } else {
          const err = await res.json();
          alert(err.error || 'Login failed');
        }
      } catch (err) {
        alert('Error logging in');
      }
    });
  }

  // Checkout form
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      try {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const data = await res.json();

        if (res.ok) {
          alert(`Order ${data.order.id} placed successfully!`);
          window.location.href = '/';
        } else {
          alert(data.error || 'Checkout failed');
        }
      } catch (err) {
        alert('Error processing checkout');
      }
    });
  }
});
