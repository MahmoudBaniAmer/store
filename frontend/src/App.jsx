import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router";
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
import Chatbot from "./components/Chatbot";
import DeliveryLocation from "./components/DeliveryLocation";

const Admin = lazy(() => import("./pages/Admin"));
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

function getUserId(user) {
  const userId = user?._id || user?.id;
  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

function getStorageScope(user) {
  return getUserId(user) || "guest";
}

function getScopedStorageKey(key, scope) {
  return `${key}:${scope}`;
}

function getOrderRequestFingerprint(items, deliveryLocation) {
  const normalizedItems = items
    .map(({ product, quantity }) => ({ product: String(product), quantity }))
    .sort((left, right) => left.product.localeCompare(right.product));

  return JSON.stringify({
    items: normalizedItems,
    deliveryLocation: deliveryLocation
      ? { lat: deliveryLocation.lat, lng: deliveryLocation.lng }
      : null,
  });
}

function createCheckoutKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getCheckoutKey(scope, fingerprint) {
  const storageKey = getScopedStorageKey("marvetCheckoutRequest", scope);
  let savedRequest = null;
  try {
    const storedValue = localStorage.getItem(storageKey);
    savedRequest = storedValue ? JSON.parse(storedValue) : null;
  } catch {
    savedRequest = null;
  }

  if (
    savedRequest?.fingerprint === fingerprint &&
    typeof savedRequest.key === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedRequest.key)
  ) {
    return savedRequest.key;
  }

  const key = createCheckoutKey();
  try {
    localStorage.setItem(storageKey, JSON.stringify({ key, fingerprint }));
  } catch {
    throw new Error("Checkout retry protection could not be saved in this browser. Enable local storage and try again.");
  }
  return key;
}

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem("marvetTheme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // Theme still follows the system preference when storage is unavailable.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function readStoredItems(key, scope) {
  const storedItems = localStorage.getItem(getScopedStorageKey(key, scope));
  if (!storedItems) return [];

  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function saveStoredItems(key, scope, items) {
  localStorage.setItem(getScopedStorageKey(key, scope), JSON.stringify(items));
}

function migrateLegacyCollections() {
  [
    ["marvetCart", "marvetCart:guest"],
    ["marvetFavorites", "marvetFavorites:guest"],
  ].forEach(([legacyKey, guestKey]) => {
    const legacyItems = localStorage.getItem(legacyKey);
    if (legacyItems === null) return;

    if (localStorage.getItem(guestKey) === null) {
      try {
        const parsedItems = JSON.parse(legacyItems);
        if (Array.isArray(parsedItems)) {
          localStorage.setItem(guestKey, JSON.stringify(parsedItems));
        }
      } catch {
        // Ignore invalid legacy data and allow the guest collection to start empty.
      }
    }

    localStorage.removeItem(legacyKey);
  });
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("marvetTheme", theme);
    } catch {
      // The selected theme remains active for this page session.
    }
  }, [theme]);

  const [user, setUser] = useState(() => {
    migrateLegacyCollections();
    const savedUser = localStorage.getItem("marvetUser");

    try {
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      return parsedUser && typeof parsedUser === "object" && !Array.isArray(parsedUser)
        ? parsedUser
        : null;
    } catch {
      localStorage.removeItem("marvetUser");
      return null;
    }
  });
  const storageScope = getStorageScope(user);
  const [cart, setCart] = useState(() => readStoredItems("marvetCart", storageScope));
  const [favorites, setFavorites] = useState(() => readStoredItems("marvetFavorites", storageScope));
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [shareDeliveryLocation, setShareDeliveryLocation] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const orderSubmissionStarted = useRef(false);

  useEffect(() => {
    saveStoredItems("marvetCart", storageScope, cart);
    saveStoredItems("marvetFavorites", storageScope, favorites);
  }, [cart, favorites, storageScope]);

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

        return updatedCart;
      }

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
        return currentFavorites.filter(
          (item) => item._id !== product._id
        );
      }

      return [...currentFavorites, product];
    });
  }

  function isFavorite(product) {
    return favorites.some((item) => item._id === product._id);
  }

  function handleLogin(userData, token) {
    setDeliveryLocation(null);
    setShareDeliveryLocation(false);
    const currentScope = getStorageScope(user);
    const nextScope = getStorageScope(userData);

    saveStoredItems("marvetCart", currentScope, cart);
    saveStoredItems("marvetFavorites", currentScope, favorites);

    const nextCart = readStoredItems("marvetCart", nextScope);
    const nextFavorites = readStoredItems("marvetFavorites", nextScope);

    localStorage.setItem("marvetToken", token);
    localStorage.setItem("marvetUser", JSON.stringify(userData));

    setCart(nextCart);
    setFavorites(nextFavorites);
    setUser(userData);
    navigate("/");
  }

  function handleLogout() {
    setDeliveryLocation(null);
    setShareDeliveryLocation(false);
    const currentScope = getStorageScope(user);
    const guestCart = readStoredItems("marvetCart", "guest");
    const guestFavorites = readStoredItems("marvetFavorites", "guest");

    saveStoredItems("marvetCart", currentScope, cart);
    saveStoredItems("marvetFavorites", currentScope, favorites);
    localStorage.removeItem("marvetToken");
    localStorage.removeItem("marvetUser");

    setCart(guestCart);
    setFavorites(guestFavorites);
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

    if (orderSubmissionStarted.current) return;
    orderSubmissionStarted.current = true;
    setPlacingOrder(true);

    try {
      const orderData = {
        items: cart.map((item) => ({
          product: item._id,
          quantity: item.quantity,
        })),
        ...(shareDeliveryLocation && deliveryLocation ? { deliveryLocation } : {}),
      };
      const fingerprint = getOrderRequestFingerprint(orderData.items, orderData.deliveryLocation);
      const checkoutKey = getCheckoutKey(getStorageScope(user), fingerprint);
      await createOrder(orderData, checkoutKey);
      localStorage.removeItem(getScopedStorageKey("marvetCheckoutRequest", getStorageScope(user)));

      setCart([]);
      setDeliveryLocation(null);
      setShareDeliveryLocation(false);
      alert("Your order has been placed successfully!");
    } catch (error) {
      alert(error.message || "Failed to place order.");
    } finally {
      orderSubmissionStarted.current = false;
      setPlacingOrder(false);
    }
  }
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );



  return (
    <div>
      <header className={`navbar${isAuthPage ? " auth-navbar" : ""}`}>
        <Link to="/" className="logo">
          Marvet
        </Link>
        <button
          type="button"
          className="theme-toggle"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        >
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
          <span>{theme === "dark" ? "Light" : "Dark"} mode</span>
        </button>

        {!isAuthPage && (
          <>
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
          </>
        )}
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
              user={user}
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
                      <img
                        src={item.image || "https://placehold.co/400x300?text=Product"}
                        alt={item.name || "Product"}
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "https://placehold.co/400x300?text=Image+Unavailable";
                        }}
                      />

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

                  <div className="payment-method">
                    <h3>Payment Method</h3>
                    <p>Cash on delivery. This demo does not collect or process payment information.</p>
                  </div>

                  <DeliveryLocation
                    location={deliveryLocation}
                    onLocationChange={setDeliveryLocation}
                    shareLocation={shareDeliveryLocation}
                    onShareLocationChange={setShareDeliveryLocation}
                  />

                  <button
                    type="button"
                    className="hero-button"
                    disabled={placingOrder}
                    onClick={handlePlaceOrder}
                  >
                    {placingOrder ? "Placing order..." : "Place Order"}
                  </button>
                </div>
              )}
            </main>
          }
        />
        <Route
          path="/my-orders"
          element={user ? <MyOrders /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user?.role === "admin"
            ? <Suspense fallback={<main className="admin-page">Loading dashboard…</main>}><Admin user={user} theme={theme} /></Suspense>
            : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />

        <Route
          path="/register"
          element={<Register onLogin={handleLogin} />}
        />
      </Routes>

      <Chatbot />

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