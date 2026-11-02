const API_URL = "http://localhost:5000/categories";

export async function getCategories() {
    const response = await fetch(API_URL);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Failed to load categories");
    return Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : [];
}
