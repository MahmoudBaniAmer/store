import { Routes, Route, Link } from "react-router";
import Products from "./pages/Products";
import ProductCard from "./components/ProductCard";
import "./App.css";

function App() {
  const products = [
    {
      id: 1,
      name: "Wireless Headphones",
      price: 45,
      category: "Electronics",
      image: "https://placehold.co/400x300?text=Headphones",
    },
    {
      id: 2,
      name: "Smart Watch",
      price: 70,
      category: "Electronics",
      image: "https://placehold.co/400x300?text=Smart+Watch",
    },
    {
      id: 3,
      name: "Classic T-Shirt",
      price: 20,
      category: "Men's Clothing",
      image: "https://placehold.co/400x300?text=T-Shirt",
    },
    {
      id: 4,
      name: "Elegant Necklace",
      price: 35,
      category: "Jewelry",
      image: "https://placehold.co/400x300?text=Necklace",
    },
  ];

  return (
    <div>
      {/* Navbar */}
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
          <button>Search</button>
          <button>Cart (0)</button>
          <button>Login</button>
        </div>
      </header>

      {/* Pages */}
      <Routes>
        {/* Home Page */}
        <Route
          path="/"
          element={
            <main>
              {/* Hero Section */}
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

              {/* Featured Products */}
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
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            </main>
          }
        />

        {/* Products Page */}
        <Route path="/products" element={<Products />} />
      </Routes>

      {/* Footer */}
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