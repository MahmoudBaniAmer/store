const API_URL = "http://localhost:5000/products";

// Get all products
export async function getProducts() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error("Failed to fetch products");
    }

    return response.json();
}

// Get one product by ID
export async function getProductById(id) {
    const response = await fetch(`${API_URL}/${id}`);

    if (!response.ok) {
        throw new Error("Product not found");
    }

    return response.json();
}