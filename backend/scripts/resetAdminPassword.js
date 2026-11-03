require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDB } = require("../models/db");
const User = require("../models/User");

const LOCAL_MONGO_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const MIN_PASSWORD_LENGTH = 12;

function readHiddenPassword(prompt) {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
        return Promise.reject(new Error("Run this command from an interactive terminal so the password can be hidden"));
    }

    return new Promise((resolve, reject) => {
        let value = "";
        let finished = false;
        const stdin = process.stdin;
        const wasRaw = Boolean(stdin.isRaw);

        process.stdout.write(prompt);
        stdin.setRawMode(true);
        stdin.setEncoding("utf8");
        stdin.resume();

        const cleanup = () => {
            if (finished) return;
            finished = true;
            stdin.removeListener("data", onData);
            stdin.setRawMode(wasRaw);
            process.stdout.write("\n");
        };

        const onData = (chunk) => {
            for (const character of chunk) {
                if (finished) return;
                if (character === "\u0003") {
                    cleanup();
                    reject(new Error("Password reset cancelled"));
                    return;
                }

                if (character === "\r" || character === "\n") {
                    cleanup();
                    resolve(value);
                    return;
                }

                if (character === "\u007f" || character === "\b") {
                    value = value.slice(0, -1);
                    continue;
                }

                if (character >= " " && character !== "\u007f") {
                    value += character;
                }
            }
        };

        stdin.on("data", onData);
    });
}

async function resetAdminPassword() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Admin password recovery is allowed only when NODE_ENV=development");
    }

    const expectedDatabase = process.env.EXPECTED_ADMIN_DATABASE;
    if (!expectedDatabase) {
        throw new Error("Set EXPECTED_ADMIN_DATABASE to the exact local development database name");
    }

    const email = process.argv[2]?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Pass the existing administrator's email as the command argument");
    }

    await connectDB();
    if (mongoose.connection.name !== expectedDatabase) {
        throw new Error("Connected database does not match EXPECTED_ADMIN_DATABASE");
    }
    if (!LOCAL_MONGO_HOSTS.has(mongoose.connection.host)) {
        throw new Error("Admin password recovery is allowed only on a local MongoDB host");
    }

    const admin = await User.findOne({ email }).select("_id role");
    if (!admin) {
        throw new Error("No existing account was found for that email; no account was created");
    }
    if (admin.role !== "admin") {
        throw new Error("The account is not already an administrator; no role was changed");
    }

    const password = await readHiddenPassword(`New password (at least ${MIN_PASSWORD_LENGTH} characters): `);
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
        throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and 128 characters`);
    }

    const confirmation = await readHiddenPassword("Confirm new password: ");
    if (password !== confirmation) {
        throw new Error("Passwords do not match");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await User.updateOne(
        { _id: admin._id, role: "admin" },
        { $set: { password: passwordHash } }
    );

    if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
        throw new Error("The existing administrator could not be updated");
    }

    console.log("Password updated for the existing administrator. The password and hash were not displayed.");
}

resetAdminPassword()
    .catch((error) => {
        console.error("Admin password recovery failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
