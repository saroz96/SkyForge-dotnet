// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import axios from 'axios';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
// import VirtualizedProductList from '../../../VirtualizedProductList';
// import ProductDetailsModal from './ProductDetailsModal';
// import BatchUpdateModal from './BatchUpdateModal';

// const ProductModal = ({ onClose }) => {
//     const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

//     // Add states for virtualized list
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchProducts, setTotalSearchProducts] = useState(0);
//     const [productSearchQuery, setProductSearchQuery] = useState('');
//     const [vatStatusFilter, setVatStatusFilter] = useState('all');

//     // Other states
//     const [selectedProduct, setSelectedProduct] = useState(null);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
//     const [batchToUpdate, setBatchToUpdate] = useState(null);

//     const searchInputRef = useRef(null);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false, // Changed to false for ASP.NET
//     });

//     // Add authorization header to all requests
//     api.interceptors.request.use(
//         (config) => {
//             const token = localStorage.getItem('token');
//             if (token) {
//                 config.headers.Authorization = `Bearer ${token}`;
//             }
//             return config;
//         },
//         (error) => {
//             return Promise.reject(error);
//         }
//     );

//     // Fetch products from backend with search functionality
//     const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1) => {
//         try {
//             setIsSearching(true);
//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 25, // Using fixed limit as in ASP.NET endpoint
//                     vatStatus: vatStatusFilter
//                 }
//             });

//             if (response.data.success) {
//                 const productsWithStock = response.data.items.map(item => ({
//                     ...item,
//                     // ASP.NET returns currentStock directly
//                     currentStock: item.currentStock || 0,
//                     // Calculate latest price from stock entries
//                     latestPrice: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
//                         : 0,
//                     latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
//                         : 0
//                 }));

//                 if (page === 1) {
//                     setSearchResults(productsWithStock);
//                 } else {
//                     setSearchResults(prev => [...prev, ...productsWithStock]);
//                 }

//                 setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
//                 setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
//                 setSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching products:', error);
//             // Handle unauthorized or token expired
//             if (error.response?.status === 401) {
//                 localStorage.removeItem('token');
//                 window.location.href = '/login';
//             }
//         } finally {
//             setIsSearching(false);
//         }
//     }, [vatStatusFilter]);

//     // Load more products for infinite scrolling
//     const loadMoreSearchProducts = useCallback(() => {
//         if (!isSearching && hasMoreSearchResults) {
//             fetchProductsFromBackend(productSearchQuery, searchPage + 1);
//         }
//     }, [isSearching, productSearchQuery, searchPage, hasMoreSearchResults, fetchProductsFromBackend]);

//     // Debounced search effect
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setSearchPage(1);
//             fetchProductsFromBackend(productSearchQuery, 1);
//         }, 300); // 300ms debounce

//         return () => clearTimeout(timer);
//     }, [productSearchQuery, vatStatusFilter]);

//     // Load initial products when modal opens
//     useEffect(() => {
//         // Try to load from draft first
//         if (productDraftSave?.products) {
//             setSearchResults(productDraftSave.products);
//             setTotalSearchProducts(productDraftSave.products?.length || 0);
//             setProductSearchQuery(productDraftSave.searchQuery || '');
//             setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
//         } else {
//             // Fetch fresh data
//             fetchProductsFromBackend('', 1);
//         }
//     }, []);

//     // Save to draft when data changes
//     useEffect(() => {
//         setProductDraftSave({
//             products: searchResults,
//             searchQuery: productSearchQuery,
//             vatStatusFilter: vatStatusFilter,
//             page: searchPage
//         });
//     }, [searchResults, productSearchQuery, vatStatusFilter, searchPage, setProductDraftSave]);

//     const handleSearch = (e) => {
//         setProductSearchQuery(e.target.value);
//     };

//     const handleVatStatusChange = (status) => {
//         setVatStatusFilter(status);
//         setSearchPage(1);
//     };

//     const handleProductSelect = (product) => {
//         setSelectedProduct(product);
//         setShowDetailsModal(true);
//     };

//     const handleBatchUpdate = (batchIndex) => {
//         if (!selectedProduct) {
//             console.error('No selected product found');
//             return;
//         }

