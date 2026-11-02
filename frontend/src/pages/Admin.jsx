import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
    adminGetProducts, adminGetCategories, adminGetOrders,
    adminGetAnalytics,
    adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
    adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
} from "../services/adminService";
import { Bar, Doughnut } from "react-chartjs-2";
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from "chart.js";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

const emptyProduct = { name: "", description: "", price: "", category: "", image: "", stock: "0" };
const emptyCategory = { name: "", description: "" };

export default function Admin({ user }) {
    const [tab, setTab] = useState("overview");
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [orders, setOrders] = useState([]);
    const [analytics, setAnalytics] = useState({ ordersByDay: [], productsByCategory: [] });
    const [productForm, setProductForm] = useState(emptyProduct);
    const [editingId, setEditingId] = useState(null);
    const [categoryForm, setCategoryForm] = useState(emptyCategory);
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const [p, c, o, a] = await Promise.all([
                adminGetProducts(),
                adminGetCategories(),
                adminGetOrders(),
                adminGetAnalytics(),
            ]);
            setProducts(Array.isArray(p) ? p : []);
            setCategories(Array.isArray(c) ? c : []);
            setOrders(Array.isArray(o) ? o : (o?.orders || []));
            setAnalytics({
                ordersByDay: Array.isArray(a?.ordersByDay) ? a.ordersByDay : [],
                productsByCategory: Array.isArray(a?.stockByCategory) ? a.stockByCategory : [],
            });
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (!user || user.role !== "admin") {
        return <main className="admin-page"><section className="admin-panel"><h1>Admin access required</h1><p>This page is restricted to administrator accounts.</p><Link to="/login">Login</Link></section></main>;
    }

    const orderChartData = {
        labels: analytics.ordersByDay.map(({ date }) =>
            new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
        ),
        datasets: [{
            label: "Orders",
            data: analytics.ordersByDay.map(({ count }) => count),
            backgroundColor: "#f59e0b",
            borderRadius: 6,
        }],
    };
    const categoryChartData = {
        labels: analytics.productsByCategory.map(({ category }) => category),
        datasets: [{
            label: "Products",
            data: analytics.productsByCategory.map(({ products: count }) => count),
            backgroundColor: ["#f59e0b", "#526b8f", "#10b981", "#f97316", "#8b5cf6", "#06b6d4"],
        }],
    };

    function beginEdit(product) {
        setEditingId(product._id);
        setProductForm({
            name: product.name || "", description: product.description || "",
            price: String(product.price ?? ""),
            category: product.category?._id || product.category || "",
            image: product.image || "", stock: String(product.stock ?? 0),
        });
        setTab("products");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function submitProduct(e) {
        e.preventDefault(); setBusy(true); setError(""); setNotice("");
        try {
            const body = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
            if (!body.category) throw new Error("Please select a category.");
            if (editingId) await adminUpdateProduct(editingId, body);
            else await adminCreateProduct(body);
            setProductForm(emptyProduct); setEditingId(null);
            setNotice(editingId ? "Product updated." : "Product created.");
            await loadData();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }

    async function removeProduct(id) {
        if (!window.confirm("Delete this product? This cannot be undone.")) return;
        setError(""); setNotice("");
        try { await adminDeleteProduct(id); setNotice("Product deleted."); await loadData(); }
        catch (e) { setError(e.message); }
    }

    async function submitCategory(e) {
        e.preventDefault(); setBusy(true); setError(""); setNotice("");
        try {
            const body = {
                name: categoryForm.name.trim(),
                description: categoryForm.description.trim(),
            };
            const isEditing = Boolean(editingCategoryId);

            if (isEditing) await adminUpdateCategory(editingCategoryId, body);
            else await adminCreateCategory(body);

            setCategoryForm(emptyCategory);
            setEditingCategoryId(null);
            setNotice(isEditing ? "Category updated." : "Category created.");
            await loadData();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    }

    function beginEditCategory(category) {
        setEditingCategoryId(category._id);
        setCategoryForm({
            name: category.name || "",
            description: category.description || "",
        });
        setError("");
        setNotice("");
    }

    function cancelCategoryEdit() {
        setEditingCategoryId(null);
        setCategoryForm(emptyCategory);
        setError("");
        setNotice("");
    }

    async function removeCategory(id) {
        if (!window.confirm("Delete this category? Make sure no products depend on it.")) return;
        setError(""); setNotice("");
        try {
            await adminDeleteCategory(id);
            if (editingCategoryId === id) cancelCategoryEdit();
            setNotice("Category deleted.");
            await loadData();
        }
        catch (e) { setError(e.message); }
    }

    return (
        <main className="admin-page">
            <div className="admin-heading"><div><span className="admin-eyebrow">MARVET MANAGEMENT</span><h1>Admin Dashboard</h1><p>Manage your store inventory, categories, and orders.</p></div><button type="button" onClick={loadData} className="admin-secondary">Refresh</button></div>
            {error && <div className="admin-alert admin-error" role="alert">{error}</div>}
            {notice && <div className="admin-alert admin-success" role="status">{notice}</div>}
            <nav className="admin-tabs" aria-label="Admin sections">
                {[["overview", "Overview"], ["products", "Products"], ["categories", "Categories"], ["orders", "Orders"]].map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
            </nav>
            {loading ? <p className="admin-loading">Loading dashboard…</p> : <>
                {tab === "overview" && <>
                    <section className="admin-stats">
                        <article><span>Products</span><strong>{products.length}</strong></article>
                        <article><span>Categories</span><strong>{categories.length}</strong></article>
                        <article><span>Orders</span><strong>{orders.length}</strong></article>
                        <article><span>Low stock</span><strong>{products.filter(p => Number(p.stock || 0) <= 5).length}</strong></article>
                    </section>
                    <section className="admin-charts" aria-label="Store analytics">
                        <article className="admin-chart-card">
                            <h2>Orders per day</h2>
                            <p>Last 7 days, based on actual order records</p>
                            {analytics.ordersByDay.some(({ count }) => count > 0)
                                ? <Bar data={orderChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
                                : <p className="admin-chart-empty">No orders were placed in the last 7 days.</p>}
                        </article>
                        <article className="admin-chart-card">
                            <h2>Products by category</h2>
                            <p>Current product catalog</p>
                            {analytics.productsByCategory.length > 0
                                ? <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
                                : <p className="admin-chart-empty">No product data is available yet.</p>}
                        </article>
                    </section>
                </>}
                {tab === "products" && <section className="admin-section"><h2>{editingId ? "Edit product" : "Add product"}</h2><form className="admin-form" onSubmit={submitProduct}>
                    <label>Product name<input required value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} /></label>
                    <label>Description<textarea required rows="3" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} /></label>
                    <div className="admin-form-grid"><label>Price<input required type="number" min="0" step="0.01" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} /></label><label>Stock<input required type="number" min="0" step="1" value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })} /></label></div>
                    <label>Category<select required value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })}><option value="">Choose category</option>{categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></label>
                    <label>Image URL<input type="url" placeholder="https://…" value={productForm.image} onChange={e => setProductForm({ ...productForm, image: e.target.value })} /></label>
                    <div className="admin-form-actions"><button disabled={busy} type="submit">{busy ? "Saving…" : editingId ? "Save changes" : "Create product"}</button>{editingId && <button type="button" className="admin-secondary" onClick={() => { setEditingId(null); setProductForm(emptyProduct) }}>Cancel edit</button>}</div>
                </form><h2 className="admin-list-title">Current products ({products.length})</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.map(p => <tr key={p._id}><td>{p.name}</td><td>${Number(p.price || 0).toFixed(2)}</td><td>{p.stock ?? 0}</td><td className="admin-row-actions"><button type="button" onClick={() => beginEdit(p)}>Edit</button><button type="button" className="danger" onClick={() => removeProduct(p._id)}>Delete</button></td></tr>)}</tbody></table></div></section>}
                {tab === "categories" && <section className="admin-section"><h2>{editingCategoryId ? "Edit category" : "Add category"}</h2><form className="admin-inline-form" onSubmit={submitCategory}><input required value={categoryForm.name} placeholder="Category name" onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} /><textarea rows="2" value={categoryForm.description} placeholder="Description (optional)" onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} /><button disabled={busy} type="submit">{busy ? "Saving…" : editingCategoryId ? "Save changes" : "Add category"}</button>{editingCategoryId && <button type="button" className="admin-secondary" disabled={busy} onClick={cancelCategoryEdit}>Cancel edit</button>}</form><div className="admin-category-list">{categories.map(c => <div key={c._id}><span>{c.name}</span><button type="button" onClick={() => beginEditCategory(c)}>Edit</button><button type="button" className="danger" onClick={() => removeCategory(c._id)}>Delete</button></div>)}</div></section>}
                {tab === "orders" && <section className="admin-section"><h2>All orders ({orders.length})</h2>{orders.length === 0 ? <p>No orders yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Products</th><th>Qty</th><th>Date</th></tr></thead><tbody>{orders.map(o => { const items = o.items?.length ? o.items : [{ product: o.product, quantity: o.quantity }]; return <tr key={o._id}><td>{String(o._id).slice(-7)}</td><td>{o.user?.name || o.user?.email || String(o.user || "—")}</td><td>{items.map(item => item.product?.name || String(item.product || "—")).join(", ")}</td><td>{items.reduce((sum, item) => sum + item.quantity, 0)}</td><td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td></tr>; })}</tbody></table></div>}</section>}
            </>}
        </main>
    );
}
