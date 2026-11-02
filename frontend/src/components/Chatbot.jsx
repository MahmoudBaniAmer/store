import { useState } from "react";
import { sendChatMessage } from "../services/chatService";

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        const content = input.trim();
        if (!content || loading) return;

        const nextMessages = [...messages, { role: "user", content }].slice(-8);
        setMessages(nextMessages);
        setInput("");
        setError("");
        setLoading(true);

        try {
            const data = await sendChatMessage(nextMessages);
            setMessages([...nextMessages, { role: "model", content: data.text }].slice(-8));
        } catch (requestError) {
            setError(requestError.message || "The assistant could not respond.");
            setMessages(nextMessages.slice(0, -1));
            setInput(content);
        } finally {
            setLoading(false);
        }
    }

    return (
        <aside className={`store-chat ${open ? "is-open" : ""}`}>
            {open && (
                <section className="store-chat-panel" aria-label="Marvet shopping assistant">
                    <header>
                        <div>
                            <strong>Marvet Assistant</strong>
                            <p>Product discovery and store help</p>
                        </div>
                        <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>×</button>
                    </header>
                    <div className="store-chat-messages" aria-live="polite">
                        {messages.length === 0 && (
                            <p className="store-chat-intro">Ask about products in our current catalog or how the demo store works.</p>
                        )}
                        {messages.map((message, index) => (
                            <p className={`store-chat-message ${message.role}`} key={`${index}-${message.role}`}>
                                {message.content}
                            </p>
                        ))}
                        {loading && <p className="store-chat-status">Thinking…</p>}
                        {error && <p className="store-chat-error" role="alert">{error}</p>}
                    </div>
                    <form onSubmit={handleSubmit}>
                        <label className="sr-only" htmlFor="store-chat-input">Message the Marvet assistant</label>
                        <input
                            id="store-chat-input"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            maxLength={1000}
                            placeholder="Ask a question…"
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading || !input.trim()}>Send</button>
                    </form>
                    <small>Product information is based on the current catalog. Order status is not available here.</small>
                </section>
            )}
            <button
                type="button"
                className="store-chat-toggle"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
            >
                {open ? "Close assistant" : "Ask Marvet"}
            </button>
        </aside>
    );
}
