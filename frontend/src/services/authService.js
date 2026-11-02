import { API_BASE_URL } from "./apiConfig";

const API_URL = `${API_BASE_URL}/api/auth`;

// Register a new user
export async function registerUser(userData) {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Registration failed");
    }

    return data;
}

// Login an existing user
export async function loginUser(credentials) {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Login failed");
    }

    return data;
}

export async function loginWithGoogle(credential) {
    const response = await fetch(`${API_URL}/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Google sign-in failed");
    }

    return data;
}