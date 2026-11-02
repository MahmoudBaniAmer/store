import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/productService";
import { getCategories } from "../services/categoryService";
import { useSearchParams } from "react-router";

function Products({ onAddToCart, onToggleFavorite, isFavorite }) {
    const [searchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("default");
    const [minRating, setMinRating] = useState("0");
    const [inStockOnly, setInStockOnly] = useState(false);

    useEffect(() => {
        async function loadProducts() {
            try {
                setLoading(true);
                setError("");

                console.log("[Products] Fetching products...");

                const [data, categoryData] = await Promise.all([
                    getProducts(),
                    getCategories(),
                ]);
                // The API should return an array. Handle unexpected response shapes safely.
                const productList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.products)
                        ? data.products
                        : [];

                console.log("[Products] Products loaded:", productList.length);
                setProducts(productList);
                setCategories(Array.isArray(categoryData) ? categoryData : []);
            } catch (error) {
                console.error("[Products] Failed to load products:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadProducts();
    }, []);

    const filteredProducts = products.filter((product) => {
        const productName = String(product?.name ?? "");
        const matchesSearch = productName
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const categoryName =
            typeof product.category === "object"
                ? product.category?.name
                : product.category;

        const matchesCategory =
            selectedCategory === "All" ||
            categoryName === selectedCategory;

        const productPrice = Number(product?.price ?? 0);
        const matchesMinPrice =
            minPrice === "" || productPrice >= Number(minPrice);

        const matchesMaxPrice =
            maxPrice === "" || productPrice <= Number(maxPrice);

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
                return Number(a.price ?? 0) - Number(b.price ?? 0);

            case "price-high":
                return Number(b.price ?? 0) - Number(a.price ?? 0);

            case "name-az":
                return String(a.name ?? "").localeCompare(String(b.name ?? ""));

            case "name-za":
                return String(b.name ?? "").localeCompare(String(a.name ?? ""));

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
                    {categories.map((category) => (
                        <option key={category._id} value={category.name}>{category.name}</option>
                    ))}
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
                        <ProductCard
                            key={product._id}
                            product={product}
                            onAddToCart={onAddToCart}
                            onToggleFavorite={onToggleFavorite}
                            isFavorite={isFavorite ? isFavorite(product) : false}
                        />
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