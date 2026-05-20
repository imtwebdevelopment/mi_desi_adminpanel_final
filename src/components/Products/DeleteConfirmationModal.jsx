import React from 'react';
import "bootstrap/dist/css/bootstrap.min.css";

const DeleteConfirmationModal = ({ product, onClose, onConfirm }) => {
    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content shadow-lg rounded-4">
                    <div className="modal-header">
                        <h5 className="modal-title text-danger">Delete Product</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        Are you sure you want to delete <strong>{product.name}</strong> (ID: {product.id})? This action cannot be undone.
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="button" className="btn btn-danger" onClick={onConfirm}>Delete Permanently</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;