//         const batchData = selectedProduct.stockEntries && selectedProduct.stockEntries[batchIndex];

//         if (!batchData) {
//             console.error('Batch data not found for index:', batchIndex);
//             return;
//         }

//         setBatchToUpdate({
//             index: batchIndex,
//             batchNumber: batchData.batchNumber,
//             expiryDate: batchData.expiryDate,
//             price: batchData.price,
//             ...batchData
//         });
//         setShowBatchUpdateModal(true);
//     };

//     const handleModalKeyDown = (e) => {
//         if (e.key === 'Escape') {
//             e.preventDefault();
//             onClose();
//         } else if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const firstItem = document.querySelector('.dropdown-item');
//             if (firstItem) {
//                 firstItem.focus();
//             }
//         } else if (e.key === 'F2') {
//             e.preventDefault();
//             searchInputRef.current?.focus();
//         }
//     };

//     // Determine which data to display
//     const displayProducts = useMemo(() => {
//         return searchResults;
//     }, [searchResults]);

//     return (
//         <>
//             {/* Product Selection Modal */}
//             <div className="modal fade show" id="productModal" tabIndex="-1" style={{ display: 'block' }}>
//                 <div className="modal-dialog modal-xl modal-dialog-centered">
//                     <div className="modal-content" style={{ height: '440px' }}>
//                         <div className="modal-header py-1">
//                             <p className="modal-title mb-0" id="productModalLabel" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
//                                 Product Details
//                             </p>
//                             <button
//                                 type="button"
//                                 className="btn-close"
//                                 onClick={onClose}
//                                 style={{ fontSize: '0.7rem' }}
//                             ></button>
//                         </div>

//                         {/* Search and Filter Controls */}
//                         <div className="p-2 bg-white sticky-top">
//                             <div className="row g-2 align-items-center">
//                                 <div className="col-md-8">
//                                     <input
//                                         ref={searchInputRef}
//                                         type="text"
//                                         id="searchProduct"
//                                         className="form-control form-control-sm"
//                                         placeholder="Search items by code, name, HSN, or category..."
//                                         autoFocus
//                                         autoComplete='off'
//                                         value={productSearchQuery}
//                                         onChange={handleSearch}
//                                         onKeyDown={handleModalKeyDown}
//                                         style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
//                                     />
//                                 </div>
//                                 <div className="col-md-4">
//                                     <div className="btn-group btn-group-sm w-100">
//                                         <button
//                                             type="button"
//                                             className={`btn ${vatStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
//                                             onClick={() => handleVatStatusChange('all')}
//                                             style={{ fontSize: '0.7rem' }}
//                                         >
//                                             All
//                                         </button>
//                                         <button
//                                             type="button"
//                                             className={`btn ${vatStatusFilter === 'false' ? 'btn-success' : 'btn-outline-success'}`}
//                                             onClick={() => handleVatStatusChange('false')}
//                                             style={{ fontSize: '0.7rem' }}
//                                         >
//                                             Vatable
//                                         </button>
//                                         <button
//                                             type="button"
//                                             className={`btn ${vatStatusFilter === 'vatExempt' ? 'btn-warning' : 'btn-outline-warning'}`}
//                                             onClick={() => handleVatStatusChange('vatExempt')}
//                                             style={{ fontSize: '0.7rem' }}
//                                         >
//                                             Exempt
//                                         </button>
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="modal-body p-0">
//                             <div style={{ height: 'calc(400px - 100px)' }}>
//                                 <div
//                                     className="w-100 h-100"
//                                     style={{
//                                         border: '1px solid #dee2e6',
//                                         borderRadius: '0.25rem',
//                                         overflow: 'hidden'
//                                     }}
//                                 >
//                                     <div className="dropdown-header" style={{
//                                         display: 'grid',
//                                         gridTemplateColumns: 'repeat(9, 1fr)',
//                                         alignItems: 'center',
//                                         padding: '0 8px',
//                                         height: '20px',
//                                         background: '#f0f0f0',
//                                         fontWeight: 'bold',
//                                         borderBottom: '1px solid #dee2e6',
//                                         position: 'sticky',
//                                         top: 0,
//                                         zIndex: 1,
//                                         fontSize: '0.7rem'
//                                     }}>
//                                         <div><strong>#</strong></div>
//                                         <div><strong>HSN</strong></div>
//                                         <div><strong>Description of Goods</strong></div>
//                                         <div><strong>Category</strong></div>
//                                         <div><strong>Rate</strong></div>
//                                         <div><strong>with tax</strong></div>
//                                         <div><strong>Stock</strong></div>
//                                         <div><strong>Unit</strong></div>
//                                         <div><strong>%</strong></div>
//                                     </div>

