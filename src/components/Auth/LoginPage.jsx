import React, { useState } from 'react';
import "bootstrap/dist/css/bootstrap.min.css"; 
// ⚠️ Adjust path to your Firebase config file
import { auth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";


const LoginPage = ({ onForgotPassword }) => {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Success: App.jsx's onAuthStateChanged handles the view change automatically
        } catch (err) {
            console.error("Firebase Login Error:", err.code, err.message);
            
            let errorMessage = "An unknown error occurred.";
            switch (err.code) {
                case "auth/user-not-found":
                case "auth/wrong-password":
                case "auth/invalid-credential":
                    errorMessage = "Invalid email or password.";
                    break;
                case "auth/invalid-email":
                    errorMessage = "The email address is not valid.";
                    break;
                case "auth/user-disabled":
                    errorMessage = "This user account has been disabled.";
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
                 minHeight: '100vh', 
                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                 position: 'relative',
                 overflow: 'hidden'
             }}>
            
            {/* Animated background elements */}
            <div className="position-absolute w-100 h-100" style={{ 
                background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                zIndex: 1
            }}></div>
            
            <div className="position-absolute w-100 h-100" style={{ 
                background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                zIndex: 1
            }}></div>
            
            <div className="card border-0 shadow-xxl rounded-4 position-relative" 
                 style={{ 
                     width: '420px',
                     zIndex: 2,
                     backdropFilter: 'blur(10px)',
                     backgroundColor: 'rgba(255, 255, 255, 0.95)',
                     border: '1px solid rgba(255, 255, 255, 0.2)'
                 }}>
                
                {/* Decorative header with gradient */}
                <div className="card-header border-0 rounded-top-4 py-4" 
                     style={{
                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                         position: 'relative',
                         overflow: 'hidden'
                     }}>
                    <div className="position-absolute top-0 start-0 w-100 h-100" 
                         style={{
                             background: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)'
                         }}></div>
                    <h4 className="text-white text-center mb-0 position-relative z-1">
                        <i className="bi bi-shield-lock me-2"></i>
                        Mi Desi Admin Panel
                    </h4>
                    <p className="text-white-50 text-center mb-0 mt-1 small position-relative z-1">
                        Secure Access Portal
                    </p>
                </div>
                
                <div className="card-body p-4">
                    {/* Welcome message */}
                    <div className="text-center mb-4">
                        <h5 className="text-dark mb-1">Welcome Back</h5>
                        <p className="text-muted small">Sign in to continue to your dashboard</p>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-danger d-flex align-items-center rounded-3" role="alert">
                                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                <span className="small">{error}</span>
                            </div>
                        )}
                        
                        {/* Email Input */}
                        <div className="mb-3">
                            <label htmlFor="emailInput" className="form-label text-dark fw-medium mb-2">
                                <i className="bi bi-envelope me-1"></i> Email Address
                            </label>
                            <div className="input-group input-group-lg">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-person text-muted"></i>
                                </span>
                                <input
                                    type="email"
                                    className="form-control border-start-0 ps-2"
                                    id="emailInput"
                                    placeholder="admin@midesi.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    style={{ height: '48px' }}
                                />
                            </div>
                        </div>
                        
                        {/* Password Input */}
                        <div className="mb-4">
                           <div className="d-flex justify-content-between align-items-center mb-2">
    <label htmlFor="passwordInput" className="form-label text-dark fw-medium mb-0">
        <i className="bi bi-lock me-1"></i> Password
    </label>
    <button
        type="button"
        className="btn btn-link p-0 small text-decoration-none"
        onClick={onForgotPassword}
        disabled={loading}
    >
        Forgot Password?
    </button>
</div>
                            <div className="input-group input-group-lg">
                                <span className="input-group-text bg-light border-end-0">
                                    <i className="bi bi-key text-muted"></i>
                                </span>
                                <input
                                    type="password"
                                    className="form-control border-start-0 ps-2"
                                    id="passwordInput"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    style={{ height: '48px' }}
                                />
                            </div>
                        </div>
                        
                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            className="btn btn-lg w-100 rounded-pill py-3 fw-semibold shadow-sm"
                            disabled={loading}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                transition: 'all 0.3s ease',
                                height: '52px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-box-arrow-in-right me-2"></i>
                                    Sign In to Dashboard
                                </>
                            )}
                        </button>
                    </form>
                    
                    {/* Divider */}
                    <div className="position-relative text-center my-4">
                        <hr className="text-muted" />
                        <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">
                            Secure Authentication
                        </span>
                    </div>
                    
                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-top">
                        <p className="small text-muted mb-0">
                            <i className="bi bi-shield-check text-success me-1"></i>
                            Your credentials are encrypted and secured
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Copyright */}
            <div className="position-absolute bottom-0 start-0 w-100 text-center text-white-50 py-3 small" style={{ zIndex: 2 }}>
                © {new Date().getFullYear()} Mi Desi Admin Panel. All rights reserved.
            </div>
        </div>
    );
};

export default LoginPage;