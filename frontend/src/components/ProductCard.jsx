import { Link } from "react-router";

function ProductCard({ product, onAddToCart }) {
    const productId = product._id || product.id;

    const categoryName =
        typeof product.category === "object"
            ? product.category?.name
            : product.category;

    const isAvailable = (product.stock ?? 0) > 0;

    return (
        <div className="product-card">
            <Link to={`/products/${productId}`} className="product-card-link">
                <img
                    src={product.image || "https://placehold.co/400x300?text=Product"}
                    alt={product.name}
                    className="product-image"
                    onError={(event) => {
                        event.currentTarget.src =
                            "https://placehold.co/400x300?text=Image+Unavailable";
                    }}
                />

                <div className="product-info">
                    <p className="product-category">{categoryName || "General"}</p>

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