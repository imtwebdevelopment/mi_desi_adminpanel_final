import React, { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import { 
    db, 
    doc,     
    getDoc   
} from "../../firebase"; 

// --- Constants ---
const CUSTOMER_COLLECTION = "customers";
const ADDRESS_SUBCOLLECTION = "address"; 
// -------------------

/**
 * Helper function to format a Timestamp or string date object
 */
const formatTimestamp = (value) => {
    if (value && typeof value.toDate === 'function') {
        return value.toDate().toLocaleString('en-US', {
            month: '2-digit', day: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    }
    if (typeof value === 'string' || typeof value === 'number') {
        try {
            return new Date(value).toLocaleString('en-US', {
                month: '2-digit', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        } catch (e) {
            return String(value);
        }
    }
    return 'N/A';
};

/**
 * Helper function for attractive field rendering (matches ViewCustomerModal style)
 */
const renderField = (label, value, isHighlighted = false) => (
    <p className='mb-2 small'>
        <strong className='text-dark fw-medium me-2'>{label}:</strong> 
        <span className={`fw-normal ${isHighlighted ? 'text-monospace text-primary fw-bold' : 'text-secondary'}`}>
            {String(value) || 'N/A'}
        </span>
    </p>
);


const AddressDetailsFetcher = ({ customerId, addressId, onFetchComplete }) => {
    const [addressData, setAddressData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!customerId || !addressId) {
            setError("Error: Both customerId and addressId must be provided.");
            setLoading(false);
            return;
        }

        const fetchAddressData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const addressDocRef = doc(
                    db, CUSTOMER_COLLECTION, customerId, ADDRESS_SUBCOLLECTION, addressId
                );
                const docSnap = await getDoc(addressDocRef);

                if (docSnap.exists()) {
                    setAddressData({ id: docSnap.id, ...docSnap.data() });
                    if (onFetchComplete) onFetchComplete(docSnap.data()); 
                } else {
                    setError(`Error: Address document not found for ID: ${addressId}`);
                }

            } catch (err) {
                console.error(`Error fetching address ${addressId}:`, err);
                setError(`Failed to fetch address data. Details: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchAddressData();
    }, [customerId, addressId, onFetchComplete]); 

    // --- Render Logic ---

    if (loading) {
        return (
            <div className="card p-4 h-100 address-card-loading">
                <div className="text-center">
                    <div className="spinner-border spinner-border-sm text-info" role="status"></div>
                    <small className="ms-2 text-info fw-medium">Loading address details...</small>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger p-3 small mb-0 h-100" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Fetch Error:</strong> {error}
            </div>
        );
    }
    
    // Define the ordered fields and their labels for rendering, based on the database image.
    const orderedFields = [
        { key: 'name', label: 'Recipient Name' },
        { key: 'phoneNumber', label: 'Contact Number', highlight: true }, // Highlighted
        { key: 'streetName', label: 'Street Address' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'pinCode', label: 'Pincode' },
        { key: 'lattitude', label: 'Latitude', isCode: true },
        { key: 'longitude', label: 'Longitude', isCode: true },
        { key: 'timestamp', label: 'Created On', format: true }, 
    ];
    
    const addressTitle = addressData.title || 'Address Details'; 

    return (
        // Matches the Core Data card style: p-4 bg-light rounded-3 shadow-sm h-100
        <div className="p-4 bg-light rounded-3 shadow-sm h-100">
            <h5 className='mb-4 text-primary border-bottom pb-2'>Address: {addressTitle}</h5>
            
            {/* Document ID */}
            <p className="mb-3 small">
                <strong className='text-dark fw-medium me-2'>Document ID:</strong> 
                <span className='fw-normal text-monospace text-secondary'>{addressData.id}</span>
            </p>
            
            <div className="address-details-list">
                {orderedFields
                    .filter(field => addressData[field.key] !== undefined)
                    .map(field => {
                        let value = addressData[field.key];
                        
                        // Apply formatting if requested
                        if (field.format) {
                            value = formatTimestamp(value);
                        }
                        
                        // Render the field. Highlight phone number and code fields (Latitude/Longitude).
                        const isHighlighted = field.highlight || field.isCode;
                        
                        return renderField(
                            field.label, 
                            value, 
                            isHighlighted
                        );
                    })}
            </div>
        </div>
    );
};

export default AddressDetailsFetcher;