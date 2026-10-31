function App() {
  return (
    <div>
      <header className="navbar">
        <a href="/" className="logo">
          Marvet
        </a>

        <nav className="nav-links">
          <a href="/">Home</a>
          <a href="/products">Products</a>
          <a href="/categories">Categories</a>
        </nav>

        <div className="nav-actions">
          <button>Search</button>
          <button>Cart (0)</button>
          <button>Login</button>
        </div>
      </header>

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

            <a href="/products" className="hero-button">
              Shop Now
            </a>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <span>✨</span>
              <h2>Discover More</h2>
              <p>Explore products made for your everyday life.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;