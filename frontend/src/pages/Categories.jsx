import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getCategories } from "../services/categoryService";

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        getCategories()
            .then((data) => { if (active) setCategories(data); })
            .catch((err) => { if (active) setError(err.message || "Could not load categories."); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    return (
        <main className="products-page categories-page">
            <div className="section-header">
                <div>
                    <p className="section-label">FIND YOUR NEXT FAVORITE</p>
                    <h1>Shop by Category</h1>
                    <p>Explore the Marvet collection by category.</p>
                </div>
            </div>

            {loading && <p>Loading categories...</p>}
            {error && <p className="no-products" role="alert">{error}</p>}
            {!loading && !error && categories.length === 0 && (
                <div className="empty-state">
                    <h2>No categories available yet</h2>
                    <p>Categories will appear here once they are added by an administrator.</p>
                    <Link to="/products" className="hero-button">Browse all products</Link>
                </div>
            )}

            {!loading && !error && categories.length > 0 && (
                <div className="products-grid">
                    {categories.map((category) => (
                        <article className="category-card" key={category._id}>
                            <div className="category-card-icon" aria-hidden="true">✦</div>
                            <h2>{category.name}</h2>
                            <p>{category.description || "Explore products in this collection."}</p>
                            <Link
                                className="hero-button"
                                to={`/products?category=${encodeURIComponent(category.name)}`}
                            >
                                Explore category
                            </Link>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
