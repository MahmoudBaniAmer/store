import { useState } from "react";
import ProductCard from "../components/ProductCard";

function Products() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [maxPrice, setMaxPrice] = useState("");

    const products = [
        {
            id: 1,
            name: "Wireless Headphones",
            price: 45,
            category: "Electronics",
            image: "https://placehold.co/400x300?text=Headphones",
        },
        {
            id: 2,
            name: "Smart Watch",
            price: 70,
            category: "Electronics",
            image: "https://placehold.co/400x300?text=Smart+Watch",
        },
        {
            id: 3,
            name: "Classic T-Shirt",
            price: 20,
            category: "Men's Clothing",
            image: "https://placehold.co/400x300?text=T-Shirt",
        },
        {
            id: 4,
            name: "Elegant Necklace",
            price: 35,
            category: "Jewelry",
            image: "https://placehold.co/400x300?text=Necklace",
        },
    ];

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

        const matchesCategory =
            selectedCategory === "All" ||
            product.category === selectedCategory;

        const matchesPrice =
            maxPrice === "" || product.price <= Number(maxPrice);

        return matchesSearch && matchesCategory && matchesPrice;
    });

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
                    placeholder="Maximum price ($)"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                />
            </div>

            <p className="products-count">
                Showing {filteredProducts.length} products
            </p>

            <div className="products-grid">
                {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <p className="no-products">No products found.</p>
                )}
            </div>
        </main>
    );
}

export default Products;