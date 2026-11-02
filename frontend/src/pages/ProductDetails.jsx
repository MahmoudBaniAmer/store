import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getProductById } from "../services/productService";
import { getProductReviews, createProductReview } from "../services/reviewService";

function HeartIcon({ filled = false }) {
    return (
        <svg width="21" height="21" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
    );
}

function Stars({ value = 0 }) {
    return <span className="review-stars" aria-label={`${value} out of 5 stars`}>{"★".repeat(Math.round(value))}{"☆".repeat(5 - Math.round(value))}</span>;
}

function ProductDetails({ onAddToCart, onToggleFavorite, isFavorite = () => false }) {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [reviewLoading, setReviewLoading] = useState(true);
    const [reviewError, setReviewError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");
    const [rating, setRating] = useState("5");
    const [comment, setComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        let active = true;
        async function loadProduct() {
            try {
                setLoading(true); setError("");
                const data = await getProductById(id);
                const item = data?.product ?? data;
                if (!item || typeof item !== "object") throw new Error("Invalid product data.");
                if (active) setProduct(item);
            } catch (err) {
                if (active) { setError(err.message || "Failed to load product."); setProduct(null); }
            } finally { if (active) setLoading(false); }
        }
        if (id) loadProduct(); else { setError("Product ID is missing."); setLoading(false); }
        return () => { active = false; };
    }, [id]);

    async function loadReviews() {
        try {
            setReviewLoading(true); setReviewError("");
            const data = await getProductReviews(id);
            setReviews(Array.isArray(data.reviews) ? data.reviews : []);
            setAverageRating(Number(data.averageRating || 0));
        } catch (err) { setReviewError(err.message || "Could not load reviews."); }
        finally { setReviewLoading(false); }
    }

    useEffect(() => { if (id) loadReviews(); }, [id]);

    async function handleReviewSubmit(event) {
        event.preventDefault();
        setReviewMessage(""); setReviewError("");
        try {
            setSubmittingReview(true);
            await createProductReview(id, { rating: Number(rating), comment });
            setComment(""); setRating("5");
            setReviewMessage("Your review was submitted successfully.");
            await loadReviews();
        } catch (err) { setReviewError(err.message || "Could not submit your review."); }
        finally { setSubmittingReview(false); }
    }

    if (loading) return <main className="product-details-page"><p>Loading product...</p></main>;
    if (error || !product) return <main className="product-details-page"><p>{error || "Product not found."}</p><Link to="/products">Back to Products</Link></main>;

    const productId = product._id || product.id;
    const productName = product.name || "Unnamed Product";
    const productPrice = Number(product.price ?? 0);
    const categoryName = typeof product.category === "object" ? product.category?.name : product.category;
    const stockQuantity = Number(product.stock ?? 0);
    const isAvailable = typeof product.inStock === "boolean" ? product.inStock : stockQuantity > 0;
    const productIsFavorite = isFavorite?.(product) ?? false;
    const productImage = product.image || "https://placehold.co/600x450?text=Product";

    return (
        <main className="product-details-page">
            <Link to="/products" className="back-to-products">← Back to Products</Link>
            <div className="product-details-container">
                <div className="product-details-image-container">
                    <img src={productImage} alt={productName} className="product-details-image" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "https://placehold.co/600x450?text=Image+Unavailable"; }} />
                </div>
                <div className="product-details-info">
                    <p className="product-category">{categoryName || "General"}</p>
                    <h1>{productName}</h1>
                    <div className="product-details-price-row">
                        <p className="product-details-price">${productPrice.toFixed(2)}</p>
                        <button type="button" className={`favorite-button details-favorite-button ${productIsFavorite ? "is-favorite" : ""}`} onClick={() => onToggleFavorite?.(product)} aria-label={productIsFavorite ? "Remove from favorites" : "Add to favorites"} title={productIsFavorite ? "Remove from favorites" : "Add to favorites"}><HeartIcon filled={productIsFavorite} /></button>
                    </div>
                    <div className="product-review-summary"><Stars value={averageRating} /> <span>{averageRating.toFixed(1)} ({reviews.length} reviews)</span></div>
                    <p className="product-details-description">{product.description || "No description available for this product."}</p>
                    <p className={isAvailable ? "product-in-stock" : "product-out-stock"}>{isAvailable ? (stockQuantity > 0 ? `In Stock (${stockQuantity})` : "In Stock") : "Out of Stock"}</p>
                    <button type="button" className="add-to-cart-button" disabled={!isAvailable} onClick={() => onAddToCart?.(product)}>{isAvailable ? "Add to Cart" : "Unavailable"}</button>
                </div>
            </div>

            <section className="product-reviews" aria-labelledby="reviews-title">
                <div className="reviews-heading"><div><p className="section-eyebrow">CUSTOMER FEEDBACK</p><h2 id="reviews-title">Reviews & Ratings</h2></div><div className="review-summary"><strong>{averageRating.toFixed(1)}</strong><Stars value={averageRating} /><span>{reviews.length} review{reviews.length === 1 ? "" : "s"}</span></div></div>
                {reviewMessage && <p className="review-message success">{reviewMessage}</p>}
                {reviewError && <p className="review-message error">{reviewError}</p>}
                <form className="review-form" onSubmit={handleReviewSubmit}>
                    <h3>Share your experience</h3>
                    <label htmlFor="review-rating">Your rating</label>
                    <select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)} required><option value="5">★★★★★ — Excellent</option><option value="4">★★★★☆ — Good</option><option value="3">★★★☆☆ — Average</option><option value="2">★★☆☆☆ — Below average</option><option value="1">★☆☆☆☆ — Poor</option></select>
                    <label htmlFor="review-comment">Your comment</label>
                    <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What did you think about this product?" rows="4" maxLength="1000" required />
                    <small>{comment.length}/1000 characters</small>
                    <button type="submit" disabled={submittingReview}>{submittingReview ? "Submitting…" : "Submit review"}</button>
                </form>
                <div className="review-list">
                    {reviewLoading ? <p>Loading reviews…</p> : reviews.length === 0 ? <p className="review-message">No reviews yet. Be the first to share your feedback.</p> : reviews.map((review) => (
                        <article className="review-item" key={review._id}>
                            <div className="review-item-header"><div><strong className="review-author">{review.user?.name || "Marvet customer"}</strong><div><Stars value={review.rating} /></div></div><time className="review-date" dateTime={review.createdAt}>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</time></div>
                            <p className="review-comment">{review.comment}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default ProductDetails;
