import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/productService";
import { getCategories } from "../services/categoryService";
import { useSearchParams } from "react-router";

const PAGE_SIZE = 9;
const SEARCH_DEBOUNCE_MS = 250;

function getCategoryName(product) {
    return typeof product.category === "object"
        ? product.category?.name || ""
        : product.category || "";
}

function getRelevanceScore(product, searchTerm) {
    if (!searchTerm) return 0;

    const name = String(product?.name ?? "").toLocaleLowerCase();
    const description = String(product?.description ?? "").toLocaleLowerCase();
    const category = getCategoryName(product).toLocaleLowerCase();

    if (name === searchTerm) return 100;
    if (name.startsWith(searchTerm)) return 80;
    if (name.includes(searchTerm)) return 60;
    if (description.includes(searchTerm)) return 30;
    if (category.includes(searchTerm)) return 20;
    return 0;
}

function ProductFilters({
    categories,
    hasRatingData,
    selectedCategory,
    setSelectedCategory,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minRating,
    setMinRating,
    inStockOnly,
    setInStockOnly,
    onClear
}) {
    return (
        <div className="product-filter-content">
            <div className="product-filter-heading">
                <h2>Filters</h2>
                <button type="button" className="filter-clear-button" onClick={onClear}>
                    Clear all
                </button>
            </div>

            <label className="product-filter-field">
                <span>Category</span>
                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                        <option key={category._id} value={category.name}>{category.name}</option>
                    ))}
                </select>
            </label>

            <fieldset className="product-filter-group">
                <legend>Price range</legend>
                <div className="product-price-range">
                    <label>
                        <span className="visually-hidden">Minimum price</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Min"
                            value={minPrice}
                            onChange={(event) => setMinPrice(event.target.value)}
                        />
                    </label>
                    <span aria-hidden="true">to</span>
                    <label>
                        <span className="visually-hidden">Maximum price</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            placeholder="Max"
                            value={maxPrice}
                            onChange={(event) => setMaxPrice(event.target.value)}
                        />
                    </label>
                </div>
            </fieldset>

            {hasRatingData && (
                <label className="product-filter-field">
                    <span>Customer rating</span>
                    <select
                        value={minRating}
                        onChange={(event) => setMinRating(event.target.value)}
                    >
                        <option value="0">Any rating</option>
                        <option value="3">3 stars & up</option>
                        <option value="4">4 stars & up</option>
                        <option value="4.5">4.5 stars & up</option>
                    </select>
                </label>
            )}

            <label className="product-stock-filter">
                <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                />
                <span>In stock only</span>
            </label>
        </div>
    );
}

