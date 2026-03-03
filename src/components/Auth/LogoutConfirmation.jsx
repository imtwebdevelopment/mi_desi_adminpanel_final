import React from 'react';
import "bootstrap/dist/css/bootstrap.min.css";

const LogoutConfirmation = ({ onConfirmLogout, onCancel }) => {
    return (
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f1f3f6' }}>
            <div className="card shadow-lg rounded-4" style={{ width: '450px', maxWidth: '90%' }}>
                <div className="card-header bg-warning text-white text-center rounded-top-4" style={{ borderBottom: 'none' }}>
                    <h4 className="mb-0 py-2 fw-bold">Confirm Logout</h4>
                </div>
                <div className="card-body p-4 text-center">
                    <div className="mb-3">
                        {/* Logout Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" fill="#fbb03b" className="bi bi-box-arrow-right" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                            <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                        </svg>
                    </div>
                    
                    <h5 className="card-title text-dark mb-3">Are you sure you want to log out?</h5>
                    <p className="card-text text-muted">You will need to re-enter your credentials to access the Admin Panel again.</p>
                </div>
                <div className="card-footer d-flex justify-content-around p-3 bg-light rounded-bottom-4">
                    <button 
                        type="button" 
                        className="btn btn-secondary rounded-pill px-4 fw-semibold shadow-sm" 
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-warning rounded-pill px-4 fw-semibold shadow-sm text-white" 
                        onClick={onConfirmLogout}
                    >
                        Yes, Log Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutConfirmation;
