const API_URL = "http://localhost:5000/orders";

function getAuthHeaders() {
    const token = localStorage.getItem("marvetToken");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

// Create order
export async function createOrder(orderData) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to create order");
    }

    return data;
}

// Get user's orders
export async function getOrders() {
    const response = await fetch(API_URL, {
        method: "GET",
        headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to get orders");
    }

    return data;
}

// Cancel order
export async function cancelOrder(orderId) {
    const response = await fetch(`${API_URL}/${orderId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to cancel order");
    }

    return data;
}