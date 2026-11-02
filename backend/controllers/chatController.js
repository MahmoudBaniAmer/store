const Product = require("../models/Product");

const MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 1000;
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            message: "The store assistant is not configured"
        });
    }

    try {
        const products = await Product.find()
            .select("name description price stock inStock category")
            .populate("category", "name")
            .limit(30)
            .lean();
        const catalog = products.map((product) => ({
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            inStock: product.inStock,
            category: product.category?.name || "Uncategorized"
        }));
        const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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

        if (!response.ok) {
            console.error("Gemini request failed with status:", response.status);
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
