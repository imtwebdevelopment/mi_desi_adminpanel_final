import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const ForgotPasswordPage = ({ onBack }) => {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleReset = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset email sent successfully. Please check your inbox.");
        } catch (err) {
            console.error("Reset Error:", err.code, err.message);

            let errorMessage = "Something went wrong.";
            switch (err.code) {
                case "auth/user-not-found":
                    errorMessage = "No account found with this email.";
                    break;
                case "auth/invalid-email":
                    errorMessage = "Invalid email address.";
                    break;
                default:
                    errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center"
             style={{
                 minHeight: "100vh",
                 background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
             }}>

            <div className="card border-0 shadow rounded-4"
                 style={{
                     width: "420px",
                     backgroundColor: "rgba(255, 255, 255, 0.95)"
                 }}>

                <div className="card-header text-center text-white rounded-top-4 py-4"
                     style={{
                         background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                     }}>
                    <h4 className="mb-0">
                        <i className="bi bi-envelope-check me-2"></i>
                        Reset Password
                    </h4>
                </div>

                <div className="card-body p-4">
                    <p className="text-muted small text-center mb-4">
                        Enter your registered email address. We will send you a password reset link.
                    </p>

                    {message && (
                        <div className="alert alert-success small">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger small">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleReset}>
                        <div className="mb-3">
                            <label className="form-label fw-medium">
                                Email Address
                            </label>
                            <input
                                type="email"
                                className="form-control form-control-lg"
                                placeholder="admin@midesi.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-lg w-100 rounded-pill py-3 fw-semibold"
                            disabled={loading}
                            style={{
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                border: "none"
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Sending...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </button>
                    </form>

                    <div className="text-center mt-3">
                        <button
                            className="btn btn-link text-decoration-none"
                            onClick={onBack}
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;