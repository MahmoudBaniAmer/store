import { useState } from "react";
import ProductCard from "../components/ProductCard";

function Products() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("default");
    const [minRating, setMinRating] = useState("0");
    const [inStockOnly, setInStockOnly] = useState(false);

    // Temporary product data
    const products = [
        {
            id: 1,
            name: "Wireless Headphones",
            price: 45,
            category: "Electronics",
            rating: 4.5,
            stock: 12,
            image: "https://placehold.co/400x300?text=Headphones",
        },
        {
            id: 2,
            name: "Smart Watch",
            price: 70,
            category: "Electronics",
            rating: 4.8,
            stock: 0,
            image: "https://placehold.co/400x300?text=Smart+Watch",
        },
        {
            id: 3,
            name: "Classic T-Shirt",
            price: 20,
            category: "Men's Clothing",
            rating: 3.9,
            stock: 25,
            image: "https://placehold.co/400x300?text=T-Shirt",
        },
        {
            id: 4,
            name: "Elegant Necklace",
            price: 35,
            category: "Jewelry",
            rating: 4.2,
            stock: 8,
            image: "https://placehold.co/400x300?text=Necklace",
        },
    ];

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        const matchesMinPrice =
            minPrice === "" || product.price >= Number(minPrice);

        const matchesMaxPrice =
            maxPrice === "" || product.price <= Number(maxPrice);

        const matchesRating = product.rating >= Number(minRating);

        const matchesAvailability =
            !inStockOnly || product.stock > 0;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesMinPrice &&
            matchesMaxPrice &&
            matchesRating &&
            matchesAvailability
        );
    });

    // Sort filtered products
    const sortedProducts = [...filteredProducts].sort((a, b) => {
        switch (sortBy) {
            case "price-low":
                return a.price - b.price;

            case "price-high":
                return b.price - a.price;

            case "name-az":
                return a.name.localeCompare(b.name);

            case "name-za":
                return b.name.localeCompare(a.name);

            default:
                return 0;
        }
    });

    function resetFilters() {
        setSearchTerm("");
        setSelectedCategory("All");
        setMinPrice("");
        setMaxPrice("");
        setSortBy("default");
        setMinRating("0");
        setInStockOnly(false);
    }

    return (
        <main className="products-page">
            <div className="section-header">
                <div>
                    <p className="section-label">EXPLORE MARVET</p>
                    <h1>All Products</h1>
                </div>
            </div>

            {/* Search */}
            <div className="products-filters">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />

                {/* Category */}
                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                >
                    <option value="All">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Men's Clothing">Men's Clothing</option>
                    <option value="Jewelry">Jewelry</option>
                </select>

                {/* Price range */}
                <input
                    type="number"
                    min="0"
                    placeholder="Min price ($)"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                />

                <input
                    type="number"
                    min="0"
                    placeholder="Max price ($)"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                />

                {/* Sorting */}
                <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                >
                    <option value="default">Sort: Default</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="name-az">Name: A to Z</option>
                    <option value="name-za">Name: Z to A</option>
                </select>

                {/* Rating */}
                <select
                    value={minRating}
                    onChange={(event) => setMinRating(event.target.value)}
                >
                    <option value="0">All Ratings</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                </select>
            </div>

            {/* Availability */}
            <div className="availability-filter">
                <label>
                    <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(event) => setInStockOnly(event.target.checked)}
                    />
                    Show available products only
                </label>

                <button className="reset-filters-button" onClick={resetFilters}>
                    Reset Filters
                </button>
            </div>

            <p className="products-count">
                Showing {sortedProducts.length} products
            </p>

            {/* Products */}
            <div className="products-grid">
                {sortedProducts.length > 0 ? (
                    sortedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <p className="no-products">
                        No products found. Try changing your filters.
                    </p>
                )}
            </div>
        </main>
    );
}

export default Products;