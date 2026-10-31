import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/productService";

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("default");
    const [minRating, setMinRating] = useState("0");
    const [inStockOnly, setInStockOnly] = useState(false);

    useEffect(() => {
        async function loadProducts() {
            try {
                setLoading(true);
                const data = await getProducts();
                setProducts(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const categoryName =
            typeof product.category === "object"
                ? product.category?.name
                : product.category;

        const matchesCategory =
            selectedCategory === "All" ||
            categoryName === selectedCategory;

        const matchesMinPrice =
            minPrice === "" || product.price >= Number(minPrice);

        const matchesMaxPrice =
            maxPrice === "" || product.price <= Number(maxPrice);

        const matchesRating =
            (product.rating ?? 0) >= Number(minRating);

        const matchesAvailability =
            !inStockOnly || (product.stock ?? 0) > 0;

        return (
            matchesSearch &&
            matchesCategory &&
            matchesMinPrice &&
            matchesMaxPrice &&
            matchesRating &&
            matchesAvailability
        );
    });

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

    if (loading) {
        return <main className="products-page">Loading products...</main>;
    }

    if (error) {
        return (
            <main className="products-page">
                <p className="no-products">Error: {error}</p>
            </main>
        );
    }

    return (
        <main className="products-page">
            <div className="section-header">
                <div>
                    <p className="section-label">EXPLORE MARVET</p>
                    <h1>All Products</h1>
                </div>
            </div>

            <div className="products-filters">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />

                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                >
                    <option value="All">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Men's Clothing">Men's Clothing</option>
                    <option value="Jewelry">Jewelry</option>
                </select>

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

            <div className="availability-filter">
                <label>
                    <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(event) => setInStockOnly(event.target.checked)}
                    />
                    Show available products only
                </label>

                <button
                    className="reset-filters-button"
                    onClick={resetFilters}
                >
                    Reset Filters
                </button>
            </div>

            <p className="products-count">
                Showing {sortedProducts.length} products
            </p>

            <div className="products-grid">
                {sortedProducts.length > 0 ? (
                    sortedProducts.map((product) => (
                        <ProductCard key={product._id} product={product} />
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