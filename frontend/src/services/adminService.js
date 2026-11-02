const API_BASE = "http://localhost:5000";

function authHeaders() {
    const token = localStorage.getItem("marvetToken");
    if (!token) throw new Error("Please login as an administrator.");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Request failed (${response.status})`);
    return data;
}

export const adminGetProducts = () => fetch(`${API_BASE}/products`).then(async (r) => {
    const data = await r.json().catch(() => []);
    if (!r.ok) throw new Error(data?.message || "Could not load products");
    return data;
});
export const adminGetCategories = () => fetch(`${API_BASE}/categories`).then(async (r) => {
    const data = await r.json().catch(() => []);
    if (!r.ok) throw new Error(data?.message || "Could not load categories");
    return data;
});
export const adminGetOrders = () => request("/orders");
export const adminCreateProduct = (body) => request("/products", { method: "POST", body: JSON.stringify(body) });
export const adminUpdateProduct = (id, body) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const adminDeleteProduct = (id) => request(`/products/${id}`, { method: "DELETE" });
export const adminCreateCategory = (body) => request("/categories", { method: "POST", body: JSON.stringify(body) });
export const adminDeleteCategory = (id) => request(`/categories/${id}`, { method: "DELETE" });
