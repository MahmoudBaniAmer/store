const nodemailer = require("nodemailer");

// Create the transporter only when email is requested.
function createTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        throw new Error("Email is not configured. Add SMTP settings to backend/.env");
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
}

async function sendEmail({ to, subject, text, html }) {
    const transporter = createTransporter();

    return transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html
    });
}

async function sendWelcomeEmail(user) {
    return sendEmail({
        to: user.email,
        subject: "Welcome to Marvet!",
        text: `Hi ${user.name},\n\nWelcome to Marvet! Your account has been created successfully.\n\nHappy shopping!`,
        html: `<h2>Welcome to Marvet, ${escapeHtml(user.name)}!</h2><p>Your account has been created successfully.</p><p>Happy shopping!</p>`
    });
}

async function sendOrderConfirmation({ user, order, product }) {
    return sendEmail({
        to: user.email,
        subject: "Your Marvet order is confirmed",
        text: `Hi ${user.name},\n\nYour order has been placed successfully.\nProduct: ${product.name}\nQuantity: ${order.quantity}\nOrder ID: ${order._id}\n\nThank you for shopping with Marvet!`,
        html: `<h2>Order confirmed</h2><p>Hi ${escapeHtml(user.name)}, your order has been placed successfully.</p><ul><li><strong>Product:</strong> ${escapeHtml(product.name)}</li><li><strong>Quantity:</strong> ${order.quantity}</li><li><strong>Order ID:</strong> ${order._id}</li></ul><p>Thank you for shopping with Marvet!</p>`
    });
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
}

module.exports = { sendWelcomeEmail, sendOrderConfirmation };
