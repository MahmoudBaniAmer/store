import { useEffect, useState } from "react";

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch logged-in user's orders
    async function fetchOrders() {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("marvetToken");

            const response = await fetch("http://localhost:5000/orders", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch orders");
            }

            setOrders(data);
        } catch (error) {
            setError(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    // Cancel an order
    async function handleCancelOrder(orderId) {
        const confirmCancel = window.confirm(
            "Are you sure you want to cancel this order?"
        );

        if (!confirmCancel) return;

        try {
            const token = localStorage.getItem("marvetToken");

            const response = await fetch(
                `http://localhost:5000/orders/${orderId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to cancel order");
            }

            // Remove cancelled order from the page
            setOrders((currentOrders) =>
                currentOrders.filter((order) => order._id !== orderId)
            );

            alert("Order cancelled successfully!");
        } catch (error) {
            alert(error.message || "Something went wrong");
        }
    }

    // Fetch orders when the page opens
    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) {
        return (
            <main className="my-orders-page">
                <h2>Loading orders...</h2>
            </main>
        );
    }

    if (error) {
        return (
            <main className="my-orders-page">
                <h1>My Orders</h1>
                <p>{error}</p>

                <button type="button" onClick={fetchOrders}>
                    Try Again
                </button>
            </main>
        );
    }

    return (
        <main className="my-orders-page">
            <h1>My Orders</h1>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <h2>You haven't placed any orders yet.</h2>
                </div>
            ) : (
                <div className="my-orders-list">
                    {orders.map((order) => (
                        <div className="my-order-card" key={order._id}>
                            <h3>{order.product?.name || "Product"}</h3>

                            <p>Quantity: {order.quantity}</p>

                            {order.product?.price !== undefined && (
                                <p>
                                    Price: $
                                    {(order.product.price * order.quantity).toFixed(2)}
                                </p>
                            )}

                            <p className="order-id">Order ID: {order._id}</p>

                            <button
                                type="button"
                                className="cancel-order-button"
                                onClick={() => handleCancelOrder(order._id)}
                            >
                                Cancel Order
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}

export default MyOrders;