//                                     {displayProducts.length > 0 ? (
//                                         <VirtualizedProductList
//                                             products={displayProducts}
//                                             onProductClick={handleProductSelect}
//                                             searchRef={searchInputRef}
//                                             hasMore={hasMoreSearchResults}
//                                             isSearching={isSearching}
//                                             onLoadMore={loadMoreSearchProducts}
//                                             totalProducts={totalSearchProducts}
//                                             page={searchPage}
//                                             searchQuery={productSearchQuery}
//                                         />
//                                     ) : (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             {isSearching ? 'Loading products...' : 'No products found'}
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="modal-footer py-1" style={{ fontSize: '0.75rem' }}>
//                             <div className="d-flex justify-content-between w-100">
//                                 <div>
//                                     Showing {displayProducts.length} of {totalSearchProducts} products
//                                     {searchPage > 1 && ` (Page ${searchPage})`}
//                                 </div>
//                                 <div className="text-muted">
//                                     {productSearchQuery && 'Press F2 to focus search'}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Product Details Modal */}
//             {showDetailsModal && selectedProduct && (
//                 <div className="modal fade show" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-lg modal-dialog-centered">
//                         <div className="modal-content">
//                             <div className="modal-header py-2">
//                                 <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                     {selectedProduct.name} Details
//                                 </h5>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={() => setShowDetailsModal(false)}
//                                     style={{ fontSize: '0.7rem' }}
//                                 ></button>
//                             </div>
//                             <div className="modal-body" style={{ fontSize: '0.8rem' }}>
//                                 <ProductDetailsModal
//                                     product={selectedProduct}
//                                     onClose={() => setShowDetailsModal(false)}
//                                     onBatchUpdate={handleBatchUpdate}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                     <div className="modal-backdrop fade show" onClick={() => setShowDetailsModal(false)}></div>
//                 </div>
//             )}

//             {/* Batch Update Modal */}
//             {showBatchUpdateModal && batchToUpdate && (
//                 <div className="modal fade show" style={{ display: 'block' }}>
//                     <div className="modal-dialog modal-md modal-dialog-centered">
//                         <div className="modal-content">
//                             <div className="modal-header py-2">
//                                 <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                     Update Batch Details
//                                 </h5>
//                                 <button
//                                     type="button"
//                                     className="btn-close"
//                                     onClick={() => setShowBatchUpdateModal(false)}
//                                     style={{ fontSize: '0.7rem' }}
//                                 ></button>
//                             </div>
//                             <div className="modal-body" style={{ fontSize: '0.8rem' }}>
//                                 <BatchUpdateModal
//                                     product={selectedProduct}
//                                     batch={batchToUpdate}
//                                     onClose={() => setShowBatchUpdateModal(false)}
//                                     onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1)}
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                     <div className="modal-backdrop fade show" onClick={() => setShowBatchUpdateModal(false)}></div>
//                 </div>
//             )}

//             {/* Main Modal Backdrop */}
//             <div className="modal-backdrop fade show" onClick={onClose}></div>
//         </>
//     );
// };

// export default ProductModal;

//-------------------------------------------------------end

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
import VirtualizedProductList from '../../../VirtualizedProductList';
import ProductDetailsModal from './ProductDetailsModal';
import BatchUpdateModal from './BatchUpdateModal';

