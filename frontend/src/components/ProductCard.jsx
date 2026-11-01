import { Link } from "react-router";

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

function ProductCard({
    product,
    onAddToCart,
    onToggleFavorite,
    isFavorite = false,
}) {
    const productId = product._id || product.id;

    const categoryName =
        typeof product.category === "object"
            ? product.category?.name
            : product.category;

    const isAvailable = (product.stock ?? 0) > 0;

    return (
        <div className="product-card">
            <div className="product-image-wrapper">
                <Link to={`/products/${productId}`} className="product-card-link">
                    <img
                        src={
                            product.image ||
                            "https://placehold.co/400x300?text=Product"
                        }
                        alt={product.name}
                        className="product-image"
                        onError={(event) => {
                            event.currentTarget.src =
                                "https://placehold.co/400x300?text=Image+Unavailable";
                        }}
                    />
                </Link>

                <button
                    type="button"
                    className={`favorite-button ${
                        isFavorite ? "is-favorite" : ""
                    }`}
                    onClick={() => onToggleFavorite?.(product)}
                    aria-label={
                        isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                    }
                    title={
                        isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                    }
                >
                    <HeartIcon filled={isFavorite} />
                </button>
            </div>

            <Link to={`/products/${productId}`} className="product-card-link">
                <div className="product-info">
                    <p className="product-category">
                        {categoryName || "General"}
                    </p>

                    <h3 className="product-name">{product.name}</h3>

                    <div className="product-bottom">
                        <span className="product-price">${product.price}</span>
                    </div>
                </div>
            </Link>

            <button
                className="add-to-cart-button"
                disabled={!isAvailable}
                onClick={() => onAddToCart(product)}
            >
                {isAvailable ? "Add to Cart" : "Out of Stock"}
            </button>
        </div>
    );
}

export default ProductCard;