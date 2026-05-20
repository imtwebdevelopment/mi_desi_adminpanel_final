import React, { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
// ⚠️ IMPORTANT: These functions must be correctly exported from your Firebase setup file.
import { 
    db, 
    doc,     
    getDoc   
} from "../../firebase"; 

// --- Constants ---
const CUSTOMER_COLLECTION = "customers";
const ORDER_SUBCOLLECTION = "orders"; 
// -------------------

/**
 * Helper function to format a Timestamp or string date object
 */
const formatTimestamp = (value) => {
    if (value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString(); 
    }
    if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
        return new Date(value.seconds * 1000).toLocaleString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        try {
            return new Date(value).toLocaleString(); 
        } catch (e) {
            return String(value);
        }
    }
    return 'N/A';
};

/**
 * Helper function to format camelCase keys into Title Case
 */
const formatKey = (key) => {
    // Correct specific fields
    if (key === 'orderStatus') return 'Order Status';
    if (key === 'orderId') return 'Order ID';
    if (key === 'totalAmount') return 'Total Amount';
    if (key === 'orderDate') return 'Order Date (String)';
    
    // General camelCase formatting
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

/**
 * Helper function for attractive field rendering
 */
const renderField = (label, value, isHighlighted = false, isProductDetail = false) => (
    <p className={`mb-1 small ${isProductDetail ? 'ms-3 border-start ps-2 border-warning-subtle' : ''}`}>
        <strong className={`fw-medium me-2 ${isProductDetail ? 'text-dark' : 'text-dark'}`}>{label}:</strong> 
        <span className={`fw-normal ${isHighlighted ? 'text-monospace text-danger fw-bold' : 'text-secondary'}`}>
            {String(value) || 'N/A'}
        </span>
    </p>
);

const OrderDetailsFetcher = ({ customerId, orderId }) => {
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!customerId || !orderId) {
            setError("Error: Both customerId and orderId must be provided.");
            setLoading(false);
            return;
        }

        const fetchOrderData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const orderDocRef = doc(
                    db, CUSTOMER_COLLECTION, customerId, ORDER_SUBCOLLECTION, orderId
                );
                const docSnap = await getDoc(orderDocRef);

                if (docSnap.exists()) {
                    setOrderData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError(`Error: Order document not found for ID: ${orderId}`);
                }

            } catch (err) {
                console.error(`Error fetching order ${orderId}:`, err);
                setError(`Failed to fetch order data. Details: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [customerId, orderId]); 

    // --- Render Logic ---

    if (loading) {
        return (
            <div className="card p-4 h-100 bg-light shadow-sm">
                <div className="text-center">
                    <div className="spinner-border spinner-border-sm text-warning" role="status"></div>
                    <small className="ms-2 text-warning fw-medium">Loading order details...</small>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger p-3 small mb-0 h-100" role="alert">
                <strong>Fetch Error:</strong> {error}
            </div>
        );
    }
    
    const products = orderData.products || [];
    const topLevelKeys = Object.keys(orderData).filter(key => 
        !['id', 'products'].includes(key)
    );
    
    const orderedTopLevelKeys = [
        'orderId', 'orderStatus', 'totalAmount', 'createdAt', 'orderDate', 'address', 'phoneNumber', 'userId'
    ].filter(key => topLevelKeys.includes(key));

    return (
        <div className="p-4 bg-light rounded-3 shadow-sm h-100 order-card">
            <h5 className='mb-4 text-danger border-bottom pb-2'>Order Details</h5>
            
            {/* Document ID */}
            <p className="mb-3 small">
                <strong className='text-dark fw-medium me-2'>Document ID:</strong> 
                <span className='fw-normal text-monospace text-secondary'>{orderData.id}</span>
            </p>
            
            <div className="order-details-list">
                {/* --- Top-Level Order Details --- */}
                {orderedTopLevelKeys.map(key => {
                    let value = orderData[key];
                    let displayValue = value;
                    let isHighlighted = false;
                    
                    if (key === 'createdAt') {
                        displayValue = formatTimestamp(value);
                        isHighlighted = true;
                    } else if (key === 'totalAmount') {
                        displayValue = `₹${parseFloat(value).toFixed(2)}`;
                        isHighlighted = true;
                    } else if (key === 'orderStatus') {
                        isHighlighted = true;
                    } else if (key === 'address') {
                         displayValue = String(value).substring(0, 50) + '...';
                    }

                    return renderField(
                        formatKey(key), 
                        displayValue, 
                        isHighlighted
                    );
                })}
                
                {/* --- Nested Product Details --- */}
                <h6 className='mt-4 mb-3 text-danger border-bottom pb-1'>Products ({products.length})</h6>
                {products.length > 0 ? (
                    products.map((product, index) => (
                        <div key={index} className="mb-3 p-2 border rounded bg-white shadow-sm-product">
                            <strong className='text-danger d-block mb-2'>Product #{index + 1}: {product.title || 'N/A'}</strong>
                            {Object.entries(product).map(([key, value]) => {
                                let displayValue = value;
                                let isHighlighted = key === 'totalAmount' || key === 'quantity';

                                if (['price', 'offerPrice', 'taxAmount', 'totalAmount'].includes(key)) {
                                    displayValue = `₹${parseFloat(value).toFixed(2)}`;
                                }
                                
                                // Skip large fields like imageUrl
                                if (key === 'imageUrl') return null;

                                return renderField(
                                    formatKey(key), 
                                    displayValue, 
                                    isHighlighted,
                                    true // isProductDetail flag
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <p className="text-muted small ms-3">No products listed for this order.</p>
                )}
            </div>
            <style>{`
                .shadow-sm-product {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
                }
            `}</style>
        </div>
    );
};

export default OrderDetailsFetcher;