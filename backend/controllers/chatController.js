const Product = require("../models/Product");

const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1000;
const GEMINI_REQUEST_TIMEOUT_MS = 20000;
const ORDER_STATUS_QUESTION =
    /\b(?:status.{0,30}orders?|orders?.{0,30}status|track(?:ing)?\s+(?:my\s+)?orders?|where(?:'s| is)\s+my order)\b/i;

const chat = async (req, res) => {
    const { messages } = req.body || {};
    if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.length > MAX_MESSAGES ||
        messages.some((message) =>
            !message ||
            !["user", "model"].includes(message.role) ||
            typeof message.content !== "string" ||
            message.content.trim().length === 0 ||
            message.content.length > MAX_MESSAGE_LENGTH
        ) ||
        messages[messages.length - 1]?.role !== "user"
    ) {
        return res.status(400).json({
            message: `Send 1-${MAX_MESSAGES} conversation messages, ending with a user message of at most ${MAX_MESSAGE_LENGTH} characters`
        });
    }

    if (ORDER_STATUS_QUESTION.test(messages[messages.length - 1].content)) {
        return res.status(200).json({
            text: "I cannot access order records or provide order status. Sign in and check My Orders for your order information."
        });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        return res.status(503).json({
            message: "Gemini is not configured. Set GEMINI_API_KEY in the backend environment and restart the backend."
        });
    }

    try {
        const products = await Product.find({ isActive: { $ne: false } })
            .select("name brand description price stock inStock category")
            .populate("category", "name")
            .limit(30)
            .lean();
        const catalog = products.map((product) => ({
            name: product.name,
            brand: product.brand,
            description: product.description,
            price: product.price,
            stock: product.stock,
            inStock: product.inStock,
            category: product.category?.name || "Uncategorized"
        }));
        const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
        let response;
        try {
            response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },
                    signal: controller.signal,
                    body: JSON.stringify({
                        systemInstruction: {
                            parts: [{
                                text: [
                                    "You are Marvet's shopping assistant. Help customers discover products and answer general questions about using this demo store.",
                                    "Use only the supplied catalog for product names, prices, and stock. This snapshot contains up to 30 products and may not be the complete catalog. Do not claim that a product is unavailable just because it is absent from this snapshot.",
                                    "You have no access to customer accounts, orders, or order status. Never claim to look up or know those details.",
                                    "If asked about missing or live information, say you cannot verify it. Never claim to place orders, accept payments, or process returns.",
                                    `Current catalog snapshot: ${JSON.stringify(catalog)}`
                                ].join(" ")
                            }]
                        },
                        contents: messages.map((message) => ({
                            role: message.role,
                            parts: [{ text: message.content.trim() }]
                        })),
                        generationConfig: {
                            temperature: 0.4,
                            maxOutputTokens: 512
                        }
                    })
                }
            );
        } catch (error) {
            if (error.name === "AbortError") {
                return res.status(504).json({
                    message: "The store assistant timed out. Please try again."
                });
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            console.error("Gemini request failed with status:", response.status);
            if ([400, 401, 403].includes(response.status)) {
                return res.status(502).json({
                    message: "Gemini rejected the request or backend API key. Check GEMINI_API_KEY, GEMINI_MODEL, and confirm the Gemini API is enabled for its project."
                });
            }
            if (response.status === 404) {
                return res.status(502).json({
                    message: "The configured Gemini model was not found. Check GEMINI_MODEL in the backend environment."
                });
            }
            if (response.status === 429) {
                return res.status(503).json({
                    message: "Gemini is temporarily rate-limited or out of quota. Please try again later."
                });
            }
            return res.status(502).json({
                message: "The store assistant is temporarily unavailable"
            });
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("")
            .trim();

        if (!text) {
            return res.status(502).json({
                message: "The store assistant returned no response"
            });
        }

        return res.status(200).json({ text });
    } catch (error) {
        console.error("STORE ASSISTANT ERROR:", error.name);
        return res.status(502).json({
            message: "The store assistant is temporarily unavailable"
        });
    }
};

module.exports = { chat };
