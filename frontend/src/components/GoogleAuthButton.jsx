import { GoogleLogin } from "@react-oauth/google";
import { loginWithGoogle } from "../services/authService";

export default function GoogleAuthButton({ onLogin, onError, onLoading }) {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;

    async function handleSuccess(response) {
        if (!response.credential) {
            onError("Google did not return an ID token. Please try again.");
            return;
        }

        try {
            onLoading(true);
            onError("");
            const data = await loginWithGoogle(response.credential);
            onLogin(data.user, data.token);
        } catch (error) {
            onError(error.message || "Google sign-in failed");
        } finally {
            onLoading(false);
        }
    }

    return (
        <>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="google-auth-button">
                <GoogleLogin
                    onSuccess={handleSuccess}
                    onError={() => onError("Google sign-in was not completed.")}
                    text="continue_with"
                    shape="rectangular"
                    width="100%"
                />
            </div>
        </>
    );
}
