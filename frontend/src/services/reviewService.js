import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/reviews`;

export async function getProductReviews(productId) {
    const response = await fetch(`${API_URL}/${productId}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not load reviews");
    return data;
}

export async function createProductReview(productId, review) {
    const token = localStorage.getItem("marvetToken");
    if (!token) throw new Error("Please log in to write a review.");
    const response = await fetch(`${API_URL}/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(review),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not submit review");
    return data;
}
