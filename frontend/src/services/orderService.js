import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/orders`;

function getAuthHeaders() {
    const token = localStorage.getItem("marvetToken");
    if (!token) throw new Error("Please login first");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

async function handleResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || fallbackMessage);
    return data;
}

export async function createOrder(orderData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
    });
    return handleResponse(response, "Failed to create order");
}

export async function getOrders() {
    const response = await fetch(API_URL, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response, "Failed to get orders");
}

export async function cancelOrder(orderId) {
    const response = await fetch(`${API_URL}/${orderId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    return handleResponse(response, "Failed to cancel order");
}
