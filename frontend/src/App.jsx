import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router";
import Products from "./pages/Products";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./App.css";
import { createOrder } from "./services/orderService";
import { getProducts } from "./services/productService";
import MyOrders from "./pages/MyOrders";
import Categories from "./pages/Categories";
function CartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function HeartIcon({ filled = false }) {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

function App() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("marvetCart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("marvetCart", JSON.stringify(cart));
  }, [cart]);

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("marvetFavorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("marvetFavorites", JSON.stringify(favorites));
  }, [favorites]);

  const [featuredProducts, setFeaturedProducts] = useState([]);
  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.products;
        if (active) setFeaturedProducts(Array.isArray(list) ? list.slice(0, 4) : []);
      })
      .catch((error) => console.error("[Home] Could not load featured products:", error));
    return () => { active = false; };
  }, []);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("marvetUser");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem("marvetUser");
      return null;
    }
  });

  function addToCart(product) {
    if (!product) {
      console.error("[Cart] Cannot add an undefined product.");
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item._id === product._id
      );

      if (existingItem) {
        const updatedCart = currentCart.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );

        console.log("[Cart] Quantity increased:", product.name);
        return updatedCart;
      }

      console.log("[Cart] Product added:", product.name);
      return [...currentCart, { ...product, quantity: 1 }];
    });
  }

  function updateCartQuantity(productId, change) {
    setCart((items) => items
      .map((item) => item._id === productId
        ? { ...item, quantity: Math.max(1, item.quantity + change) }
        : item));
  }

  function removeFromCart(productId) {
    setCart((items) => items.filter((item) => item._id !== productId));
  }

  function toggleFavorite(product) {
    if (!product) return;

    setFavorites((currentFavorites) => {
      const alreadyFavorite = currentFavorites.some(
        (item) => item._id === product._id
      );

      if (alreadyFavorite) {
        console.log("[Favorites] Removed:", product.name);

        return currentFavorites.filter(
          (item) => item._id !== product._id
        );
      }

      console.log("[Favorites] Added:", product.name);
      return [...currentFavorites, product];
    });
  }

  function isFavorite(product) {
    return favorites.some((item) => item._id === product._id);
  }

  function handleLogin(userData, token) {
    localStorage.setItem("marvetToken", token);
    localStorage.setItem("marvetUser", JSON.stringify(userData));

    setUser(userData);
    navigate("/");
  }

  function handleLogout() {
    localStorage.removeItem("marvetToken");
    localStorage.removeItem("marvetUser");

    setUser(null);
    navigate("/");
  }
  async function handlePlaceOrder() {
    if (!user) {
      navigate("/login");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    try {
      for (const item of cart) {
        await createOrder({
          product: item._id,
          quantity: item.quantity,
        });
      }

      setCart([]);
      alert("Your order has been placed successfully!");
    } catch (error) {
      alert(error.message || "Failed to place order.");
    }
  }
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );



  return (
    <div>
      <header className="navbar">
        <Link to="/" className="logo">
          Marvet
        </Link>

        <nav className="nav-links">
          <Link to="/my-orders">My Orders</Link>
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
        </nav>

        <div className="nav-actions">
          <Link to="/products" className="nav-action-link">
            Search
          </Link>

          <Link to="/favorites" className="favorites-nav-link">
            <HeartIcon filled={favorites.length > 0} />
            <span>Favorites</span>

            {favorites.length > 0 && (
              <span className="favorites-count">
                {favorites.length}
              </span>
            )}
          </Link>

          <Link to="/cart" className="cart-nav-button">
            <CartIcon />
            <span className="cart-nav-label">Cart</span>
            <span className="cart-count-badge">{cartCount}</span>
          </Link>

          {user ? (
            <div className="nav-user-actions">
              <span className="nav-user-name">
                Hi, {user.name}
              </span>

              <button
                type="button"
                className="login-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-button">
              Login
            </Link>
          )}
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <main>
              <section className="hero">
                <div className="hero-content">
                  <span className="hero-label">WELCOME TO MARVET</span>

                  <h1>
                    Find Everything
                    <br />
                    You Love in One Place
                  </h1>

                  <p>
                    Discover electronics, fashion, accessories, and more.
                    Your next favorite product is waiting for you.
                  </p>

                  <Link to="/products" className="hero-button">
                    Shop Now
                  </Link>
                </div>

                <div className="hero-visual">
                  <div className="hero-card">
                    <span>✨</span>
                    <h2>Discover More</h2>
                    <p>Explore products made for your everyday life.</p>
                  </div>
                </div>
              </section>

              <section className="featured-products">
                <div className="section-header">
                  <div>
                    <p className="section-label">OUR COLLECTION</p>
                    <h2>Featured Products</h2>
                  </div>

                  <Link to="/products" className="view-all">
                    View All →
                  </Link>
                </div>

                <div className="products-grid">
                  {featuredProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onAddToCart={addToCart}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={isFavorite(product)}
                    />
                  ))}
                </div>
              </section>
            </main>
          }
        />

        <Route path="/categories" element={<Categories />} />

        <Route
          path="/products"
          element={
            <Products
              onAddToCart={addToCart}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          }
        />

        <Route
          path="/products/:id"
          element={
            <ProductDetails
              onAddToCart={addToCart}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          }
        />

        <Route
          path="/favorites"
          element={
            <main className="favorites-page">
              <div className="section-header">
                <div>
                  <p className="section-label">YOUR COLLECTION</p>
                  <h1>My Favorites</h1>
                </div>
              </div>

              {favorites.length === 0 ? (
                <div className="empty-state">
                  <HeartIcon />
                  <h2>No favorites yet</h2>
                  <p>Tap the heart on a product to save it here.</p>

                  <Link to="/products" className="hero-button">
                    Explore Products
                  </Link>
                </div>
              ) : (
                <div className="products-grid">
                  {favorites.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onAddToCart={addToCart}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={isFavorite(product)}
                    />
                  ))}
                </div>
              )}
            </main>
          }
        />

        <Route
          path="/cart"
          element={
            <main className="cart-page">
              <h1>Your Shopping Cart</h1>

              {cart.length === 0 ? (
                <div className="empty-state">
                  <CartIcon />
                  <h2>Your cart is empty</h2>
                  <p>Looks like you haven't added anything yet.</p>

                  <Link to="/products" className="hero-button">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <img src={item.image} alt={item.name} />

                      <div>
                        <h3>{item.name}</h3>
                        <p>Price: ${item.price}</p>
                        <div className="cart-quantity-controls">
                          <button
                            type="button"
                            className="quantity-btn"
                            onClick={() => updateCartQuantity(item._id, -1)}
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <span className="quantity-value">{item.quantity}</span>

                          <button
                            type="button"
                            className="quantity-btn"
                            onClick={() => updateCartQuantity(item._id, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>

                          <button
                            type="button"
                            className="remove-cart-item"
                            onClick={() => removeFromCart(item._id)}
                            aria-label={`Remove ${item.name} from cart`}
                            title="Remove item"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="m19 6-1 14H6L5 6" />
                              <path d="M10 11v5M14 11v5" />
                            </svg>
                          </button>
                        </div>                      </div>
                    </div>
                  ))}

                  <h2>
                    Total: $
                    {cart
                      .reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </h2>

                  {/* Payment Method */}
                  <div className="payment-method">
                    <h3>Payment Method</h3>

                    <label>
                      <input
                        type="radio"
                        name="payment"
                        value="cash"
                        checked={paymentMethod === "cash"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Cash on Delivery
                    </label>

                    <label>
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      Credit / Debit Card
                    </label>

                    {paymentMethod === "card" && (
                      <div className="demo-card-form">
                        <input type="text" placeholder="Cardholder Name" />
                        <input
                          type="text"
                          placeholder="Card Number (demo)"
                          maxLength="19"
                        />

                        <div className="card-row">
                          <input type="text" placeholder="MM/YY" maxLength="5" />
                          <input type="password" placeholder="CVV" maxLength="4" />
                        </div>

                        <p>This is a demo payment. No real card details are processed.</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="hero-button"
                    onClick={handlePlaceOrder}
                  >
                    {paymentMethod === "card" ? "Pay Now (Demo)" : "Place Order"}
                  </button>
                </div>
              )}
            </main>
          }
        />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />

        <Route
          path="/register"
          element={<Register />}
        />
      </Routes>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>Marvet</h2>
            <p>Your favorite products, all in one place.</p>
          </div>

          <div className="footer-links">
            <h3>Quick Links</h3>
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/categories">Categories</Link>
          </div>

          <div className="footer-contact">
            <h3>Contact</h3>
            <p>Email: support@marvet.com</p>
            <p>Jordan</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Marvet. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;