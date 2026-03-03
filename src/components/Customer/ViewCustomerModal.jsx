import React, { useState, useEffect } from 'react';
import "bootstrap/dist/css/bootstrap.min.css";
import { 
    db, 
    collection, 
    getDocs 
} from "../../firebase"; 
import AddressDetailsFetcher from './AddressFetcher'; 
import RechargeRequestDetailsFetcher from './RechargeRequestDetailsFetcher';
import OrderDetailsFetcher from './OrderDetailsFetcher'; 
// 🆕 New Component Import
import WalletTransactionDetailsFetcher from './WalletTransactionDetailsFetcher';

const ViewCustomerModal = ({ customer, onClose }) => {
    const [activeTab, setActiveTab] = useState("data"); 
    
    // Address States
    const [addressIds, setAddressIds] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [addressFetchError, setAddressFetchError] = useState(null);

    // Recharge Request States
    const [rechargeRequestIds, setRechargeRequestIds] = useState([]);
    const [loadingRechargeRequests, setLoadingRechargeRequests] = useState(false);
    const [rechargeRequestFetchError, setRechargeRequestFetchError] = useState(null);
    
    // Order States
    const [orderIds, setOrderIds] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [orderFetchError, setOrderFetchError] = useState(null);

    // 🆕 Wallet Transaction States
    const [walletTransactionIds, setWalletTransactionIds] = useState([]);
    const [loadingWalletTransactions, setLoadingWalletTransactions] = useState(false);
    const [walletTransactionFetchError, setWalletTransactionFetchError] = useState(null);


    // --- EFFECT: Fetch IDs for all subcollections ---
    useEffect(() => {
        if (!customer.id) return;
        
        // Initialize loading states for all subcollections
        setLoadingAddresses(true);
        setLoadingRechargeRequests(true);
        setLoadingOrders(true); 
        setLoadingWalletTransactions(true); // 🆕
        
        setAddressFetchError(null);
        setRechargeRequestFetchError(null);
        setOrderFetchError(null); 
        setWalletTransactionFetchError(null); // 🆕
        
        // --- Fetch Address IDs (existing logic remains) ---
        const fetchAddressIds = async () => {
            try {
                const addressesCollectionRef = collection(db, "customers", customer.id, "address");
                const snapshot = await getDocs(addressesCollectionRef);
                const ids = snapshot.docs.map(doc => ({ id: doc.id }));
                setAddressIds(ids);
            } catch (error) {
                console.error("Error fetching address IDs:", error);
                setAddressFetchError("Failed to fetch address IDs.");
            } finally {
                setLoadingAddresses(false);
            }
        };

        // --- Fetch Recharge Request IDs (existing logic remains) ---
        const fetchRechargeRequestIds = async () => {
            try {
                const rechargeCollectionRef = collection(db, "customers", customer.id, "rechargeRequest");
                const snapshot = await getDocs(rechargeCollectionRef);
                const ids = snapshot.docs.map(doc => ({ id: doc.id }));
                setRechargeRequestIds(ids);
            } catch (error) {
                console.error("Error fetching recharge request IDs:", error);
                setRechargeRequestFetchError("Failed to fetch recharge request IDs.");
            } finally {
                setLoadingRechargeRequests(false);
            }
        };

        // --- Fetch Order IDs (existing logic remains) ---
        const fetchOrderIds = async () => {
            try {
                const ordersCollectionRef = collection(db, "customers", customer.id, "orders");
                const snapshot = await getDocs(ordersCollectionRef);
                const ids = snapshot.docs.map(doc => ({ id: doc.id }));
                setOrderIds(ids);
            } catch (error) {
                console.error("Error fetching order IDs:", error);
                setOrderFetchError("Failed to fetch order IDs.");
            } finally {
                setLoadingOrders(false);
            }
        };

        // --- 🆕 Fetch Wallet Transaction IDs ---
        const fetchWalletTransactionIds = async () => {
            try {
                // Adjust collection path based on your requirement: /customers/{customerId}/walletTransactions
                const transactionsCollectionRef = collection(db, "customers", customer.id, "walletTransactions");
                const snapshot = await getDocs(transactionsCollectionRef);
                const ids = snapshot.docs.map(doc => ({ id: doc.id }));
                setWalletTransactionIds(ids);
            } catch (error) {
                console.error("Error fetching wallet transaction IDs:", error);
                setWalletTransactionFetchError("Failed to fetch wallet transaction IDs.");
            } finally {
                setLoadingWalletTransactions(false);
            }
        };


        fetchAddressIds();
        fetchRechargeRequestIds();
        fetchOrderIds();
        fetchWalletTransactionIds(); // 🆕 Call the new fetcher
    }, [customer.id]);

    // Helper function for attractive field rendering - CRITICAL FIX HERE
    const renderField = (label, value, isCode = false) => (
        <div className={`mb-2 small ${isCode ? 'col-12' : 'col-md-6'}`}>
            <strong className='text-dark fw-medium me-2 d-inline-block' style={{ minWidth: '150px' }}>{label}:</strong> 
            {isCode ? (
                 <span className='fw-normal d-block text-break text-monospace text-primary bg-white p-2 rounded mt-1' style={{ fontSize: '0.75rem' }}>
                     {String(value) || 'N/A'}
                 </span>
            ) : (
                <span className='fw-normal text-secondary text-break'>
                    {String(value) || 'N/A'}
                </span>
            )}
        </div>
    );

    return (
        <div className="modal show d-block fade-in" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-xl modal-dialog-centered"> 
                <div className="modal-content shadow-lgg rounded-4 border-0">
                    <div className="modal-header bg-primary text-white border-0 rounded-top-4">
                        <h5 className="modal-title fw-bold">Customer Profile: {customer.name}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        
                        <p className="text-muted mb-4 fw-medium border-bottom pb-2">Database ID: <span className='text-dark'>{customer.id}</span></p>

                        {/* Tabs */}
                        <ul className="nav nav-pills mb-4 nav-justified bg-light rounded-pill p-1 shadow-sm">
                            <li className="nav-item">
                                <button className={`nav-link rounded-pill ${activeTab === "data" ? "active bg-primary text-white" : "text-muted"}`} onClick={() => setActiveTab("data")}>
                                    Core Data 👤
                                </button>
                            </li>
                            <li className="nav-item">
                                <button className={`nav-link rounded-pill ${activeTab === "address" ? "active bg-primary text-white" : "text-muted"}`} onClick={() => setActiveTab("address")}>
                                    Addresses ({loadingAddresses ? '...' : addressIds.length}) 🏠
                                </button>
                            </li>
                            <li className="nav-item">
                                <button className={`nav-link rounded-pill ${activeTab === "recharge" ? "active bg-primary text-white" : "text-muted"}`} onClick={() => setActiveTab("recharge")}>
                                    Recharge Requests ({loadingRechargeRequests ? '...' : rechargeRequestIds.length}) 💰
                                </button>
                            </li>
                            <li className="nav-item">
                                <button className={`nav-link rounded-pill ${activeTab === "wallet" ? "active bg-primary text-white" : "text-muted"}`} onClick={() => setActiveTab("wallet")}>
                                    Wallet Transactions ({loadingWalletTransactions ? '...' : walletTransactionIds.length}) 💳
                                </button>
                            </li> {/* 🆕 New Wallet Tab */}
                            <li className="nav-item">
                                <button className={`nav-link rounded-pill ${activeTab === "orders" ? "active bg-primary text-white" : "text-muted"}`} onClick={() => setActiveTab("orders")}>
                                    Orders ({loadingOrders ? '...' : orderIds.length}) 🛍️
                                </button>
                            </li>
                        </ul>

                        {/* Tab Content */}
                        <div>
                            {/* --- Core Data Tab (Existing) --- */}
                            {activeTab === "data" && (
                                <div className="row g-4 justify-content-center">
                                    <div className="col-md-10">
                                        <div className="p-4 bg-light rounded-3 shadow-sm h-100">
                                            <div className="row align-items-start">
                                                {/* Image Column */}
                                                <div className="col-md-3 text-center mb-4 mb-md-0 border-end">
                                                    <h6 className='mb-3 text-primary'>Profile Picture</h6>
                                                    {customer.imageUrl ? (
                                                         <img 
                                                             src={customer.imageUrl} 
                                                             alt="Customer Profile" 
                                                             className="img-fluid rounded-circle shadow-sm border border-secondary"
                                                             style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                                             // Fallback for broken/missing image
                                                             onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/100/CCCCCC/808080?text=No+Image' }}
                                                         />
                                                    ) : (
                                                         <div 
                                                             className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto"
                                                             style={{ width: '100px', height: '100px', fontSize: '14px', color: 'white' }}
                                                         >
                                                             No Image
                                                         </div>
                                                    )}
                                                </div>
                                                
                                                {/* Data Column (Now using a single row to control layout better) */}
                                                <div className="col-md-9">
                                                    <h6 className='mb-3 text-primary border-bottom pb-2'>Core Identity & Financial Summary</h6>
                                                    
                                                    {/* Row for standard 2-column fields */}
                                                    <div className="row">
                                                        {renderField('Name', customer.name)}
                                                        {renderField('Email', customer.email)}
                                                        {renderField('Phone', customer.phone)} {/* Phone was missing, adding here */}
                                                        {renderField('Total Spent', `$${customer.totalSpent}`)} {/* Adding existing totalSpent */}
                                                        {renderField('Used Referral Code', customer.usedReferralCode)}
                                                        {renderField('Customer Referral Code', customer.customerReferalCode)}
                                                    </div>

                                                    {/* Row for full-width code fields */}
                                                    <h6 className='mt-3 mb-2 text-primary border-bottom pb-2'>Technical Identifiers</h6>
                                                    <div className="row">
                                                        {/* Forces UID and FCM Token to use col-12 */}
                                                        {renderField('User UID (Auth)', customer.uid, true)}
                                                        {renderField('FCM Token', customer.fcmToken, true)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- Address Tab (Existing) --- */}
                            {activeTab === "address" && (
                                loadingAddresses ? (
                                    <div className="text-center p-5 bg-white rounded-3 shadow-sm">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-3 text-primary">Fetching address list...</p>
                                    </div>
                                ) : addressFetchError ? (
                                    <div className="alert alert-danger p-3 mb-0">{addressFetchError}</div>
                                ) : (addressIds && addressIds.length > 0) ? (
                                    <div className="row g-4 justify-content-center">
                                        {addressIds.map((addr) => (
                                            <div 
                                                key={addr.id} 
                                                className={addressIds.length === 1 ? "col-md-8" : "col-md-6"} 
                                            >
                                                <AddressDetailsFetcher 
                                                    customerId={customer.id} 
                                                    addressId={addr.id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-info p-3 mb-0">No address documents found in the subcollection for this customer.</div>
                                )
                            )}
                            
                            {/* --- Recharge Request Tab (Existing) --- */}
                            {activeTab === "recharge" && (
                                loadingRechargeRequests ? (
                                    <div className="text-center p-5 bg-white rounded-3 shadow-sm">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-3 text-primary">Fetching recharge requests...</p>
                                    </div>
                                ) : rechargeRequestFetchError ? (
                                    <div className="alert alert-danger p-3 mb-0">{rechargeRequestFetchError}</div>
                                ) : (rechargeRequestIds && rechargeRequestIds.length > 0) ? (
                                    <div className="row g-4 justify-content-center"> 
                                        {rechargeRequestIds.map((req) => (
                                            <div 
                                                key={req.id} 
                                                className={rechargeRequestIds.length === 1 ? "col-md-8" : "col-md-6"} 
                                            >
                                                <RechargeRequestDetailsFetcher 
                                                    customerId={customer.id} 
                                                    requestId={req.id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-info p-3 mb-0">No recharge request documents found for this customer.</div>
                                )
                            )}

                            {/* --- 🆕 Wallet Transactions Tab --- */}
                            {activeTab === "wallet" && (
                                loadingWalletTransactions ? (
                                    <div className="text-center p-5 bg-white rounded-3 shadow-sm">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-3 text-primary">Fetching wallet transactions...</p>
                                    </div>
                                ) : walletTransactionFetchError ? (
                                    <div className="alert alert-danger p-3 mb-0">{walletTransactionFetchError}</div>
                                ) : (walletTransactionIds && walletTransactionIds.length > 0) ? (
                                    <div className="row g-4 justify-content-center"> 
                                        {walletTransactionIds.map((tx) => (
                                            <div 
                                                key={tx.id} 
                                                className={walletTransactionIds.length === 1 ? "col-md-8" : "col-md-6"} 
                                            >
                                                <WalletTransactionDetailsFetcher 
                                                    customerId={customer.id} 
                                                    transactionId={tx.id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-info p-3 mb-0">No wallet transaction documents found for this customer.</div>
                                )
                            )}
                            
                            {/* --- Orders Tab (Existing) --- */}
                            {activeTab === "orders" && (
                                loadingOrders ? (
                                    <div className="text-center p-5 bg-white rounded-3 shadow-sm">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-3 text-primary">Fetching orders...</p>
                                    </div>
                                ) : orderFetchError ? (
                                    <div className="alert alert-danger p-3 mb-0">{orderFetchError}</div>
                                ) : (orderIds && orderIds.length > 0) ? (
                                    <div className="row g-4 justify-content-center"> 
                                        {orderIds.map((order) => (
                                            <div 
                                                key={order.id} 
                                                className={orderIds.length === 1 ? "col-md-8" : "col-md-6"} 
                                            >
                                                <OrderDetailsFetcher 
                                                    customerId={customer.id} 
                                                    orderId={order.id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-info p-3 mb-0">No order documents found for this customer.</div>
                                )
                            )}
                        </div>

                    </div>
                    <div className="modal-footer border-0 bg-light rounded-bottom-4">
                        <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
            <style>{`
                .fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default ViewCustomerModal;