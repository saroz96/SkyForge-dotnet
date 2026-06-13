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
//                     limit: 15, // Using fixed limit as in ASP.NET endpoint
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

//     // Function to compress long text
//     const compressText = (text, maxLength = 30) => {
//         if (!text) return '';
//         if (text.length <= maxLength) return text;
//         return text.substring(0, maxLength - 3) + '...';
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
//                                         gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr', // Removed HSN column, increased description space
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
//                                             compressText={compressText} // Pass compress function to VirtualizedProductList
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
//                                     {compressText(selectedProduct.name, 50)} Details
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

//----------------------------------------------------------------end


import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
import ProductDetailsModal from './ProductDetailsModal';
import BatchUpdateModal from './BatchUpdateModal';

const ProductModal = ({ onClose }) => {
    const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

    // States for pagination and infinite scroll
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreResults, setHasMoreResults] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [vatStatusFilter, setVatStatusFilter] = useState('all');
    const [isSearching, setIsSearching] = useState(false);
    const [currentFocus, setCurrentFocus] = useState(0);
    const [error, setError] = useState(null);

    // Other states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
    const [batchToUpdate, setBatchToUpdate] = useState(null);

    const listRef = useRef(null);
    const rowRefs = useRef([]);
    const searchInputRef = useRef(null);
    const loadingRef = useRef(false);

    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: false,
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

    // Calculate expiry status
    const calculateExpiryStatus = (product) => {
        if (!product.expiryDate) return 'unknown';
        
        const today = new Date();
        const expiryDate = new Date(product.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 30) return 'expiring-soon';
        if (daysUntilExpiry <= 90) return 'expiring-within-90';
        return 'good';
    };

    // Fetch products from backend with pagination
    const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
        try {
            setIsSearching(true);
            setError(null);
            
            const response = await api.get('/api/retailer/items/search', {
                params: {
                    search: searchTerm,
                    page: page,
                    limit: 15,
                    vatStatus: vatStatusFilter
                }
            });

            if (response.data.success) {
                const productsWithStock = response.data.items.map(item => ({
                    ...item,
                    currentStock: item.currentStock || 0,
                    latestPrice: item.stockEntries && item.stockEntries.length > 0
                        ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
                        : 0,
                    latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
                        ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
                        : 0,
                    expiryStatus: calculateExpiryStatus(item)
                }));

                if (append) {
                    setSearchResults(prev => [...prev, ...productsWithStock]);
                } else {
                    setSearchResults(productsWithStock);
                }

                setHasMoreResults(response.data.pagination?.hasNextPage || false);
                setTotalProducts(response.data.pagination?.totalItems || productsWithStock.length);
                setSearchPage(page);
            } else {
                throw new Error(response.data.error || 'Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            setError(error.response?.data?.error || 'Error fetching products. Please try again.');
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        } finally {
            setIsSearching(false);
        }
    }, [vatStatusFilter, api]);

    // Load more products for infinite scrolling
    const loadMoreProducts = useCallback(() => {
        if (!isSearching && hasMoreResults && !loadingRef.current && !productSearchQuery) {
            loadingRef.current = true;
            fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
            setTimeout(() => {
                loadingRef.current = false;
            }, 500);
        }
    }, [isSearching, hasMoreResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (productSearchQuery) {
                fetchProductsFromBackend(productSearchQuery, 1, false);
            } else {
                fetchProductsFromBackend('', 1, false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearchQuery, vatStatusFilter, fetchProductsFromBackend]);

    // Load initial products when modal opens
    useEffect(() => {
        // Try to load from draft first
        if (productDraftSave?.products && productDraftSave.products.length > 0) {
            setSearchResults(productDraftSave.products);
            setTotalProducts(productDraftSave.products?.length || 0);
            setProductSearchQuery(productDraftSave.searchQuery || '');
            setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
            setHasMoreResults(false);
        } else {
            // Fetch fresh data
            fetchProductsFromBackend('', 1, false);
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

    // Handle scroll for infinite loading
    useEffect(() => {
        const handleScroll = () => {
            if (!listRef.current) return;
            
            const container = listRef.current;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            const scrollHeight = container.scrollHeight;
            
            // Load more when scrolled near bottom (90% threshold)
            if (!isSearching && hasMoreResults && !productSearchQuery) {
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
                if (scrollPercentage > 0.9) {
                    loadMoreProducts();
                }
            }
        };
        
        const container = listRef.current;
        if (container && !productSearchQuery) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreResults, isSearching, productSearchQuery, loadMoreProducts]);

    const handleSearch = (e) => {
        setProductSearchQuery(e.target.value);
        setCurrentFocus(0);
    };

    const handleVatStatusChange = (status) => {
        setVatStatusFilter(status);
        setSearchPage(1);
        setCurrentFocus(0);
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

    const scrollToItem = (index) => {
        if (rowRefs.current[index] && listRef.current) {
            const rowElement = rowRefs.current[index];
            const listContainer = listRef.current;
            const rowTop = rowElement.offsetTop;
            const rowBottom = rowTop + rowElement.offsetHeight;
            const containerTop = listContainer.scrollTop;
            const containerBottom = containerTop + listContainer.clientHeight;

            if (rowTop < containerTop) {
                listContainer.scrollTop = rowTop;
            } else if (rowBottom > containerBottom) {
                listContainer.scrollTop = rowBottom - listContainer.clientHeight;
            }
        }
    };

    const handleKeyDown = (e) => {
        const currentProducts = searchResults;
        if (currentProducts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextFocus = (currentFocus + 1) % currentProducts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextFocus = (currentFocus - 1 + currentProducts.length) % currentProducts.length;
            setCurrentFocus(nextFocus);
            scrollToItem(nextFocus);
        } else if (e.key === 'Enter' && currentProducts[currentFocus]) {
            e.preventDefault();
            handleProductSelect(currentProducts[currentFocus]);
        } else if (e.key === 'Escape') {
            onClose();
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

    // Format currency
    const formatCurrency = (num) => {
        if (!num && num !== 0) return '0.00';
        return num.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const VAT_RATE = 0.13;

    // Get CSS class for product row based on VAT status and expiry
    const getProductRowClass = (product) => {
        const classes = ['dropdown-item'];
        
        // VAT status class
        const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
        if (isVatable) {
            classes.push('vatable');
        } else {
            classes.push('vatExempt');
        }
        
        // Expiry status class
        const expiryStatus = product.expiryStatus || calculateExpiryStatus(product);
        classes.push(`expiry-${expiryStatus}`);
        
        // Active focus class
        return classes.join(' ');
    };

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
                        <div className="p-2 bg-white sticky-top border-bottom">
                            <div className="row g-2 align-items-center">
                                <div className="col-md-8">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        id="searchProduct"
                                        className="form-control form-control-sm"
                                        placeholder="Search items by code, name, or category..."
                                        autoFocus
                                        autoComplete='off'
                                        value={productSearchQuery}
                                        onChange={handleSearch}
                                        onKeyDown={handleKeyDown}
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
                                            13%
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
                            <div style={{ height: 'calc(440px - 100px)' }}>
                                <div
                                    className="w-100 h-100"
                                    style={{
                                        border: '1px solid #dee2e6',
                                        borderRadius: '0.25rem',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Table Header */}
                                    <div className="dropdown-header" style={{
                                        display: 'grid',
                                        gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
                                        alignItems: 'center',
                                        padding: '0 8px',
                                        height: '28px',
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

                                    {/* Products List with infinite scroll */}
                                    <div
                                        ref={listRef}
                                        style={{
                                            height: 'calc(100% - 28px)',
                                            overflowY: 'auto',
                                            position: 'relative'
                                        }}
                                        onKeyDown={handleKeyDown}
                                        tabIndex={0}
                                    >
                                        {isSearching && searchResults.length === 0 ? (
                                            <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                                Loading products...
                                            </div>
                                        ) : error ? (
                                            <div className="text-center py-3 text-danger" style={{ fontSize: '0.75rem' }}>
                                                {error}
                                                <button className="btn btn-sm btn-danger ms-2" onClick={() => fetchProductsFromBackend(productSearchQuery, 1, false)}>
                                                    Retry
                                                </button>
                                            </div>
                                        ) : searchResults.length === 0 ? (
                                            <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                                {productSearchQuery ? 'No products match your search' : 'No products available'}
                                            </div>
                                        ) : (
                                            <>
                                                {searchResults.map((product, index) => {
                                                    const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
                                                    const priceWithVAT = isVatable ? product.latestPrice * (1 + VAT_RATE) : product.latestPrice;
                                                    const rowClass = getProductRowClass(product);
                                                    
                                                    return (
                                                        <div
                                                            key={product.id || product._id || index}
                                                            ref={el => rowRefs.current[index] = el}
                                                            className={`${rowClass} ${index === currentFocus ? 'active' : ''}`}
                                                            onClick={() => handleProductSelect(product)}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
                                                                alignItems: 'center',
                                                                padding: '6px 8px',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                borderBottom: '1px solid #f0f0f0',
                                                                margin: 0,
                                                                gap: 0
                                                            }}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleProductSelect(product);
                                                                }
                                                            }}
                                                        >
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {product.uniqueNumber || product.code || index + 1}
                                                            </div>
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.name}>
                                                                {compressText(product.name, 35)}
                                                            </div>
                                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.categoryName || product.category?.name}>
                                                                {compressText(product.categoryName || product.category?.name || 'No Category', 20)}
                                                            </div>
                                                            <div>Rs.{formatCurrency(product.latestPrice)}</div>
                                                            <div>Rs.{formatCurrency(priceWithVAT)}</div>
                                                            <div>{product.currentStock || 0}</div>
                                                            <div>{product.unitName || product.unit?.name || ''}</div>
                                                            <div>{product.latestMarginPercentage || 0}%</div>
                                                        </div>
                                                    );
                                                })}
                                                
                                                {/* Loading indicator for infinite scroll */}
                                                {hasMoreResults && !productSearchQuery && (
                                                    <div style={{
                                                        height: '28px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.7rem',
                                                        color: '#666'
                                                    }}>
                                                        Loading more...
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer py-1" style={{ fontSize: '0.75rem' }}>
                            <div className="d-flex justify-content-between w-100">
                                <div>
                                    Showing {searchResults.length} of {totalProducts} products
                                    {productSearchQuery && searchPage > 1 && ` (Page ${searchPage})`}
                                </div>
                                <div className="text-muted">
                                    {productSearchQuery ? 'Press ESC to close' : 'Scroll for more • F2 to focus search'}
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
                                    onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
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