function Products({ onAddToCart, onToggleFavorite, isFavorite }) {
    const [searchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "All");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [sortBy, setSortBy] = useState("relevance");
    const [minRating, setMinRating] = useState("0");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setSearchTerm(searchInput.trim().toLocaleLowerCase());
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                setLoading(true);
                setError("");

                const [data, categoryData] = await Promise.all([
                    getProducts(),
                    getCategories(),
                ]);
                const productList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.products)
                        ? data.products
                        : null;

                if (!productList) {
                    throw new Error("The product service returned an unexpected response.");
                }

                if (active) {
                    setProducts(productList);
                    setCategories(Array.isArray(categoryData) ? categoryData : []);
                }
            } catch (loadError) {
                console.error("[Products] Failed to load products:", loadError);
                if (active) setError(loadError.message || "Could not load products. Please try again.");
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProducts();
        return () => {
            active = false;
        };
    }, []);

    const priceRangeError = minPrice !== "" &&
        maxPrice !== "" &&
        Number(maxPrice) < Number(minPrice);

    const filteredProducts = useMemo(() => products.filter((product) => {
        const searchableFields = [
            product?.name,
            product?.description,
            getCategoryName(product),
        ];
        const matchesSearch = !searchTerm || searchableFields.some((field) => (
            String(field ?? "").toLocaleLowerCase().includes(searchTerm)
        ));

        const matchesCategory =
            selectedCategory === "All" ||
            getCategoryName(product) === selectedCategory;
        const productPrice = Number(product?.price ?? 0);
        const matchesMinPrice = minPrice === "" || productPrice >= Number(minPrice);
        const matchesMaxPrice = maxPrice === "" || productPrice <= Number(maxPrice);
        const reviewCount = Number(product?.reviewCount);
        const hasRatedReviews = Number.isFinite(reviewCount) && reviewCount > 0;
        const rating = Number(product?.rating);
        const matchesRating = Number(minRating) === 0 ||
            (hasRatedReviews && Number.isFinite(rating) && rating >= Number(minRating));
        const hasStockValue = product?.stock !== undefined && product?.stock !== null;
        const isAvailable = hasStockValue
            ? Number(product.stock) > 0
            : product?.inStock === true;
        const matchesAvailability = !inStockOnly || isAvailable;

        return matchesSearch &&
            matchesCategory &&
            matchesMinPrice &&
            matchesMaxPrice &&
            matchesRating &&
            matchesAvailability;
    }), [products, searchTerm, selectedCategory, minPrice, maxPrice, minRating, inStockOnly]);

    const sortedProducts = useMemo(() => {
        if (sortBy === "relevance" && !searchTerm) return filteredProducts;

        return [...filteredProducts].sort((a, b) => {
            switch (sortBy) {
                case "relevance":
                    return getRelevanceScore(b, searchTerm) -
                        getRelevanceScore(a, searchTerm);
                case "price-low":
                    return Number(a.price ?? 0) - Number(b.price ?? 0);
                case "price-high":
                    return Number(b.price ?? 0) - Number(a.price ?? 0);
                case "rating":
                    return Number(b.rating ?? 0) - Number(a.rating ?? 0);
                case "newest":
                    return new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime();
                default:
                    return getRelevanceScore(b, searchTerm) - getRelevanceScore(a, searchTerm);
            }
        });
    }, [filteredProducts, sortBy, searchTerm]);

    const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageProducts = sortedProducts.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        setPage(1);
    }, [searchTerm, selectedCategory, minPrice, maxPrice, sortBy, minRating, inStockOnly]);

    function clearAllFilters() {
        setSearchInput("");
        setSearchTerm("");
        setSelectedCategory("All");
        setMinPrice("");
        setMaxPrice("");
        setSortBy("relevance");
        setMinRating("0");
        setInStockOnly(false);
        setPage(1);
    }

    function removeFilter(filter) {
        switch (filter) {
            case "search":
                setSearchInput("");
                setSearchTerm("");
                break;
            case "category":
                setSelectedCategory("All");
                break;
            case "minPrice":
                setMinPrice("");
                break;
            case "maxPrice":
                setMaxPrice("");
                break;
            case "rating":
                setMinRating("0");
                break;
            case "availability":
                setInStockOnly(false);
                break;
            case "sort":
                setSortBy("relevance");
                break;
            default:
                return;
        }
        setPage(1);
    }

    const activeFilterCount = [
        selectedCategory !== "All",
        minPrice !== "",
        maxPrice !== "",
        minRating !== "0",
        inStockOnly,
    ].filter(Boolean).length;
    const hasRatingData = products.some((product) => (
        Number(product?.reviewCount) > 0 && Number.isFinite(Number(product?.rating))
    ));

    if (loading) {
        return <main className="products-page"><p role="status">Loading products…</p></main>;
    }

    if (error) {
        return (
            <main className="products-page">
                <section className="products-empty-state" role="alert">
                    <h2>We couldn’t load the products</h2>
                    <p>{error}</p>
                    <button type="button" onClick={() => window.location.reload()}>Try again</button>
                </section>
            </main>
        );
    }

    return (
        <main className="products-page">
            <div className="section-header">
                <div>
                    <p className="section-label">EXPLORE MARVET</p>
                    <h1>All Products</h1>
                    <p className="products-intro">Find the right product with search and filters.</p>
                </div>
            </div>

            <form
                className="product-search-panel"
                aria-label="Search products"
                onSubmit={(event) => {
                    event.preventDefault();
                    setSearchTerm(searchInput.trim().toLocaleLowerCase());
                }}
            >
                <label className="product-search-field" htmlFor="product-search">
                    <span className="product-search-icon" aria-hidden="true">⌕</span>
                    <span className="visually-hidden">Search products by name, description, or category</span>
                    <input
                        id="product-search"
                        type="search"
                        placeholder="Search products, details, or categories"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        autoComplete="off"
                    />
                </label>
                {searchInput && (
                    <button
                        type="button"
                        className="product-search-clear"
                        aria-label="Clear product search"
                        onClick={() => {
                            setSearchInput("");
                            setSearchTerm("");
                        }}
                    >
                        ×
                    </button>
                )}
                <button type="submit" className="product-search-submit">
                    Search
                </button>
            </form>

            <div className="product-catalog-layout">
                <aside className={`product-filter-sidebar${filtersOpen ? " is-open" : ""}`}>
                    <button
                        type="button"
                        className="product-filter-toggle"
                        aria-expanded={filtersOpen}
                        aria-controls="product-filter-content"
                        onClick={() => setFiltersOpen((open) => !open)}
                    >
                        <span>Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}</span>
                        <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
                    </button>
                    <div id="product-filter-content" className="product-filter-panel">
                        <ProductFilters
                            categories={categories}
                            hasRatingData={hasRatingData}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={setSelectedCategory}
                            minPrice={minPrice}
                            setMinPrice={setMinPrice}
                            maxPrice={maxPrice}
                            setMaxPrice={setMaxPrice}
                            minRating={minRating}
                            setMinRating={setMinRating}
                            inStockOnly={inStockOnly}
                            setInStockOnly={setInStockOnly}
                            onClear={clearAllFilters}
                        />
                    </div>
                </aside>

                <section className="product-results" aria-label="Product results">
                    <div className="product-results-toolbar">
                        <p className="products-count" aria-live="polite">
                            {sortedProducts.length} {sortedProducts.length === 1 ? "product" : "products"} found
                            {sortedProducts.length > 0 && (
                                <span>
                                    {" · "}Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                                    {Math.min(currentPage * PAGE_SIZE, sortedProducts.length)}
                                </span>
                            )}
                        </p>
                        <label className="product-sort-field">
                            <span>Sort by</span>
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                            >
                                <option value="relevance">Relevance</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="newest">Newest</option>
                                {hasRatingData && <option value="rating">Customer rating</option>}
                            </select>
                        </label>
                        {(searchInput || activeFilterCount > 0 || sortBy !== "relevance") && (
                            <button
                                type="button"
                                className="filter-clear-button toolbar-clear-button"
                                onClick={clearAllFilters}
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>

                    {(searchTerm || activeFilterCount > 0 || sortBy !== "relevance") && (
                        <div className="active-product-filters" aria-label="Active filters">
                            {searchTerm && (
                                <button type="button" onClick={() => removeFilter("search")}>
                                    Search: “{searchTerm}” <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove search filter</span>
                                </button>
                            )}
                            {selectedCategory !== "All" && (
                                <button type="button" onClick={() => removeFilter("category")}>
                                    Category: {selectedCategory} <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove category filter</span>
                                </button>
                            )}
                            {minPrice !== "" && (
                                <button type="button" onClick={() => removeFilter("minPrice")}>
                                    Min price: ${minPrice} <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove minimum price filter</span>
                                </button>
                            )}
                            {maxPrice !== "" && (
                                <button type="button" onClick={() => removeFilter("maxPrice")}>
                                    Max price: ${maxPrice} <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove maximum price filter</span>
                                </button>
                            )}
                            {minRating !== "0" && (
                                <button type="button" onClick={() => removeFilter("rating")}>
                                    Rating: {minRating}+ stars <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove rating filter</span>
                                </button>
                            )}
                            {inStockOnly && (
                                <button type="button" onClick={() => removeFilter("availability")}>
                                    In stock <span aria-hidden="true">×</span>
                                    <span className="visually-hidden">Remove availability filter</span>
                                </button>
                            )}
                            {sortBy !== "relevance" && (
                                <button type="button" onClick={() => removeFilter("sort")}>
                                    Sort: {sortBy === "price-low" ? "Price low to high"
                                        : sortBy === "price-high" ? "Price high to low"
                                            : sortBy === "newest" ? "Newest" : "Customer rating"}
                                    <span aria-hidden="true"> ×</span>
                                    <span className="visually-hidden">Clear sort order</span>
                                </button>
                            )}
                        </div>
                    )}

                    {priceRangeError && (
                        <p className="product-filter-error" role="alert">
                            Maximum price must be greater than or equal to minimum price.
                        </p>
                    )}

                    {pageProducts.length > 0 ? (
                        <div className="products-grid">
                            {pageProducts.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                    onAddToCart={onAddToCart}
                                    onToggleFavorite={onToggleFavorite}
                                    isFavorite={isFavorite ? isFavorite(product) : false}
                                />
                            ))}
                        </div>
                    ) : (
                        <section className="products-empty-state" aria-live="polite">
                            <span className="products-empty-icon" aria-hidden="true">⌕</span>
                            <h2>No matching products</h2>
                            <p>Try a different search or remove one or more filters.</p>
                            <button type="button" onClick={clearAllFilters}>Clear search and filters</button>
                        </section>
                    )}

                    {sortedProducts.length > PAGE_SIZE && (
                        <nav className="products-pagination" aria-label="Product pages">
                            <button
                                type="button"
                                onClick={() => setPage((selectedPage) => Math.max(1, selectedPage - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span aria-live="polite">Page {currentPage} of {pageCount}</span>
                            <button
                                type="button"
                                onClick={() => setPage((selectedPage) => Math.min(pageCount, selectedPage + 1))}
                                disabled={currentPage === pageCount}
                            >
                                Next
                            </button>
                        </nav>
                    )}
                </section>
            </div>
        </main>
    );
}

export default Products;
