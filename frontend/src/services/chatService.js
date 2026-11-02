import { API_BASE_URL } from "./apiConfig";

export async function sendChatMessage(messages) {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || "The assistant could not respond");
    }
    return data;
}
