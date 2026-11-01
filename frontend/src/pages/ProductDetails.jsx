import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getProductById } from "../services/productService";

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

function ProductDetails({
    onAddToCart,
    onToggleFavorite,
    isFavorite = () => false,
}) {
    const { id } = useParams();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProduct() {
            try {
                console.log("[ProductDetails] Fetching product:", id);

                setLoading(true);
                setError("");

                const data = await getProductById(id);

                console.log("[ProductDetails] Product loaded:", data.name);
                setProduct(data);
            } catch (error) {
                console.error(
                    "[ProductDetails] Failed to load product:",
                    error
                );
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadProduct();
    }, [id]);

    if (loading) {
        return <main className="product-details-page">Loading product...</main>;
    }

    if (error || !product) {
        return (
            <main className="product-details-page">
                <p>{error || "Product not found."}</p>
                <Link to="/products">Back to Products</Link>
            </main>
        );
    }

    const categoryName =
        typeof product.category === "object"
            ? product.category?.name
            : product.category;

    const isAvailable = (product.stock ?? 0) > 0;
    const productIsFavorite = isFavorite(product);

    return (
        <main className="product-details-page">
            <Link to="/products" className="back-to-products">
                ← Back to Products
            </Link>

            <div className="product-details-container">
                <div className="product-details-image-container">
                    <img
                        src={
                            product.image ||
                            "https://placehold.co/600x450?text=Product"
                        }
                        alt={product.name}
                        className="product-details-image"
                        onError={(event) => {
                            event.currentTarget.src =
                                "https://placehold.co/600x450?text=Image+Unavailable";
                        }}
                    />
                </div>

                <div className="product-details-info">
                    <p className="product-category">
                        {categoryName || "General"}
                    </p>

                    <h1>{product.name}</h1>

                    <div className="product-details-price-row">
                        <p className="product-details-price">
                            ${product.price}
                        </p>

                        <button
                            type="button"
                            className={`favorite-button details-favorite-button ${
                                productIsFavorite ? "is-favorite" : ""
                            }`}
                            onClick={() => onToggleFavorite?.(product)}
                            aria-label={
                                productIsFavorite
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                            }
                            title={
                                productIsFavorite
                                    ? "Remove from favorites"
                                    : "Add to favorites"
                            }
                        >
                            <HeartIcon filled={productIsFavorite} />
                        </button>
                    </div>

                    <p className="product-details-description">
                        {product.description ||
                            "No description available for this product."}
                    </p>

                    <p
                        className={
                            isAvailable
                                ? "product-in-stock"
                                : "product-out-stock"
                        }
                    >
                        {isAvailable
                            ? `In Stock (${product.stock})`
                            : "Out of Stock"}
                    </p>

                    <button
                        className="add-to-cart-button"
                        disabled={!isAvailable}
                        onClick={() => onAddToCart(product)}
                    >
                        {isAvailable ? "Add to Cart" : "Unavailable"}
                    </button>
                </div>
            </div>
        </main>
    );
}

export default ProductDetails;