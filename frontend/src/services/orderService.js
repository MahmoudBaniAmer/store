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

export async function createOrder(orderData, idempotencyKey) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify(orderData),
    });
    const data = await handleResponse(response, "Failed to create order");
    if (!data?.order?._id) {
        throw new Error("Checkout could not be confirmed. Retry safely; the same request key will be reused.");
    }
    return data;
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