const ProductModal = ({ onClose }) => {
    const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

    // Add states for virtualized list
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchProducts, setTotalSearchProducts] = useState(0);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [vatStatusFilter, setVatStatusFilter] = useState('all');

    // Other states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
    const [batchToUpdate, setBatchToUpdate] = useState(null);

    const searchInputRef = useRef(null);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: false, // Changed to false for ASP.NET
    });

    // Add authorization header to all requests
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Fetch products from backend with search functionality
    const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1) => {
        try {
            setIsSearching(true);
            const response = await api.get('/api/retailer/items/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: 25, // Using fixed limit as in ASP.NET endpoint
                    vatStatus: vatStatusFilter
                }
            });

            if (response.data.success) {
                const productsWithStock = response.data.items.map(item => ({
                    ...item,
                    // ASP.NET returns currentStock directly
                    currentStock: item.currentStock || 0,
                    // Calculate latest price from stock entries
                    latestPrice: item.stockEntries && item.stockEntries.length > 0
                        ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
                        : 0,
                    latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
                        ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
                        : 0
                }));

                if (page === 1) {
                    setSearchResults(productsWithStock);
                } else {
                    setSearchResults(prev => [...prev, ...productsWithStock]);
                }

                setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
                setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
                setSearchPage(page);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            // Handle unauthorized or token expired
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } finally {
            setIsSearching(false);
        }
    }, [vatStatusFilter]);

    // Load more products for infinite scrolling
    const loadMoreSearchProducts = useCallback(() => {
        if (!isSearching && hasMoreSearchResults) {
            fetchProductsFromBackend(productSearchQuery, searchPage + 1);
        }
    }, [isSearching, productSearchQuery, searchPage, hasMoreSearchResults, fetchProductsFromBackend]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchPage(1);
            fetchProductsFromBackend(productSearchQuery, 1);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [productSearchQuery, vatStatusFilter]);

    // Load initial products when modal opens
    useEffect(() => {
        // Try to load from draft first
        if (productDraftSave?.products) {
            setSearchResults(productDraftSave.products);
            setTotalSearchProducts(productDraftSave.products?.length || 0);
            setProductSearchQuery(productDraftSave.searchQuery || '');
            setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
        } else {
            // Fetch fresh data
            fetchProductsFromBackend('', 1);
        }
    }, []);

    // Save to draft when data changes
    useEffect(() => {
        setProductDraftSave({
            products: searchResults,
            searchQuery: productSearchQuery,
            vatStatusFilter: vatStatusFilter,
            page: searchPage
        });
    }, [searchResults, productSearchQuery, vatStatusFilter, searchPage, setProductDraftSave]);

    const handleSearch = (e) => {
        setProductSearchQuery(e.target.value);
    };

    const handleVatStatusChange = (status) => {
        setVatStatusFilter(status);
        setSearchPage(1);
    };

    const handleProductSelect = (product) => {
        setSelectedProduct(product);
        setShowDetailsModal(true);
    };

    const handleBatchUpdate = (batchIndex) => {
        if (!selectedProduct) {
            console.error('No selected product found');
            return;
        }

        const batchData = selectedProduct.stockEntries && selectedProduct.stockEntries[batchIndex];

        if (!batchData) {
            console.error('Batch data not found for index:', batchIndex);
            return;
        }

        setBatchToUpdate({
            index: batchIndex,
            batchNumber: batchData.batchNumber,
            expiryDate: batchData.expiryDate,
            price: batchData.price,
            ...batchData
        });
        setShowBatchUpdateModal(true);
    };

    const handleModalKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const firstItem = document.querySelector('.dropdown-item');
            if (firstItem) {
                firstItem.focus();
            }
        } else if (e.key === 'F2') {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
    };

    // Function to compress long text
    const compressText = (text, maxLength = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    // Determine which data to display
    const displayProducts = useMemo(() => {
        return searchResults;
    }, [searchResults]);

    return (
        <>
            {/* Product Selection Modal */}
            <div className="modal fade show" id="productModal" tabIndex="-1" style={{ display: 'block' }}>
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content" style={{ height: '440px' }}>
                        <div className="modal-header py-1">
                            <p className="modal-title mb-0" id="productModalLabel" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                Product Details
                            </p>
                            <button
                                type="button"
                                className="btn-close"
                                onClick={onClose}
                                style={{ fontSize: '0.7rem' }}
                            ></button>
                        </div>

                        {/* Search and Filter Controls */}
                        <div className="p-2 bg-white sticky-top">
                            <div className="row g-2 align-items-center">
                                <div className="col-md-8">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        id="searchProduct"
                                        className="form-control form-control-sm"
                                        placeholder="Search items by code, name, HSN, or category..."
                                        autoFocus
                                        autoComplete='off'
                                        value={productSearchQuery}
                                        onChange={handleSearch}
                                        onKeyDown={handleModalKeyDown}
                                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <div className="btn-group btn-group-sm w-100">
                                        <button
                                            type="button"
                                            className={`btn ${vatStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => handleVatStatusChange('all')}
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${vatStatusFilter === 'false' ? 'btn-success' : 'btn-outline-success'}`}
                                            onClick={() => handleVatStatusChange('false')}
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            Vatable
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${vatStatusFilter === 'vatExempt' ? 'btn-warning' : 'btn-outline-warning'}`}
                                            onClick={() => handleVatStatusChange('vatExempt')}
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            Exempt
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-body p-0">
                            <div style={{ height: 'calc(400px - 100px)' }}>
                                <div
                                    className="w-100 h-100"
                                    style={{
                                        border: '1px solid #dee2e6',
                                        borderRadius: '0.25rem',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div className="dropdown-header" style={{
                                        display: 'grid',
                                        gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr', // Removed HSN column, increased description space
                                        alignItems: 'center',
                                        padding: '0 8px',
                                        height: '20px',
                                        background: '#f0f0f0',
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid #dee2e6',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1,
                                        fontSize: '0.7rem'
                                    }}>
                                        <div><strong>#</strong></div>
                                        <div><strong>Description of Goods</strong></div>
                                        <div><strong>Category</strong></div>
                                        <div><strong>Rate</strong></div>
                                        <div><strong>with tax</strong></div>
                                        <div><strong>Stock</strong></div>
                                        <div><strong>Unit</strong></div>
                                        <div><strong>%</strong></div>
                                    </div>

                                    {displayProducts.length > 0 ? (
                                        <VirtualizedProductList
                                            products={displayProducts}
                                            onProductClick={handleProductSelect}
                                            searchRef={searchInputRef}
                                            hasMore={hasMoreSearchResults}
                                            isSearching={isSearching}
                                            onLoadMore={loadMoreSearchProducts}
                                            totalProducts={totalSearchProducts}
                                            page={searchPage}
                                            searchQuery={productSearchQuery}
                                            compressText={compressText} // Pass compress function to VirtualizedProductList
                                        />
                                    ) : (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            {isSearching ? 'Loading products...' : 'No products found'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer py-1" style={{ fontSize: '0.75rem' }}>
                            <div className="d-flex justify-content-between w-100">
                                <div>
                                    Showing {displayProducts.length} of {totalSearchProducts} products
                                    {searchPage > 1 && ` (Page ${searchPage})`}
                                </div>
                                <div className="text-muted">
                                    {productSearchQuery && 'Press F2 to focus search'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Details Modal */}
            {showDetailsModal && selectedProduct && (
                <div className="modal fade show" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-2">
                                <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                    {compressText(selectedProduct.name, 50)} Details
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowDetailsModal(false)}
                                    style={{ fontSize: '0.7rem' }}
                                ></button>
                            </div>
                            <div className="modal-body" style={{ fontSize: '0.8rem' }}>
                                <ProductDetailsModal
                                    product={selectedProduct}
                                    onClose={() => setShowDetailsModal(false)}
                                    onBatchUpdate={handleBatchUpdate}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowDetailsModal(false)}></div>
                </div>
            )}

            {/* Batch Update Modal */}
            {showBatchUpdateModal && batchToUpdate && (
                <div className="modal fade show" style={{ display: 'block' }}>
                    <div className="modal-dialog modal-md modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header py-2">
                                <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                    Update Batch Details
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowBatchUpdateModal(false)}
                                    style={{ fontSize: '0.7rem' }}
                                ></button>
                            </div>
                            <div className="modal-body" style={{ fontSize: '0.8rem' }}>
                                <BatchUpdateModal
                                    product={selectedProduct}
                                    batch={batchToUpdate}
                                    onClose={() => setShowBatchUpdateModal(false)}
                                    onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowBatchUpdateModal(false)}></div>
                </div>
            )}

            {/* Main Modal Backdrop */}
            <div className="modal-backdrop fade show" onClick={onClose}></div>
        </>
    );
};

export default ProductModal;