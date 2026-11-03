import { API_BASE_URL } from "./apiConfig";

export async function sendChatMessage(messages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("The assistant request timed out. Please try again.");
        }
        throw new Error("Could not reach the store assistant. Check that the backend is running and try again.");
    } finally {
        clearTimeout(timeout);
    }

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.message || "The assistant could not respond");
    }
    if (typeof data?.text !== "string" || !data.text.trim()) {
        throw new Error("The assistant returned an empty response. Please try again.");
    }
    return data;
}
