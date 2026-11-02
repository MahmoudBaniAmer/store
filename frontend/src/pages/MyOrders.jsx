import { useCallback, useEffect, useState } from "react";
import { cancelOrder, getOrders } from "../services/orderService";

function MyOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyOrderId, setBusyOrderId] = useState("");

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getOrders();
            setOrders(Array.isArray(data) ? data : data?.orders || []);
        } catch (err) {
            setError(err.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    async function handleCancelOrder(orderId) {
        if (!window.confirm("Are you sure you want to cancel this order?")) return;
        try {
            setBusyOrderId(orderId);
            await cancelOrder(orderId);
            setOrders((current) => current.filter((order) => order._id !== orderId));
        } catch (err) {
            window.alert(err.message || "Failed to cancel order");
        } finally {
            setBusyOrderId("");
        }
    }

    if (loading) return <main className="my-orders-page"><h2>Loading orders...</h2></main>;

    return (
        <main className="my-orders-page">
            <div className="section-header">
                <div><p className="section-label">YOUR ACCOUNT</p><h1>My Orders</h1></div>
                <button type="button" onClick={fetchOrders}>Refresh</button>
            </div>

            {error && <p role="alert">{error}</p>}

            {!error && orders.length === 0 ? (
                <div className="empty-state">
                    <h2>You haven't placed any orders yet.</h2>
                </div>
            ) : (
                <div className="my-orders-list">
                    {orders.map((order) => {
                        const items = order.items?.length
                            ? order.items
                            : [{ product: order.product, quantity: order.quantity }];
                        const total = items.reduce((sum, item) => (
                            item.product?.price != null
                                ? sum + Number(item.product.price) * item.quantity
                                : sum
                        ), 0);

                        return (
                            <article className="my-order-card" key={order._id}>
                                <h3>{items.length === 1 ? items[0].product?.name || "Product no longer available" : `Order (${items.length} items)`}</h3>
                                {items.map((item, index) => (
                                    <p key={item.product?._id || index}>
                                        {item.product?.name || "Product no longer available"} — Quantity: {item.quantity}
                                    </p>
                                ))}
                                {items.every((item) => item.product?.price != null) && (
                                    <p>Price: ${total.toFixed(2)}</p>
                                )}
                                <p>Placed: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</p>
                                <p className="order-id">Order ID: {order._id}</p>
                                <button
                                    type="button"
                                    className="cancel-order-button"
                                    disabled={busyOrderId === order._id}
                                    onClick={() => handleCancelOrder(order._id)}
                                >
                                    {busyOrderId === order._id ? "Cancelling..." : "Cancel Order"}
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </main>
    );
}

export default MyOrders;
