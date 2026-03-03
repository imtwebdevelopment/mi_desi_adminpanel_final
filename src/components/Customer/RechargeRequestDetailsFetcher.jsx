import React, { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import { 
    db, 
    doc,     
    getDoc   
} from "../../firebase"; 

// --- Constants ---
const CUSTOMER_COLLECTION = "customers";
const RECHARGE_SUBCOLLECTION = "rechargeRequest"; 
// -------------------

/**
 * Helper function to format a Timestamp or string date object
 * FIX: Added check for raw Firestore Timestamp object {seconds: N, nanoseconds: N}.
 */
const formatTimestamp = (value) => {
    // 1. Check for Firestore Timestamp object with .toDate() method (standard)
    if (value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString(); 
    }
    // 2. Check for the raw Firestore Timestamp object structure
    if (value && typeof value === 'object' && value.seconds && value.nanoseconds) {
        // Convert using the seconds value (multiplied by 1000 for milliseconds)
        return new Date(value.seconds * 1000).toLocaleString();
    }
    // 3. Handle string/number timestamps
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
    if (key === 'rechargeStatus') return 'Recharge Status';
    if (key === 'requestedDate') return 'Requested Date';
    if (key === 'createdAt') return 'Created At';

    // General camelCase formatting
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

/**
 * Helper function for attractive field rendering
 */
const renderField = (label, value, isHighlighted = false, isPlanDetail = false) => (
    <p className={`mb-2 small ${isPlanDetail ? 'ms-3 border-start ps-2 border-success-subtle' : ''}`}>
        <strong className={`fw-medium me-2 ${isPlanDetail ? 'text-info' : 'text-dark'}`}>{label}:</strong> 
        <span className={`fw-normal ${isHighlighted ? 'text-monospace text-success fw-bold' : 'text-secondary'}`}>
            {String(value) || 'N/A'}
        </span>
    </p>
);

const RechargeRequestDetailsFetcher = ({ customerId, requestId }) => {
    const [requestData, setRequestData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!customerId || !requestId) {
            setError("Error: Both customerId and requestId must be provided.");
            setLoading(false);
            return;
        }

        const fetchRequestData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const requestDocRef = doc(
                    db, CUSTOMER_COLLECTION, customerId, RECHARGE_SUBCOLLECTION, requestId
                );
                const docSnap = await getDoc(requestDocRef);

                if (docSnap.exists()) {
                    setRequestData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError(`Error: Request document not found for ID: ${requestId}`);
                }

            } catch (err) {
                console.error(`Error fetching request ${requestId}:`, err);
                setError(`Failed to fetch request data. Details: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchRequestData();
    }, [customerId, requestId]); 

    // --- Render Logic ---

    if (loading) {
        return (
            <div className="card p-4 h-100 bg-light shadow-sm">
                <div className="text-center">
                    <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                    <small className="ms-2 text-success fw-medium">Loading request details...</small>
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
    
    const planData = requestData.plan || {};
    // Define the order of top-level fields for display
    const primaryFieldsOrder = [
        'requestedDate', 
        'rechargeStatus', 
        'userId', 
        'number',
    ];

    // Filter out primary fields and plan from the rest of the top-level data
    const otherTopLevelFields = Object.keys(requestData).filter(key => 
        !primaryFieldsOrder.includes(key) && key !== 'id' && key !== 'plan'
    );
    
    return (
        <div className="p-4 bg-light rounded-3 shadow-sm h-100 recharge-card">
            <h5 className='mb-4 text-success border-bottom pb-2'>Recharge Request Details</h5>
            
            {/* Document ID */}
            <p className="mb-3 small">
                <strong className='text-dark fw-medium me-2'>Document ID:</strong> 
                <span className='fw-normal text-monospace text-secondary'>{requestData.id}</span>
            </p>
            
            <div className="request-details-list">
                {/* --- Primary Request Details --- */}
                {primaryFieldsOrder
                    .filter(key => requestData[key] !== undefined)
                    .map(key => {
                        let value = requestData[key];
                        let displayValue = value;
                        let isHighlighted = false;
                        
                        // Check for timestamp and format it
                        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('createdAt')) {
                            displayValue = formatTimestamp(value);
                            isHighlighted = true;
                        } else if (key === 'rechargeStatus') {
                            isHighlighted = true;
                        }

                        return renderField(
                            formatKey(key), 
                            displayValue, 
                            isHighlighted
                        );
                    })
                }
                
                {/* --- Nested Plan Details --- */}
                {Object.keys(planData).length > 0 && (
                    <>
                        <h6 className='mt-4 mb-3 text-info border-bottom pb-1'>Plan Details</h6>
                        {Object.entries(planData)
                            .filter(([key]) => key !== 'id' && key !== 'customerId') 
                            .map(([key, value]) => {
                                let displayValue = value;
                                let isTimestamp = key === 'createdAt' || key === 'date';
                                let isHighlighted = key === 'price' || key === 'status';

                                if (isTimestamp) {
                                    displayValue = formatTimestamp(value);
                                } else if (key === 'price') {
                                    displayValue = `₹${parseFloat(value).toFixed(2)}`;
                                }

                                return renderField(
                                    formatKey(key), 
                                    displayValue, 
                                    isHighlighted,
                                    true // isPlanDetail flag
                                );
                            })
                        }
                    </>
                )}
                
                {/* --- Other Top-Level Data --- */}
                {otherTopLevelFields.map(key => renderField(formatKey(key), requestData[key], false))}
            </div>
        </div>
    );
};

export default RechargeRequestDetailsFetcher;