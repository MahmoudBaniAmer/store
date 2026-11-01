import { useState } from "react";
import { Routes, Route, Link } from "react-router";
import Products from "./pages/Products";
import ProductCard from "./components/ProductCard";
import ProductDetails from "./pages/ProductDetails";
import "./App.css";

function App() {
  const [cart, setCart] = useState([]);

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

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const featuredProducts = [
    {
      _id: "demo-headphones",
      name: "Wireless Headphones",
      price: 45,
      category: "Electronics",
      image: "https://placehold.co/400x300?text=Headphones",
      stock: 5,
    },
    {
      _id: "demo-watch",
      name: "Smart Watch",
      price: 70,
      category: "Electronics",
      image: "https://placehold.co/400x300?text=Smart+Watch",
      stock: 5,
    },
    {
      _id: "demo-shirt",
      name: "Classic T-Shirt",
      price: 20,
      category: "Men's Clothing",
      image: "https://placehold.co/400x300?text=T-Shirt",
      stock: 5,
    },
    {
      _id: "demo-necklace",
      name: "Elegant Necklace",
      price: 35,
      category: "Jewelry",
      image: "https://placehold.co/400x300?text=Necklace",
      stock: 5,
    },
  ];

  return (
    <div>
      <header className="navbar">
        <Link to="/" className="logo">
          Marvet
        </Link>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
        </nav>

        <div className="nav-actions">
          <Link to="/products" className="nav-action-link">
            Search
          </Link>

          <Link to="/cart" className="nav-action-link">
            Cart ({cartCount})
          </Link>

          <button>Login</button>
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
                    />
                  ))}
                </div>
              </section>
            </main>
          }
        />

        <Route
          path="/products"
          element={<Products onAddToCart={addToCart} />}
        />

        <Route
          path="/products/:id"
          element={<ProductDetails onAddToCart={addToCart} />}
        />

        <Route
          path="/cart"
          element={
            <main className="cart-page">
              <h1>Your Shopping Cart</h1>

              {cart.length === 0 ? (
                <p>Your cart is empty.</p>
              ) : (
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item._id}>
                      <img src={item.image} alt={item.name} />

                      <div>
                        <h3>{item.name}</h3>
                        <p>Price: ${item.price}</p>
                        <p>Quantity: {item.quantity}</p>
                      </div>
                    </div>
                  ))}

                  <h2>
                    Total: $
                    {cart.reduce(
                      (total, item) => total + item.price * item.quantity,
                      0
                    ).toFixed(2)}
                  </h2>
                </div>
              )}
            </main>
          }
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