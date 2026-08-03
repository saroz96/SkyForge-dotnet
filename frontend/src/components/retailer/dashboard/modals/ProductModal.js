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

//----------------------------------------------------------end1

// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import axios from 'axios';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
// import ProductDetailsModal from './ProductDetailsModal';
// import BatchUpdateModal from './BatchUpdateModal';
// import { calculateExpiryStatus } from './ExpiryStatus';

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
//     const [currentFocus, setCurrentFocus] = useState(0);

//     // Other states
//     const [selectedProduct, setSelectedProduct] = useState(null);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
//     const [batchToUpdate, setBatchToUpdate] = useState(null);

//     const searchInputRef = useRef(null);
//     const listRef = useRef(null);
//     const rowRefs = useRef([]);
//     const loadingRef = useRef(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
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
//     const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
//         try {
//             setIsSearching(true);
//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 15,
//                     vatStatus: vatStatusFilter
//                 }
//             });

//             if (response.data.success) {
//                 const productsWithStock = response.data.items.map(item => ({
//                     ...item,
//                     currentStock: item.currentStock || 0,
//                     latestPrice: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
//                         : 0,
//                     latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
//                         : 0
//                 }));

//                 if (append) {
//                     setSearchResults(prev => [...prev, ...productsWithStock]);
//                 } else {
//                     setSearchResults(productsWithStock);
//                 }

//                 setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
//                 setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
//                 setSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching products:', error);
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
//         if (!isSearching && hasMoreSearchResults && !loadingRef.current && !productSearchQuery) {
//             loadingRef.current = true;
//             fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
//             setTimeout(() => {
//                 loadingRef.current = false;
//             }, 500);
//         }
//     }, [isSearching, hasMoreSearchResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

//     // Debounced search effect
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setSearchPage(1);
//             setCurrentFocus(0);
//             fetchProductsFromBackend(productSearchQuery, 1, false);
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [productSearchQuery, vatStatusFilter]);

//     // Load initial products when modal opens
//     useEffect(() => {
//         if (productDraftSave?.products) {
//             setSearchResults(productDraftSave.products);
//             setTotalSearchProducts(productDraftSave.products?.length || 0);
//             setProductSearchQuery(productDraftSave.searchQuery || '');
//             setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
//         } else {
//             fetchProductsFromBackend('', 1, false);
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

//     // Handle scroll for infinite loading
//     useEffect(() => {
//         const handleScroll = () => {
//             if (!listRef.current) return;

//             const container = listRef.current;
//             const scrollTop = container.scrollTop;
//             const clientHeight = container.clientHeight;
//             const scrollHeight = container.scrollHeight;

//             if (!isSearching && hasMoreSearchResults && !productSearchQuery) {
//                 const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
//                 if (scrollPercentage > 0.9) {
//                     loadMoreSearchProducts();
//                 }
//             }
//         };

//         const container = listRef.current;
//         if (container && !productSearchQuery) {
//             container.addEventListener('scroll', handleScroll);
//             return () => container.removeEventListener('scroll', handleScroll);
//         }
//     }, [hasMoreSearchResults, isSearching, productSearchQuery, loadMoreSearchProducts]);

//     const handleSearch = (e) => {
//         setProductSearchQuery(e.target.value);
//         setCurrentFocus(0);
//     };

//     const handleVatStatusChange = (status) => {
//         setVatStatusFilter(status);
//         setSearchPage(1);
//         setCurrentFocus(0);
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

//     const handleKeyDown = (e) => {
//         const currentProducts = searchResults;
//         if (currentProducts.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const nextFocus = (currentFocus + 1) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             const nextFocus = (currentFocus - 1 + currentProducts.length) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'Enter' && currentProducts[currentFocus]) {
//             e.preventDefault();
//             handleProductSelect(currentProducts[currentFocus]);
//         } else if (e.key === 'Escape') {
//             onClose();
//         } else if (e.key === 'F2') {
//             e.preventDefault();
//             searchInputRef.current?.focus();
//         }
//     };

//     const scrollToItem = (index) => {
//         if (rowRefs.current[index] && listRef.current) {
//             const rowElement = rowRefs.current[index];
//             const listContainer = listRef.current;
//             const rowTop = rowElement.offsetTop;
//             const rowBottom = rowTop + rowElement.offsetHeight;
//             const containerTop = listContainer.scrollTop;
//             const containerBottom = containerTop + listContainer.clientHeight;

//             if (rowTop < containerTop) {
//                 listContainer.scrollTop = rowTop;
//             } else if (rowBottom > containerBottom) {
//                 listContainer.scrollTop = rowBottom - listContainer.clientHeight;
//             }
//         }
//     };

//     // Function to compress long text
//     const compressText = (text, maxLength = 30) => {
//         if (!text) return '';
//         if (text.length <= maxLength) return text;
//         return text.substring(0, maxLength - 3) + '...';
//     };

//     const displayProducts = useMemo(() => {
//         return searchResults;
//     }, [searchResults]);

//     const displayCount = displayProducts.length;

//     // Format currency
//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const VAT_RATE = 0.13;

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
//                                         onKeyDown={handleKeyDown}
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
//                                         gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                         alignItems: 'center',
//                                         padding: '0 8px',
//                                         height: '28px',
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

//                                     {/* Products List with infinite scroll */}
//                                     <div
//                                         ref={listRef}
//                                         style={{
//                                             height: 'calc(100% - 28px)',
//                                             overflowY: 'auto',
//                                             position: 'relative'
//                                         }}
//                                         onKeyDown={handleKeyDown}
//                                         tabIndex={0}
//                                     >
//                                         {isSearching && displayCount === 0 ? (
//                                             <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                                 Loading products...
//                                             </div>
//                                         ) : displayCount === 0 ? (
//                                             <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                                 {productSearchQuery ? 'No products match your search' : 'No products available'}
//                                             </div>
//                                         ) : (
//                                             <>
//                                                 {displayProducts.map((product, index) => {
//                                                     const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
//                                                     const basePrice = product.latestPrice || 0;
//                                                     const priceWithVAT = isVatable ? basePrice * (1 + VAT_RATE) : basePrice;
//                                                     const displayCategory = product.categoryName || product.category?.name || 'No Category';
//                                                     const displayStock = product.currentStock || 0;
//                                                     const displayUnit = product.unitName || '';
//                                                     const expiryStatus = calculateExpiryStatus(product);

//                                                     const rowClasses = [
//                                                         'dropdown-item',
//                                                         isVatable ? 'vatable' : 'vatExempt',
//                                                         `expiry-${expiryStatus}`,
//                                                         index === currentFocus ? 'active' : ''
//                                                     ].filter(Boolean).join(' ');

//                                                     return (
//                                                         <div
//                                                             key={product._id || product.id || index}
//                                                             ref={el => rowRefs.current[index] = el}
//                                                             className={rowClasses}
//                                                             onClick={() => {
//                                                                 handleProductSelect(product);
//                                                                 // Keep focus on search input
//                                                                 if (searchInputRef.current) {
//                                                                     setTimeout(() => {
//                                                                         searchInputRef.current.focus();
//                                                                     }, 0);
//                                                                 }
//                                                             }}
//                                                             style={{
//                                                                 display: 'grid',
//                                                                 gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                                                 alignItems: 'center',
//                                                                 padding: '6px 8px',
//                                                                 cursor: 'pointer',
//                                                                 fontSize: '0.75rem',
//                                                                 borderBottom: '1px solid #f0f0f0',
//                                                                 margin: 0,
//                                                                 gap: 0,
//                                                                 userSelect: 'none',
//                                                                 WebkitUserSelect: 'none',
//                                                                 MozUserSelect: 'none',
//                                                                 msUserSelect: 'none'
//                                                             }}
//                                                             tabIndex={0}
//                                                             onKeyDown={(e) => {
//                                                                 if (e.key === 'Enter') {
//                                                                     handleProductSelect(product);
//                                                                 }
//                                                             }}
//                                                             title={product.name}
//                                                         >
//                                                             <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                                                 {product.uniqueNumber || product.code || index + 1}
//                                                             </div>
//                                                             <div 
//                                                                 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                                 title={product.name}
//                                                             >
//                                                                 {compressText(product.name, 35)}
//                                                             </div>
//                                                             <div 
//                                                                 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                                 title={displayCategory}
//                                                             >
//                                                                 {compressText(displayCategory, 20)}
//                                                             </div>
//                                                             <div>Rs.{formatter.format(basePrice)}</div>
//                                                             <div>Rs.{formatter.format(priceWithVAT)}</div>
//                                                             <div>{displayStock}</div>
//                                                             <div>{displayUnit}</div>
//                                                             <div>{product.latestMarginPercentage || 0}%</div>
//                                                         </div>
//                                                     );
//                                                 })}

//                                                 {/* Loading indicator for infinite scroll */}
//                                                 {hasMoreSearchResults && !productSearchQuery && (
//                                                     <div style={{
//                                                         height: '28px',
//                                                         display: 'flex',
//                                                         alignItems: 'center',
//                                                         justifyContent: 'center',
//                                                         fontSize: '0.7rem',
//                                                         color: '#666'
//                                                     }}>
//                                                         Loading more...
//                                                     </div>
//                                                 )}
//                                             </>
//                                         )}
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                         <div className="modal-footer py-1" style={{ fontSize: '0.75rem' }}>
//                             <div className="d-flex justify-content-between w-100">
//                                 <div>
//                                     Showing {displayCount} of {totalSearchProducts} products
//                                     {searchPage > 1 && ` (Page ${searchPage})`}
//                                 </div>
//                                 <div className="text-muted">
//                                     {productSearchQuery ? 'Press ESC to close' : 'Scroll for more'}
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
//                                     onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
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

//----------------------------------------------------------end2

// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import axios from 'axios';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
// import ProductDetailsModal from './ProductDetailsModal';
// import BatchUpdateModal from './BatchUpdateModal';
// import { calculateExpiryStatus } from './ExpiryStatus';

// const ProductModal = ({ onClose }) => {
//     const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

//     // Modal position and size states
//     const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
//     const [modalSize, setModalSize] = useState({ width: 1140, height: 440 });
//     const [isDragging, setIsDragging] = useState(false);
//     const [isResizing, setIsResizing] = useState(false);
//     const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//     const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
//     const modalRef = useRef(null);

//     // Add states for virtualized list
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchProducts, setTotalSearchProducts] = useState(0);
//     const [productSearchQuery, setProductSearchQuery] = useState('');
//     const [vatStatusFilter, setVatStatusFilter] = useState('all');
//     const [currentFocus, setCurrentFocus] = useState(0);

//     // Other states
//     const [selectedProduct, setSelectedProduct] = useState(null);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
//     const [batchToUpdate, setBatchToUpdate] = useState(null);

//     const searchInputRef = useRef(null);
//     const listRef = useRef(null);
//     const rowRefs = useRef([]);
//     const loadingRef = useRef(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
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
//     const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
//         try {
//             setIsSearching(true);
//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 15,
//                     vatStatus: vatStatusFilter
//                 }
//             });

//             if (response.data.success) {
//                 const productsWithStock = response.data.items.map(item => ({
//                     ...item,
//                     currentStock: item.currentStock || 0,
//                     latestPrice: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
//                         : 0,
//                     latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
//                         : 0
//                 }));

//                 if (append) {
//                     setSearchResults(prev => [...prev, ...productsWithStock]);
//                 } else {
//                     setSearchResults(productsWithStock);
//                 }

//                 setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
//                 setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
//                 setSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching products:', error);
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
//         if (!isSearching && hasMoreSearchResults && !loadingRef.current && !productSearchQuery) {
//             loadingRef.current = true;
//             fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
//             setTimeout(() => {
//                 loadingRef.current = false;
//             }, 500);
//         }
//     }, [isSearching, hasMoreSearchResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

//     // Debounced search effect
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setSearchPage(1);
//             setCurrentFocus(0);
//             fetchProductsFromBackend(productSearchQuery, 1, false);
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [productSearchQuery, vatStatusFilter]);

//     // Load initial products when modal opens
//     useEffect(() => {
//         if (productDraftSave?.products) {
//             setSearchResults(productDraftSave.products);
//             setTotalSearchProducts(productDraftSave.products?.length || 0);
//             setProductSearchQuery(productDraftSave.searchQuery || '');
//             setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
//         } else {
//             fetchProductsFromBackend('', 1, false);
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

//     // Handle scroll for infinite loading
//     useEffect(() => {
//         const handleScroll = () => {
//             if (!listRef.current) return;

//             const container = listRef.current;
//             const scrollTop = container.scrollTop;
//             const clientHeight = container.clientHeight;
//             const scrollHeight = container.scrollHeight;

//             if (!isSearching && hasMoreSearchResults && !productSearchQuery) {
//                 const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
//                 if (scrollPercentage > 0.9) {
//                     loadMoreSearchProducts();
//                 }
//             }
//         };

//         const container = listRef.current;
//         if (container && !productSearchQuery) {
//             container.addEventListener('scroll', handleScroll);
//             return () => container.removeEventListener('scroll', handleScroll);
//         }
//     }, [hasMoreSearchResults, isSearching, productSearchQuery, loadMoreSearchProducts]);

//     const handleSearch = (e) => {
//         setProductSearchQuery(e.target.value);
//         setCurrentFocus(0);
//     };

//     const handleVatStatusChange = (status) => {
//         setVatStatusFilter(status);
//         setSearchPage(1);
//         setCurrentFocus(0);
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

//     const handleKeyDown = (e) => {
//         const currentProducts = searchResults;
//         if (currentProducts.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const nextFocus = (currentFocus + 1) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             const nextFocus = (currentFocus - 1 + currentProducts.length) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'Enter' && currentProducts[currentFocus]) {
//             e.preventDefault();
//             handleProductSelect(currentProducts[currentFocus]);
//         } else if (e.key === 'Escape') {
//             onClose();
//         } else if (e.key === 'F2') {
//             e.preventDefault();
//             searchInputRef.current?.focus();
//         }
//     };

//     const scrollToItem = (index) => {
//         if (rowRefs.current[index] && listRef.current) {
//             const rowElement = rowRefs.current[index];
//             const listContainer = listRef.current;
//             const rowTop = rowElement.offsetTop;
//             const rowBottom = rowTop + rowElement.offsetHeight;
//             const containerTop = listContainer.scrollTop;
//             const containerBottom = containerTop + listContainer.clientHeight;

//             if (rowTop < containerTop) {
//                 listContainer.scrollTop = rowTop;
//             } else if (rowBottom > containerBottom) {
//                 listContainer.scrollTop = rowBottom - listContainer.clientHeight;
//             }
//         }
//     };

//     // Function to compress long text
//     const compressText = (text, maxLength = 30) => {
//         if (!text) return '';
//         if (text.length <= maxLength) return text;
//         return text.substring(0, maxLength - 3) + '...';
//     };

//     const displayProducts = useMemo(() => {
//         return searchResults;
//     }, [searchResults]);

//     const displayCount = displayProducts.length;

//     // Format currency
//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const VAT_RATE = 0.13;

//     // Drag Handlers
//     const handleMouseDown = (e) => {
//         // Only allow drag from header
//         if (e.target.closest('.modal-header') && !e.target.closest('.btn-close')) {
//             e.preventDefault();
//             setIsDragging(true);
//             const rect = modalRef.current.getBoundingClientRect();
//             setDragOffset({
//                 x: e.clientX - rect.left,
//                 y: e.clientY - rect.top
//             });
//         }
//     };

//     const handleMouseMove = useCallback((e) => {
//         if (isDragging) {
//             e.preventDefault();
//             const newX = e.clientX - dragOffset.x;
//             const newY = e.clientY - dragOffset.y;

//             // Keep modal within viewport bounds
//             const maxX = window.innerWidth - modalSize.width;
//             const maxY = window.innerHeight - modalSize.height;

//             setModalPosition({
//                 x: Math.max(0, Math.min(newX, maxX)),
//                 y: Math.max(0, Math.min(newY, maxY))
//             });
//         } else if (isResizing) {
//             e.preventDefault();
//             const deltaX = e.clientX - resizeStart.x;
//             const deltaY = e.clientY - resizeStart.y;

//             const newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
//             const newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));

//             setModalSize({
//                 width: newWidth,
//                 height: newHeight
//             });
//         }
//     }, [isDragging, isResizing, dragOffset, modalSize, resizeStart, modalPosition]);

//     const handleMouseUp = useCallback(() => {
//         setIsDragging(false);
//         setIsResizing(false);
//     }, []);

//     // Resize Handlers
//     const handleResizeStart = (e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setIsResizing(true);
//         const rect = modalRef.current.getBoundingClientRect();
//         setResizeStart({
//             x: e.clientX,
//             y: e.clientY,
//             width: rect.width,
//             height: rect.height
//         });
//     };

//     // Add global event listeners
//     useEffect(() => {
//         if (isDragging || isResizing) {
//             window.addEventListener('mousemove', handleMouseMove);
//             window.addEventListener('mouseup', handleMouseUp);

//             // Prevent text selection during drag/resize
//             document.body.style.userSelect = 'none';
//             document.body.style.webkitUserSelect = 'none';
//         }

//         return () => {
//             window.removeEventListener('mousemove', handleMouseMove);
//             window.removeEventListener('mouseup', handleMouseUp);
//             document.body.style.userSelect = '';
//             document.body.style.webkitUserSelect = '';
//         };
//     }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

//     // Center modal on initial load
//     useEffect(() => {
//         const width = Math.min(1140, window.innerWidth - 40);
//         const height = Math.min(440, window.innerHeight - 40);
//         setModalSize({ width, height });
//         setModalPosition({
//             x: (window.innerWidth - width) / 2,
//             y: (window.innerHeight - height) / 2
//         });
//     }, []);

//     return (
//         <>
//             {/* Backdrop */}
//             <div
//                 className="modal-backdrop fade show"
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     backgroundColor: 'rgba(0,0,0,0.5)',
//                     zIndex: 1040
//                 }}
//                 onClick={onClose}
//             />

//             {/* Product Selection Modal */}
//             <div
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     zIndex: 1050,
//                     pointerEvents: 'none'
//                 }}
//             >
//                 <div
//                     ref={modalRef}
//                     style={{
//                         width: `${modalSize.width}px`,
//                         height: `${modalSize.height}px`,
//                         position: 'fixed',
//                         left: `${modalPosition.x}px`,
//                         top: `${modalPosition.y}px`,
//                         backgroundColor: '#fff',
//                         borderRadius: '8px',
//                         boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                         display: 'flex',
//                         flexDirection: 'column',
//                         pointerEvents: 'all',
//                         cursor: isDragging ? 'grabbing' : 'default',
//                         transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
//                         overflow: 'hidden',
//                         zIndex: 1051,
//                         border: '1px solid rgba(0,0,0,0.1)'
//                     }}
//                     onMouseDown={handleMouseDown}
//                 >
//                     {/* Drag Handle - Header */}
//                     <div
//                         className="modal-header py-1"
//                         style={{
//                             cursor: 'grab',
//                             backgroundColor: '#f8f9fa',
//                             borderBottom: '1px solid #dee2e6',
//                             padding: '8px 16px',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             flexShrink: 0,
//                             minHeight: '40px'
//                         }}
//                     >
//                         <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
//                             Product Details
//                         </p>
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             style={{
//                                 fontSize: '0.7rem',
//                                 border: 'none',
//                                 background: 'transparent',
//                                 cursor: 'pointer',
//                                 padding: '4px',
//                                 color: '#000',
//                                 opacity: 0.7,
//                                 transition: 'opacity 0.2s'
//                             }}
//                             onMouseEnter={(e) => e.target.style.opacity = '1'}
//                             onMouseLeave={(e) => e.target.style.opacity = '0.7'}
//                         >
//                             <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
//                         </button>
//                     </div>

//                     {/* Search and Filter Controls */}
//                     <div className="p-2 bg-white" style={{ flexShrink: 0 }}>
//                         <div className="row g-2 align-items-center">
//                             <div className="col-md-8">
//                                 <input
//                                     ref={searchInputRef}
//                                     type="text"
//                                     id="searchProduct"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search items by code, name, HSN, or category..."
//                                     autoFocus
//                                     autoComplete='off'
//                                     value={productSearchQuery}
//                                     onChange={handleSearch}
//                                     onKeyDown={handleKeyDown}
//                                     style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
//                                 />
//                             </div>
//                             <div className="col-md-4">
//                                 <div className="btn-group btn-group-sm w-100">
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
//                                         onClick={() => handleVatStatusChange('all')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         All
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'false' ? 'btn-success' : 'btn-outline-success'}`}
//                                         onClick={() => handleVatStatusChange('false')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Vatable
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'vatExempt' ? 'btn-warning' : 'btn-outline-warning'}`}
//                                         onClick={() => handleVatStatusChange('vatExempt')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Exempt
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Body - Product List */}
//                     <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
//                         <div style={{ height: '100%' }}>
//                             <div
//                                 className="w-100 h-100"
//                                 style={{
//                                     border: '1px solid #dee2e6',
//                                     borderRadius: '0.25rem',
//                                     overflow: 'hidden'
//                                 }}
//                             >
//                                 <div className="dropdown-header" style={{
//                                     display: 'grid',
//                                     gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                     alignItems: 'center',
//                                     padding: '0 8px',
//                                     height: '28px',
//                                     background: '#f0f0f0',
//                                     fontWeight: 'bold',
//                                     borderBottom: '1px solid #dee2e6',
//                                     position: 'sticky',
//                                     top: 0,
//                                     zIndex: 1,
//                                     fontSize: '0.7rem'
//                                 }}>
//                                     <div><strong>#</strong></div>
//                                     <div><strong>Description of Goods</strong></div>
//                                     <div><strong>Category</strong></div>
//                                     <div><strong>Rate</strong></div>
//                                     <div><strong>with tax</strong></div>
//                                     <div><strong>Stock</strong></div>
//                                     <div><strong>Unit</strong></div>
//                                     <div><strong>%</strong></div>
//                                 </div>

//                                 {/* Products List with infinite scroll */}
//                                 <div
//                                     ref={listRef}
//                                     style={{
//                                         height: 'calc(100% - 28px)',
//                                         overflowY: 'auto',
//                                         position: 'relative'
//                                     }}
//                                     onKeyDown={handleKeyDown}
//                                     tabIndex={0}
//                                 >
//                                     {isSearching && displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             Loading products...
//                                         </div>
//                                     ) : displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             {productSearchQuery ? 'No products match your search' : 'No products available'}
//                                         </div>
//                                     ) : (
//                                         <>
//                                             {displayProducts.map((product, index) => {
//                                                 const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
//                                                 const basePrice = product.latestPrice || 0;
//                                                 const priceWithVAT = isVatable ? basePrice * (1 + VAT_RATE) : basePrice;
//                                                 const displayCategory = product.categoryName || product.category?.name || 'No Category';
//                                                 const displayStock = product.currentStock || 0;
//                                                 const displayUnit = product.unitName || '';
//                                                 const expiryStatus = calculateExpiryStatus(product);

//                                                 const rowClasses = [
//                                                     'dropdown-item',
//                                                     isVatable ? 'vatable' : 'vatExempt',
//                                                     `expiry-${expiryStatus}`,
//                                                     index === currentFocus ? 'active' : ''
//                                                 ].filter(Boolean).join(' ');

//                                                 return (
//                                                     <div
//                                                         key={product._id || product.id || index}
//                                                         ref={el => rowRefs.current[index] = el}
//                                                         className={rowClasses}
//                                                         onClick={() => {
//                                                             handleProductSelect(product);
//                                                             if (searchInputRef.current) {
//                                                                 setTimeout(() => {
//                                                                     searchInputRef.current.focus();
//                                                                 }, 0);
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             display: 'grid',
//                                                             gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                                             alignItems: 'center',
//                                                             padding: '6px 8px',
//                                                             cursor: 'pointer',
//                                                             fontSize: '0.75rem',
//                                                             borderBottom: '1px solid #f0f0f0',
//                                                             margin: 0,
//                                                             gap: 0,
//                                                             userSelect: 'none',
//                                                             WebkitUserSelect: 'none',
//                                                             MozUserSelect: 'none',
//                                                             msUserSelect: 'none'
//                                                         }}
//                                                         tabIndex={0}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 handleProductSelect(product);
//                                                             }
//                                                         }}
//                                                         title={product.name}
//                                                     >
//                                                         <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                                             {product.uniqueNumber || product.code || index + 1}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={product.name}
//                                                         >
//                                                             {compressText(product.name, 35)}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={displayCategory}
//                                                         >
//                                                             {compressText(displayCategory, 20)}
//                                                         </div>
//                                                         <div>Rs.{formatter.format(basePrice)}</div>
//                                                         <div>Rs.{formatter.format(priceWithVAT)}</div>
//                                                         <div>{displayStock}</div>
//                                                         <div>{displayUnit}</div>
//                                                         <div>{product.latestMarginPercentage || 0}%</div>
//                                                     </div>
//                                                 );
//                                             })}

//                                             {/* Loading indicator for infinite scroll */}
//                                             {hasMoreSearchResults && !productSearchQuery && (
//                                                 <div style={{
//                                                     height: '28px',
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center',
//                                                     fontSize: '0.7rem',
//                                                     color: '#666'
//                                                 }}>
//                                                     Loading more...
//                                                 </div>
//                                             )}
//                                         </>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Footer */}
//                     <div className="modal-footer py-1" style={{
//                         fontSize: '0.75rem',
//                         position: 'relative',
//                         flexShrink: 0,
//                         padding: '8px 16px',
//                         borderTop: '1px solid #dee2e6',
//                         backgroundColor: '#f8f9fa'
//                     }}>
//                         <div className="d-flex justify-content-between w-100">
//                             <div>
//                                 Showing {displayCount} of {totalSearchProducts} products
//                                 {searchPage > 1 && ` (Page ${searchPage})`}
//                             </div>
//                             <div className="text-muted">
//                                 {productSearchQuery ? 'Press ESC to close' : ''}
//                             </div>
//                         </div>

//                         {/* Resize Handle - Bottom Right Corner */}
//                         <div
//                             style={{
//                                 position: 'absolute',
//                                 bottom: '3px',
//                                 right: '3px',
//                                 width: '20px',
//                                 height: '20px',
//                                 cursor: 'nwse-resize',
//                                 display: 'flex',
//                                 alignItems: 'flex-end',
//                                 justifyContent: 'flex-end',
//                                 padding: '0',
//                                 zIndex: 10
//                             }}
//                             onMouseDown={handleResizeStart}
//                         >
//                             <svg
//                                 width="16"
//                                 height="16"
//                                 viewBox="0 0 16 16"
//                                 style={{
//                                     opacity: 0.5,
//                                     transition: 'opacity 0.2s'
//                                 }}
//                                 onMouseEnter={(e) => e.target.style.opacity = '1'}
//                                 onMouseLeave={(e) => e.target.style.opacity = '0.5'}
//                             >
//                                 <line x1="12" y1="16" x2="16" y2="12" stroke="#666" strokeWidth="2" />
//                                 <line x1="8" y1="16" x2="16" y2="8" stroke="#666" strokeWidth="2" />
//                                 <line x1="12" y1="16" x2="16" y2="12" stroke="#666" strokeWidth="2" transform="scale(-1,1) translate(-20,0)" />
//                                 <line x1="8" y1="16" x2="16" y2="8" stroke="#666" strokeWidth="2" transform="scale(-1,1) translate(-20,0)" />
//                             </svg>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Product Details Modal */}
//             {showDetailsModal && selectedProduct && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1060,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)'
//                 }}
//                     onClick={() => setShowDetailsModal(false)}
//                 >
//                     <div
//                         style={{
//                             backgroundColor: '#fff',
//                             borderRadius: '8px',
//                             maxWidth: '800px',
//                             width: '90%',
//                             maxHeight: '90vh',
//                             overflow: 'auto',
//                             boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
//                         }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="modal-header py-2" style={{
//                             padding: '12px 20px',
//                             borderBottom: '1px solid #dee2e6',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                 {compressText(selectedProduct.name, 50)} Details
//                             </h5>
//                             <button
//                                 type="button"
//                                 className="btn-close"
//                                 onClick={() => setShowDetailsModal(false)}
//                                 style={{
//                                     border: 'none',
//                                     background: 'transparent',
//                                     cursor: 'pointer',
//                                     fontSize: '0.7rem'
//                                 }}
//                             ></button>
//                         </div>
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <ProductDetailsModal
//                                 product={selectedProduct}
//                                 onClose={() => setShowDetailsModal(false)}
//                                 onBatchUpdate={handleBatchUpdate}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Batch Update Modal */}
//             {showBatchUpdateModal && batchToUpdate && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1070,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)'
//                 }}
//                     onClick={() => setShowBatchUpdateModal(false)}
//                 >
//                     <div
//                         style={{
//                             backgroundColor: '#fff',
//                             borderRadius: '8px',
//                             maxWidth: '600px',
//                             width: '90%',
//                             maxHeight: '90vh',
//                             overflow: 'auto',
//                             boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
//                         }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="modal-header py-2" style={{
//                             padding: '12px 20px',
//                             borderBottom: '1px solid #dee2e6',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                 Update Batch Details
//                             </h5>
//                             <button
//                                 type="button"
//                                 className="btn-close"
//                                 onClick={() => setShowBatchUpdateModal(false)}
//                                 style={{
//                                     border: 'none',
//                                     background: 'transparent',
//                                     cursor: 'pointer',
//                                     fontSize: '0.7rem'
//                                 }}
//                             ></button>
//                         </div>
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <BatchUpdateModal
//                                 product={selectedProduct}
//                                 batch={batchToUpdate}
//                                 onClose={() => setShowBatchUpdateModal(false)}
//                                 onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default ProductModal;

//------------------------------------------------end3


// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import axios from 'axios';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
// import ProductDetailsModal from './ProductDetailsModal';
// import BatchUpdateModal from './BatchUpdateModal';
// import { calculateExpiryStatus } from './ExpiryStatus';

// const ProductModal = ({ onClose }) => {
//     const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

//     // Modal position and size states
//     const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
//     const [modalSize, setModalSize] = useState({ width: 1140, height: 440 });
//     const [isDragging, setIsDragging] = useState(false);
//     const [isResizing, setIsResizing] = useState(false);
//     const [resizeDirection, setResizeDirection] = useState('');
//     const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//     const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
//     const [zoomLevel, setZoomLevel] = useState(1);
//     const modalRef = useRef(null);

//     // Add states for virtualized list
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchProducts, setTotalSearchProducts] = useState(0);
//     const [productSearchQuery, setProductSearchQuery] = useState('');
//     const [vatStatusFilter, setVatStatusFilter] = useState('all');
//     const [currentFocus, setCurrentFocus] = useState(0);

//     // Other states
//     const [selectedProduct, setSelectedProduct] = useState(null);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
//     const [batchToUpdate, setBatchToUpdate] = useState(null);

//     const searchInputRef = useRef(null);
//     const listRef = useRef(null);
//     const rowRefs = useRef([]);
//     const loadingRef = useRef(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
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
//     const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
//         try {
//             setIsSearching(true);
//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 15,
//                     vatStatus: vatStatusFilter
//                 }
//             });

//             if (response.data.success) {
//                 const productsWithStock = response.data.items.map(item => ({
//                     ...item,
//                     currentStock: item.currentStock || 0,
//                     latestPrice: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
//                         : 0,
//                     latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
//                         : 0
//                 }));

//                 if (append) {
//                     setSearchResults(prev => [...prev, ...productsWithStock]);
//                 } else {
//                     setSearchResults(productsWithStock);
//                 }

//                 setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
//                 setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
//                 setSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching products:', error);
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
//         if (!isSearching && hasMoreSearchResults && !loadingRef.current && !productSearchQuery) {
//             loadingRef.current = true;
//             fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
//             setTimeout(() => {
//                 loadingRef.current = false;
//             }, 500);
//         }
//     }, [isSearching, hasMoreSearchResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

//     // Debounced search effect
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setSearchPage(1);
//             setCurrentFocus(0);
//             fetchProductsFromBackend(productSearchQuery, 1, false);
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [productSearchQuery, vatStatusFilter]);

//     // Load initial products when modal opens
//     useEffect(() => {
//         if (productDraftSave?.products) {
//             setSearchResults(productDraftSave.products);
//             setTotalSearchProducts(productDraftSave.products?.length || 0);
//             setProductSearchQuery(productDraftSave.searchQuery || '');
//             setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
//         } else {
//             fetchProductsFromBackend('', 1, false);
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

//     // Handle scroll for infinite loading
//     useEffect(() => {
//         const handleScroll = () => {
//             if (!listRef.current) return;

//             const container = listRef.current;
//             const scrollTop = container.scrollTop;
//             const clientHeight = container.clientHeight;
//             const scrollHeight = container.scrollHeight;

//             if (!isSearching && hasMoreSearchResults && !productSearchQuery) {
//                 const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
//                 if (scrollPercentage > 0.9) {
//                     loadMoreSearchProducts();
//                 }
//             }
//         };

//         const container = listRef.current;
//         if (container && !productSearchQuery) {
//             container.addEventListener('scroll', handleScroll);
//             return () => container.removeEventListener('scroll', handleScroll);
//         }
//     }, [hasMoreSearchResults, isSearching, productSearchQuery, loadMoreSearchProducts]);

//     const handleSearch = (e) => {
//         setProductSearchQuery(e.target.value);
//         setCurrentFocus(0);
//     };

//     const handleVatStatusChange = (status) => {
//         setVatStatusFilter(status);
//         setSearchPage(1);
//         setCurrentFocus(0);
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

//     const handleKeyDown = (e) => {
//         const currentProducts = searchResults;
//         if (currentProducts.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const nextFocus = (currentFocus + 1) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             const nextFocus = (currentFocus - 1 + currentProducts.length) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'Enter' && currentProducts[currentFocus]) {
//             e.preventDefault();
//             handleProductSelect(currentProducts[currentFocus]);
//         } else if (e.key === 'Escape') {
//             onClose();
//         } else if (e.key === 'F2') {
//             e.preventDefault();
//             searchInputRef.current?.focus();
//         }
//     };

//     const scrollToItem = (index) => {
//         if (rowRefs.current[index] && listRef.current) {
//             const rowElement = rowRefs.current[index];
//             const listContainer = listRef.current;
//             const rowTop = rowElement.offsetTop;
//             const rowBottom = rowTop + rowElement.offsetHeight;
//             const containerTop = listContainer.scrollTop;
//             const containerBottom = containerTop + listContainer.clientHeight;

//             if (rowTop < containerTop) {
//                 listContainer.scrollTop = rowTop;
//             } else if (rowBottom > containerBottom) {
//                 listContainer.scrollTop = rowBottom - listContainer.clientHeight;
//             }
//         }
//     };

//     // Function to compress long text
//     const compressText = (text, maxLength = 30) => {
//         if (!text) return '';
//         if (text.length <= maxLength) return text;
//         return text.substring(0, maxLength - 3) + '...';
//     };

//     const displayProducts = useMemo(() => {
//         return searchResults;
//     }, [searchResults]);

//     const displayCount = displayProducts.length;

//     // Format currency
//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const VAT_RATE = 0.13;

//     // Drag Handlers
//     const handleMouseDown = (e) => {
//         // Only allow drag from header
//         if (e.target.closest('.modal-header') && !e.target.closest('.btn-close') && !e.target.closest('.resize-handle')) {
//             e.preventDefault();
//             setIsDragging(true);
//             const rect = modalRef.current.getBoundingClientRect();
//             setDragOffset({
//                 x: e.clientX - rect.left,
//                 y: e.clientY - rect.top
//             });
//         }
//     };

//     const handleMouseMove = useCallback((e) => {
//         if (isDragging) {
//             e.preventDefault();
//             const newX = e.clientX - dragOffset.x;
//             const newY = e.clientY - dragOffset.y;

//             // Keep modal within viewport bounds
//             const maxX = window.innerWidth - modalSize.width;
//             const maxY = window.innerHeight - modalSize.height;

//             setModalPosition({
//                 x: Math.max(0, Math.min(newX, maxX)),
//                 y: Math.max(0, Math.min(newY, maxY))
//             });
//         } else if (isResizing) {
//             e.preventDefault();
//             const deltaX = e.clientX - resizeStart.x;
//             const deltaY = e.clientY - resizeStart.y;

//             let newWidth = resizeStart.width;
//             let newHeight = resizeStart.height;

//             // Handle different resize directions (only right and bottom)
//             switch (resizeDirection) {
//                 case 'right':
//                     newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
//                     break;
//                 case 'bottom':
//                     newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
//                     break;
//                 case 'bottom-right':
//                     newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
//                     newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
//                     break;
//                 default:
//                     break;
//             }

//             setModalSize({ width: newWidth, height: newHeight });
//         }
//     }, [isDragging, isResizing, dragOffset, modalSize, resizeStart, modalPosition, resizeDirection]);

//     const handleMouseUp = useCallback(() => {
//         setIsDragging(false);
//         setIsResizing(false);
//         setResizeDirection('');
//     }, []);

//     // Resize Handlers
//     const handleResizeStart = (e, direction) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setIsResizing(true);
//         setResizeDirection(direction);
//         const rect = modalRef.current.getBoundingClientRect();
//         setResizeStart({
//             x: e.clientX,
//             y: e.clientY,
//             width: rect.width,
//             height: rect.height,
//             left: rect.left,
//             top: rect.top
//         });
//     };

//     // Zoom handler
//     const handleWheel = useCallback((e) => {
//         if (e.ctrlKey || e.metaKey) {
//             e.preventDefault();
//             const delta = e.deltaY > 0 ? -0.1 : 0.1;
//             const newZoom = Math.min(Math.max(0.5, zoomLevel + delta), 2);
//             setZoomLevel(newZoom);
//         }
//     }, [zoomLevel]);

//     // Add global event listeners
//     useEffect(() => {
//         if (isDragging || isResizing) {
//             window.addEventListener('mousemove', handleMouseMove);
//             window.addEventListener('mouseup', handleMouseUp);

//             // Prevent text selection during drag/resize
//             document.body.style.userSelect = 'none';
//             document.body.style.webkitUserSelect = 'none';
//         }

//         return () => {
//             window.removeEventListener('mousemove', handleMouseMove);
//             window.removeEventListener('mouseup', handleMouseUp);
//             document.body.style.userSelect = '';
//             document.body.style.webkitUserSelect = '';
//         };
//     }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

//     // Add wheel event listener for zoom
//     useEffect(() => {
//         const modal = modalRef.current;
//         if (modal) {
//             modal.addEventListener('wheel', handleWheel, { passive: false });
//             return () => {
//                 modal.removeEventListener('wheel', handleWheel);
//             };
//         }
//     }, [handleWheel]);

//     // Center modal on initial load
//     useEffect(() => {
//         const width = Math.min(1140, window.innerWidth - 40);
//         const height = Math.min(440, window.innerHeight - 40);
//         setModalSize({ width, height });
//         setModalPosition({
//             x: (window.innerWidth - width) / 2,
//             y: (window.innerHeight - height) / 2
//         });
//     }, []);

//     // Resize handle styles
//     const resizeHandleStyle = {
//         position: 'absolute',
//         zIndex: 20,
//     };

//     return (
//         <>
//             {/* Backdrop */}
//             <div
//                 className="modal-backdrop fade show"
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     backgroundColor: 'rgba(0,0,0,0.5)',
//                     zIndex: 1040
//                 }}
//                 onClick={onClose}
//             />

//             {/* Product Selection Modal */}
//             <div
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     zIndex: 1050,
//                     pointerEvents: 'none'
//                 }}
//             >
//                 <div
//                     ref={modalRef}
//                     style={{
//                         width: `${modalSize.width}px`,
//                         height: `${modalSize.height}px`,
//                         position: 'fixed',
//                         left: `${modalPosition.x}px`,
//                         top: `${modalPosition.y}px`,
//                         backgroundColor: '#fff',
//                         borderRadius: '8px',
//                         boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                         display: 'flex',
//                         flexDirection: 'column',
//                         pointerEvents: 'all',
//                         cursor: isDragging ? 'grabbing' : 'default',
//                         transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s ease',
//                         overflow: 'hidden',
//                         zIndex: 1051,
//                         border: '1px solid rgba(0,0,0,0.1)',
//                         transform: `scale(${zoomLevel})`,
//                         transformOrigin: 'top left',
//                     }}
//                     onMouseDown={handleMouseDown}
//                 >
//                     {/* Zoom indicator */}
//                     {zoomLevel !== 1 && (
//                         <div style={{
//                             position: 'absolute',
//                             top: '50%',
//                             left: '50%',
//                             transform: 'translate(-50%, -50%)',
//                             backgroundColor: 'rgba(0,0,0,0.7)',
//                             color: '#fff',
//                             padding: '8px 16px',
//                             borderRadius: '4px',
//                             fontSize: '0.9rem',
//                             zIndex: 100,
//                             pointerEvents: 'none',
//                             opacity: 0.8
//                         }}>
//                             {Math.round(zoomLevel * 100)}%
//                         </div>
//                     )}

//                     {/* Resize Handles - Only Right and Bottom */}
//                     {/* Right */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             right: '-5px',
//                             top: '20px',
//                             bottom: '20px',
//                             width: '10px',
//                             cursor: 'ew-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'right')}
//                     />
//                     {/* Bottom */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             bottom: '-5px',
//                             left: '20px',
//                             right: '20px',
//                             height: '10px',
//                             cursor: 'ns-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'bottom')}
//                     />
//                     {/* Bottom-Right Corner */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             bottom: '-5px',
//                             right: '-5px',
//                             width: '15px',
//                             height: '15px',
//                             cursor: 'nwse-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
//                     />

//                     {/* Drag Handle - Header */}
//                     <div
//                         className="modal-header py-1"
//                         style={{
//                             cursor: 'grab',
//                             backgroundColor: '#f8f9fa',
//                             borderBottom: '1px solid #dee2e6',
//                             padding: '8px 16px',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             flexShrink: 0,
//                             minHeight: '40px'
//                         }}
//                     >
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//                             <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
//                                 Product Details
//                             </p>
//                             {zoomLevel !== 1 && (
//                                 <span style={{ 
//                                     fontSize: '0.65rem', 
//                                     color: '#999',
//                                     backgroundColor: '#f0f0f0',
//                                     padding: '1px 8px',
//                                     borderRadius: '3px',
//                                     fontFamily: 'monospace'
//                                 }}>
//                                     {Math.round(zoomLevel * 100)}%
//                                 </span>
//                             )}
//                         </div>
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             style={{
//                                 fontSize: '0.7rem',
//                                 border: 'none',
//                                 background: 'transparent',
//                                 cursor: 'pointer',
//                                 padding: '4px',
//                                 color: '#000',
//                                 opacity: 0.7,
//                                 transition: 'opacity 0.2s'
//                             }}
//                             onMouseEnter={(e) => e.target.style.opacity = '1'}
//                             onMouseLeave={(e) => e.target.style.opacity = '0.7'}
//                         >
//                             <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
//                         </button>
//                     </div>

//                     {/* Search and Filter Controls */}
//                     <div className="p-2 bg-white" style={{ flexShrink: 0 }}>
//                         <div className="row g-2 align-items-center">
//                             <div className="col-md-8">
//                                 <input
//                                     ref={searchInputRef}
//                                     type="text"
//                                     id="searchProduct"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search items by code, name, HSN, or category..."
//                                     autoFocus
//                                     autoComplete='off'
//                                     value={productSearchQuery}
//                                     onChange={handleSearch}
//                                     onKeyDown={handleKeyDown}
//                                     style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
//                                 />
//                             </div>
//                             <div className="col-md-4">
//                                 <div className="btn-group btn-group-sm w-100">
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
//                                         onClick={() => handleVatStatusChange('all')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         All
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'false' ? 'btn-success' : 'btn-outline-success'}`}
//                                         onClick={() => handleVatStatusChange('false')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Vatable
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'vatExempt' ? 'btn-warning' : 'btn-outline-warning'}`}
//                                         onClick={() => handleVatStatusChange('vatExempt')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Exempt
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Body - Product List */}
//                     <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
//                         <div style={{ height: '100%' }}>
//                             <div
//                                 className="w-100 h-100"
//                                 style={{
//                                     border: '1px solid #dee2e6',
//                                     borderRadius: '0.25rem',
//                                     overflow: 'hidden'
//                                 }}
//                             >
//                                 <div className="dropdown-header" style={{
//                                     display: 'grid',
//                                     gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                     alignItems: 'center',
//                                     padding: '0 8px',
//                                     height: '28px',
//                                     background: '#f0f0f0',
//                                     fontWeight: 'bold',
//                                     borderBottom: '1px solid #dee2e6',
//                                     position: 'sticky',
//                                     top: 0,
//                                     zIndex: 1,
//                                     fontSize: '0.7rem'
//                                 }}>
//                                     <div><strong>#</strong></div>
//                                     <div><strong>Description of Goods</strong></div>
//                                     <div><strong>Category</strong></div>
//                                     <div><strong>Rate</strong></div>
//                                     <div><strong>with tax</strong></div>
//                                     <div><strong>Stock</strong></div>
//                                     <div><strong>Unit</strong></div>
//                                     <div><strong>%</strong></div>
//                                 </div>

//                                 {/* Products List with infinite scroll */}
//                                 <div
//                                     ref={listRef}
//                                     style={{
//                                         height: 'calc(100% - 28px)',
//                                         overflowY: 'auto',
//                                         position: 'relative'
//                                     }}
//                                     onKeyDown={handleKeyDown}
//                                     tabIndex={0}
//                                 >
//                                     {isSearching && displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             Loading products...
//                                         </div>
//                                     ) : displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             {productSearchQuery ? 'No products match your search' : 'No products available'}
//                                         </div>
//                                     ) : (
//                                         <>
//                                             {displayProducts.map((product, index) => {
//                                                 const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
//                                                 const basePrice = product.latestPrice || 0;
//                                                 const priceWithVAT = isVatable ? basePrice * (1 + VAT_RATE) : basePrice;
//                                                 const displayCategory = product.categoryName || product.category?.name || 'No Category';
//                                                 const displayStock = product.currentStock || 0;
//                                                 const displayUnit = product.unitName || '';
//                                                 const expiryStatus = calculateExpiryStatus(product);

//                                                 const rowClasses = [
//                                                     'dropdown-item',
//                                                     isVatable ? 'vatable' : 'vatExempt',
//                                                     `expiry-${expiryStatus}`,
//                                                     index === currentFocus ? 'active' : ''
//                                                 ].filter(Boolean).join(' ');

//                                                 return (
//                                                     <div
//                                                         key={product._id || product.id || index}
//                                                         ref={el => rowRefs.current[index] = el}
//                                                         className={rowClasses}
//                                                         onClick={() => {
//                                                             handleProductSelect(product);
//                                                             if (searchInputRef.current) {
//                                                                 setTimeout(() => {
//                                                                     searchInputRef.current.focus();
//                                                                 }, 0);
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             display: 'grid',
//                                                             gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                                             alignItems: 'center',
//                                                             padding: '6px 8px',
//                                                             cursor: 'pointer',
//                                                             fontSize: '0.75rem',
//                                                             borderBottom: '1px solid #f0f0f0',
//                                                             margin: 0,
//                                                             gap: 0,
//                                                             userSelect: 'none',
//                                                             WebkitUserSelect: 'none',
//                                                             MozUserSelect: 'none',
//                                                             msUserSelect: 'none'
//                                                         }}
//                                                         tabIndex={0}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 handleProductSelect(product);
//                                                             }
//                                                         }}
//                                                         title={product.name}
//                                                     >
//                                                         <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                                             {product.uniqueNumber || product.code || index + 1}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={product.name}
//                                                         >
//                                                             {compressText(product.name, 35)}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={displayCategory}
//                                                         >
//                                                             {compressText(displayCategory, 20)}
//                                                         </div>
//                                                         <div>Rs.{formatter.format(basePrice)}</div>
//                                                         <div>Rs.{formatter.format(priceWithVAT)}</div>
//                                                         <div>{displayStock}</div>
//                                                         <div>{displayUnit}</div>
//                                                         <div>{product.latestMarginPercentage || 0}%</div>
//                                                     </div>
//                                                 );
//                                             })}

//                                             {/* Loading indicator for infinite scroll */}
//                                             {hasMoreSearchResults && !productSearchQuery && (
//                                                 <div style={{
//                                                     height: '28px',
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center',
//                                                     fontSize: '0.7rem',
//                                                     color: '#666'
//                                                 }}>
//                                                     Loading more...
//                                                 </div>
//                                             )}
//                                         </>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Footer */}
//                     <div className="modal-footer py-1" style={{
//                         fontSize: '0.75rem',
//                         position: 'relative',
//                         flexShrink: 0,
//                         padding: '8px 16px',
//                         borderTop: '1px solid #dee2e6',
//                         backgroundColor: '#f8f9fa'
//                     }}>
//                         <div className="d-flex justify-content-between w-100">
//                             <div>
//                                 Showing {displayCount} of {totalSearchProducts} products
//                                 {searchPage > 1 && ` (Page ${searchPage})`}
//                                 {zoomLevel !== 1 && ` • Zoom: ${Math.round(zoomLevel * 100)}%`}
//                             </div>
                           
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Product Details Modal */}
//             {showDetailsModal && selectedProduct && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1060,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)'
//                 }}
//                     onClick={() => setShowDetailsModal(false)}
//                 >
//                     <div
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <ProductDetailsModal
//                                 product={selectedProduct}
//                                 onClose={() => setShowDetailsModal(false)}
//                                 onBatchUpdate={handleBatchUpdate}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Batch Update Modal */}
//             {showBatchUpdateModal && batchToUpdate && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1070,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)'
//                 }}
//                     onClick={() => setShowBatchUpdateModal(false)}
//                 >
//                     <div
//                         style={{
//                             backgroundColor: '#fff',
//                             borderRadius: '8px',
//                             maxWidth: '600px',
//                             width: '90%',
//                             maxHeight: '90vh',
//                             overflow: 'auto',
//                             boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
//                         }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="modal-header py-2" style={{
//                             padding: '12px 20px',
//                             borderBottom: '1px solid #dee2e6',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                 Update Batch Details
//                             </h5>
//                             <button
//                                 type="button"
//                                 onClick={() => setShowBatchUpdateModal(false)}
//                                 style={{
//                                     border: 'none',
//                                     background: 'transparent',
//                                     cursor: 'pointer',
//                                     fontSize: '0.7rem',
//                                     color: '#000',
//                                     opacity: 0.7,
//                                     transition: 'opacity 0.2s'
//                                 }}
//                                 onMouseEnter={(e) => e.target.style.opacity = '1'}
//                                 onMouseLeave={(e) => e.target.style.opacity = '0.7'}
//                             >
//                                 <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
//                             </button>
//                         </div>
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <BatchUpdateModal
//                                 product={selectedProduct}
//                                 batch={batchToUpdate}
//                                 onClose={() => setShowBatchUpdateModal(false)}
//                                 onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// };

// export default ProductModal;

//---------------------------------------end4

// import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import axios from 'axios';
// import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
// import ProductDetailsModal from './ProductDetailsModal';
// import BatchUpdateModal from './BatchUpdateModal';
// import { calculateExpiryStatus } from './ExpiryStatus';

// const ProductModal = ({ onClose }) => {
//     const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

//     // Modal position and size states
//     const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
//     const [modalSize, setModalSize] = useState({ width: 1140, height: 440 });
//     const [isDragging, setIsDragging] = useState(false);
//     const [isResizing, setIsResizing] = useState(false);
//     const [resizeDirection, setResizeDirection] = useState('');
//     const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//     const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
//     const [zoomLevel, setZoomLevel] = useState(1);
//     const [isVisible, setIsVisible] = useState(false);
//     const [isClosing, setIsClosing] = useState(false);
//     const modalRef = useRef(null);

//     // Add states for virtualized list
//     const [isSearching, setIsSearching] = useState(false);
//     const [searchResults, setSearchResults] = useState([]);
//     const [searchPage, setSearchPage] = useState(1);
//     const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
//     const [totalSearchProducts, setTotalSearchProducts] = useState(0);
//     const [productSearchQuery, setProductSearchQuery] = useState('');
//     const [vatStatusFilter, setVatStatusFilter] = useState('all');
//     const [currentFocus, setCurrentFocus] = useState(0);

//     // Other states
//     const [selectedProduct, setSelectedProduct] = useState(null);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
//     const [batchToUpdate, setBatchToUpdate] = useState(null);

//     const searchInputRef = useRef(null);
//     const listRef = useRef(null);
//     const rowRefs = useRef([]);
//     const loadingRef = useRef(false);

//     const api = axios.create({
//         baseURL: process.env.REACT_APP_API_BASE_URL,
//         withCredentials: false,
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
//     const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
//         try {
//             setIsSearching(true);
//             const response = await api.get('/api/retailer/items/search', {
//                 params: {
//                     search: searchTerm,
//                     page: page,
//                     limit: 15,
//                     vatStatus: vatStatusFilter
//                 }
//             });

//             if (response.data.success) {
//                 const productsWithStock = response.data.items.map(item => ({
//                     ...item,
//                     currentStock: item.currentStock || 0,
//                     latestPrice: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.price || 0
//                         : 0,
//                     latestMarginPercentage: item.stockEntries && item.stockEntries.length > 0
//                         ? item.stockEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.marginPercentage || 0
//                         : 0
//                 }));

//                 if (append) {
//                     setSearchResults(prev => [...prev, ...productsWithStock]);
//                 } else {
//                     setSearchResults(productsWithStock);
//                 }

//                 setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
//                 setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
//                 setSearchPage(page);
//             }
//         } catch (error) {
//             console.error('Error fetching products:', error);
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
//         if (!isSearching && hasMoreSearchResults && !loadingRef.current && !productSearchQuery) {
//             loadingRef.current = true;
//             fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
//             setTimeout(() => {
//                 loadingRef.current = false;
//             }, 500);
//         }
//     }, [isSearching, hasMoreSearchResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

//     // Debounced search effect
//     useEffect(() => {
//         const timer = setTimeout(() => {
//             setSearchPage(1);
//             setCurrentFocus(0);
//             fetchProductsFromBackend(productSearchQuery, 1, false);
//         }, 300);

//         return () => clearTimeout(timer);
//     }, [productSearchQuery, vatStatusFilter]);

//     // Load initial products when modal opens
//     useEffect(() => {
//         if (productDraftSave?.products) {
//             setSearchResults(productDraftSave.products);
//             setTotalSearchProducts(productDraftSave.products?.length || 0);
//             setProductSearchQuery(productDraftSave.searchQuery || '');
//             setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
//         } else {
//             fetchProductsFromBackend('', 1, false);
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

//     // Handle scroll for infinite loading
//     useEffect(() => {
//         const handleScroll = () => {
//             if (!listRef.current) return;

//             const container = listRef.current;
//             const scrollTop = container.scrollTop;
//             const clientHeight = container.clientHeight;
//             const scrollHeight = container.scrollHeight;

//             if (!isSearching && hasMoreSearchResults && !productSearchQuery) {
//                 const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
//                 if (scrollPercentage > 0.9) {
//                     loadMoreSearchProducts();
//                 }
//             }
//         };

//         const container = listRef.current;
//         if (container && !productSearchQuery) {
//             container.addEventListener('scroll', handleScroll);
//             return () => container.removeEventListener('scroll', handleScroll);
//         }
//     }, [hasMoreSearchResults, isSearching, productSearchQuery, loadMoreSearchProducts]);

//     const handleSearch = (e) => {
//         setProductSearchQuery(e.target.value);
//         setCurrentFocus(0);
//     };

//     const handleVatStatusChange = (status) => {
//         setVatStatusFilter(status);
//         setSearchPage(1);
//         setCurrentFocus(0);
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

//     const handleKeyDown = (e) => {
//         const currentProducts = searchResults;
//         if (currentProducts.length === 0) return;

//         if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             const nextFocus = (currentFocus + 1) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             const nextFocus = (currentFocus - 1 + currentProducts.length) % currentProducts.length;
//             setCurrentFocus(nextFocus);
//             scrollToItem(nextFocus);
//         } else if (e.key === 'Enter' && currentProducts[currentFocus]) {
//             e.preventDefault();
//             handleProductSelect(currentProducts[currentFocus]);
//         } else if (e.key === 'Escape') {
//             handleClose();
//         } else if (e.key === 'F2') {
//             e.preventDefault();
//             searchInputRef.current?.focus();
//         }
//     };

//     const scrollToItem = (index) => {
//         if (rowRefs.current[index] && listRef.current) {
//             const rowElement = rowRefs.current[index];
//             const listContainer = listRef.current;
//             const rowTop = rowElement.offsetTop;
//             const rowBottom = rowTop + rowElement.offsetHeight;
//             const containerTop = listContainer.scrollTop;
//             const containerBottom = containerTop + listContainer.clientHeight;

//             if (rowTop < containerTop) {
//                 listContainer.scrollTop = rowTop;
//             } else if (rowBottom > containerBottom) {
//                 listContainer.scrollTop = rowBottom - listContainer.clientHeight;
//             }
//         }
//     };

//     // Function to compress long text
//     const compressText = (text, maxLength = 30) => {
//         if (!text) return '';
//         if (text.length <= maxLength) return text;
//         return text.substring(0, maxLength - 3) + '...';
//     };

//     const displayProducts = useMemo(() => {
//         return searchResults;
//     }, [searchResults]);

//     const displayCount = displayProducts.length;

//     // Format currency
//     const formatter = new Intl.NumberFormat('en-NP', {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//     });

//     const VAT_RATE = 0.13;

//     // Handle close with animation
//     const handleClose = () => {
//         setIsClosing(true);
//         setTimeout(() => {
//             setIsVisible(false);
//             onClose();
//         }, 300);
//     };

//     // Trigger entrance animation
//     useEffect(() => {
//         // Small delay to ensure DOM is ready
//         const timer = setTimeout(() => {
//             setIsVisible(true);
//         }, 50);
        
//         return () => clearTimeout(timer);
//     }, []);

//     // Drag Handlers
//     const handleMouseDown = (e) => {
//         // Only allow drag from header
//         if (e.target.closest('.modal-header') && !e.target.closest('.btn-close') && !e.target.closest('.resize-handle')) {
//             e.preventDefault();
//             setIsDragging(true);
//             const rect = modalRef.current.getBoundingClientRect();
//             setDragOffset({
//                 x: e.clientX - rect.left,
//                 y: e.clientY - rect.top
//             });
//         }
//     };

//     const handleMouseMove = useCallback((e) => {
//         if (isDragging) {
//             e.preventDefault();
//             const newX = e.clientX - dragOffset.x;
//             const newY = e.clientY - dragOffset.y;

//             // Keep modal within viewport bounds
//             const maxX = window.innerWidth - modalSize.width;
//             const maxY = window.innerHeight - modalSize.height;

//             setModalPosition({
//                 x: Math.max(0, Math.min(newX, maxX)),
//                 y: Math.max(0, Math.min(newY, maxY))
//             });
//         } else if (isResizing) {
//             e.preventDefault();
//             const deltaX = e.clientX - resizeStart.x;
//             const deltaY = e.clientY - resizeStart.y;

//             let newWidth = resizeStart.width;
//             let newHeight = resizeStart.height;

//             // Handle different resize directions (only right and bottom)
//             switch (resizeDirection) {
//                 case 'right':
//                     newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
//                     break;
//                 case 'bottom':
//                     newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
//                     break;
//                 case 'bottom-right':
//                     newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
//                     newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
//                     break;
//                 default:
//                     break;
//             }

//             setModalSize({ width: newWidth, height: newHeight });
//         }
//     }, [isDragging, isResizing, dragOffset, modalSize, resizeStart, modalPosition, resizeDirection]);

//     const handleMouseUp = useCallback(() => {
//         setIsDragging(false);
//         setIsResizing(false);
//         setResizeDirection('');
//     }, []);

//     // Resize Handlers
//     const handleResizeStart = (e, direction) => {
//         e.preventDefault();
//         e.stopPropagation();
//         setIsResizing(true);
//         setResizeDirection(direction);
//         const rect = modalRef.current.getBoundingClientRect();
//         setResizeStart({
//             x: e.clientX,
//             y: e.clientY,
//             width: rect.width,
//             height: rect.height,
//             left: rect.left,
//             top: rect.top
//         });
//     };

//     // Zoom handler
//     const handleWheel = useCallback((e) => {
//         if (e.ctrlKey || e.metaKey) {
//             e.preventDefault();
//             const delta = e.deltaY > 0 ? -0.1 : 0.1;
//             const newZoom = Math.min(Math.max(0.5, zoomLevel + delta), 2);
//             setZoomLevel(newZoom);
//         }
//     }, [zoomLevel]);

//     // Add global event listeners
//     useEffect(() => {
//         if (isDragging || isResizing) {
//             window.addEventListener('mousemove', handleMouseMove);
//             window.addEventListener('mouseup', handleMouseUp);

//             // Prevent text selection during drag/resize
//             document.body.style.userSelect = 'none';
//             document.body.style.webkitUserSelect = 'none';
//         }

//         return () => {
//             window.removeEventListener('mousemove', handleMouseMove);
//             window.removeEventListener('mouseup', handleMouseUp);
//             document.body.style.userSelect = '';
//             document.body.style.webkitUserSelect = '';
//         };
//     }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

//     // Add wheel event listener for zoom
//     useEffect(() => {
//         const modal = modalRef.current;
//         if (modal) {
//             modal.addEventListener('wheel', handleWheel, { passive: false });
//             return () => {
//                 modal.removeEventListener('wheel', handleWheel);
//             };
//         }
//     }, [handleWheel]);

//     // Center modal on initial load
//     useEffect(() => {
//         const width = Math.min(1140, window.innerWidth - 40);
//         const height = Math.min(440, window.innerHeight - 40);
//         setModalSize({ width, height });
//         setModalPosition({
//             x: (window.innerWidth - width) / 2,
//             y: (window.innerHeight - height) / 2
//         });
//     }, []);

//     // Resize handle styles
//     const resizeHandleStyle = {
//         position: 'absolute',
//         zIndex: 20,
//     };

//     return (
//         <>
//             {/* Backdrop */}
//             <div
//                 className="modal-backdrop fade show"
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     backgroundColor: 'rgba(0,0,0,0.5)',
//                     zIndex: 1040,
//                     opacity: isVisible ? 1 : 0,
//                     transition: 'opacity 0.3s ease-in-out',
//                     pointerEvents: isVisible ? 'auto' : 'none'
//                 }}
//                 onClick={handleClose}
//             />

//             {/* Product Selection Modal */}
//             <div
//                 style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     zIndex: 1050,
//                     pointerEvents: 'none'
//                 }}
//             >
//                 <div
//                     ref={modalRef}
//                     style={{
//                         width: `${modalSize.width}px`,
//                         height: `${modalSize.height}px`,
//                         position: 'fixed',
//                         left: `${modalPosition.x}px`,
//                         top: `${modalPosition.y}px`,
//                         backgroundColor: '#fff',
//                         borderRadius: '8px',
//                         boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                         display: 'flex',
//                         flexDirection: 'column',
//                         pointerEvents: isVisible ? 'all' : 'none',
//                         cursor: isDragging ? 'grabbing' : 'default',
//                         overflow: 'hidden',
//                         zIndex: 1051,
//                         border: '1px solid rgba(0,0,0,0.1)',
//                         transform: `scale(${isVisible ? zoomLevel : 0.9})`,
//                         transformOrigin: 'top left',
//                         opacity: isVisible ? 1 : 0,
//                         transition: isDragging || isResizing ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
//                         boxShadow: isVisible ? '0 20px 60px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.1)'
//                     }}
//                     onMouseDown={handleMouseDown}
//                 >
//                     {/* Zoom indicator */}
//                     {zoomLevel !== 1 && (
//                         <div style={{
//                             position: 'absolute',
//                             top: '50%',
//                             left: '50%',
//                             transform: 'translate(-50%, -50%)',
//                             backgroundColor: 'rgba(0,0,0,0.7)',
//                             color: '#fff',
//                             padding: '8px 16px',
//                             borderRadius: '4px',
//                             fontSize: '0.9rem',
//                             zIndex: 100,
//                             pointerEvents: 'none',
//                             opacity: 0.8,
//                             animation: 'fadeInOut 1.5s ease-in-out'
//                         }}>
//                             {Math.round(zoomLevel * 100)}%
//                         </div>
//                     )}

//                     {/* Resize Handles - Only Right and Bottom */}
//                     {/* Right */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             right: '-5px',
//                             top: '20px',
//                             bottom: '20px',
//                             width: '10px',
//                             cursor: 'ew-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'right')}
//                     />
//                     {/* Bottom */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             bottom: '-5px',
//                             left: '20px',
//                             right: '20px',
//                             height: '10px',
//                             cursor: 'ns-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'bottom')}
//                     />
//                     {/* Bottom-Right Corner */}
//                     <div
//                         className="resize-handle"
//                         style={{
//                             ...resizeHandleStyle,
//                             bottom: '-5px',
//                             right: '-5px',
//                             width: '15px',
//                             height: '15px',
//                             cursor: 'nwse-resize',
//                         }}
//                         onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
//                     />

//                     {/* Drag Handle - Header */}
//                     <div
//                         className="modal-header py-1"
//                         style={{
//                             cursor: 'grab',
//                             backgroundColor: '#f8f9fa',
//                             borderBottom: '1px solid #dee2e6',
//                             padding: '8px 16px',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center',
//                             flexShrink: 0,
//                             minHeight: '40px'
//                         }}
//                     >
//                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
//                             <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
//                                 Product Details
//                             </p>
//                             {zoomLevel !== 1 && (
//                                 <span style={{ 
//                                     fontSize: '0.65rem', 
//                                     color: '#999',
//                                     backgroundColor: '#f0f0f0',
//                                     padding: '1px 8px',
//                                     borderRadius: '3px',
//                                     fontFamily: 'monospace'
//                                 }}>
//                                     {Math.round(zoomLevel * 100)}%
//                                 </span>
//                             )}
//                         </div>
//                         <button
//                             type="button"
//                             onClick={handleClose}
//                             style={{
//                                 fontSize: '0.7rem',
//                                 border: 'none',
//                                 background: 'transparent',
//                                 cursor: 'pointer',
//                                 padding: '4px',
//                                 color: '#000',
//                                 opacity: 0.7,
//                                 transition: 'opacity 0.2s'
//                             }}
//                             onMouseEnter={(e) => e.target.style.opacity = '1'}
//                             onMouseLeave={(e) => e.target.style.opacity = '0.7'}
//                         >
//                             <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
//                         </button>
//                     </div>

//                     {/* Search and Filter Controls */}
//                     <div className="p-2 bg-white" style={{ flexShrink: 0 }}>
//                         <div className="row g-2 align-items-center">
//                             <div className="col-md-8">
//                                 <input
//                                     ref={searchInputRef}
//                                     type="text"
//                                     id="searchProduct"
//                                     className="form-control form-control-sm"
//                                     placeholder="Search items by code, name, HSN, or category..."
//                                     autoFocus
//                                     autoComplete='off'
//                                     value={productSearchQuery}
//                                     onChange={handleSearch}
//                                     onKeyDown={handleKeyDown}
//                                     style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
//                                 />
//                             </div>
//                             <div className="col-md-4">
//                                 <div className="btn-group btn-group-sm w-100">
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
//                                         onClick={() => handleVatStatusChange('all')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         All
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'false' ? 'btn-success' : 'btn-outline-success'}`}
//                                         onClick={() => handleVatStatusChange('false')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Vatable
//                                     </button>
//                                     <button
//                                         type="button"
//                                         className={`btn ${vatStatusFilter === 'vatExempt' ? 'btn-warning' : 'btn-outline-warning'}`}
//                                         onClick={() => handleVatStatusChange('vatExempt')}
//                                         style={{ fontSize: '0.7rem' }}
//                                     >
//                                         Exempt
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Body - Product List */}
//                     <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
//                         <div style={{ height: '100%' }}>
//                             <div
//                                 className="w-100 h-100"
//                                 style={{
//                                     border: '1px solid #dee2e6',
//                                     borderRadius: '0.25rem',
//                                     overflow: 'hidden'
//                                 }}
//                             >
//                                 <div className="dropdown-header" style={{
//                                     display: 'grid',
//                                     gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                     alignItems: 'center',
//                                     padding: '0 8px',
//                                     height: '28px',
//                                     background: '#f0f0f0',
//                                     fontWeight: 'bold',
//                                     borderBottom: '1px solid #dee2e6',
//                                     position: 'sticky',
//                                     top: 0,
//                                     zIndex: 1,
//                                     fontSize: '0.7rem'
//                                 }}>
//                                     <div><strong>#</strong></div>
//                                     <div><strong>Description of Goods</strong></div>
//                                     <div><strong>Category</strong></div>
//                                     <div><strong>Rate</strong></div>
//                                     <div><strong>with tax</strong></div>
//                                     <div><strong>Stock</strong></div>
//                                     <div><strong>Unit</strong></div>
//                                     <div><strong>%</strong></div>
//                                 </div>

//                                 {/* Products List with infinite scroll */}
//                                 <div
//                                     ref={listRef}
//                                     style={{
//                                         height: 'calc(100% - 28px)',
//                                         overflowY: 'auto',
//                                         position: 'relative'
//                                     }}
//                                     onKeyDown={handleKeyDown}
//                                     tabIndex={0}
//                                 >
//                                     {isSearching && displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             Loading products...
//                                         </div>
//                                     ) : displayCount === 0 ? (
//                                         <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
//                                             {productSearchQuery ? 'No products match your search' : 'No products available'}
//                                         </div>
//                                     ) : (
//                                         <>
//                                             {displayProducts.map((product, index) => {
//                                                 const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
//                                                 const basePrice = product.latestPrice || 0;
//                                                 const priceWithVAT = isVatable ? basePrice * (1 + VAT_RATE) : basePrice;
//                                                 const displayCategory = product.categoryName || product.category?.name || 'No Category';
//                                                 const displayStock = product.currentStock || 0;
//                                                 const displayUnit = product.unitName || '';
//                                                 const expiryStatus = calculateExpiryStatus(product);

//                                                 const rowClasses = [
//                                                     'dropdown-item',
//                                                     isVatable ? 'vatable' : 'vatExempt',
//                                                     `expiry-${expiryStatus}`,
//                                                     index === currentFocus ? 'active' : ''
//                                                 ].filter(Boolean).join(' ');

//                                                 return (
//                                                     <div
//                                                         key={product._id || product.id || index}
//                                                         ref={el => rowRefs.current[index] = el}
//                                                         className={rowClasses}
//                                                         onClick={() => {
//                                                             handleProductSelect(product);
//                                                             if (searchInputRef.current) {
//                                                                 setTimeout(() => {
//                                                                     searchInputRef.current.focus();
//                                                                 }, 0);
//                                                             }
//                                                         }}
//                                                         style={{
//                                                             display: 'grid',
//                                                             gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
//                                                             alignItems: 'center',
//                                                             padding: '6px 8px',
//                                                             cursor: 'pointer',
//                                                             fontSize: '0.75rem',
//                                                             borderBottom: '1px solid #f0f0f0',
//                                                             margin: 0,
//                                                             gap: 0,
//                                                             userSelect: 'none',
//                                                             WebkitUserSelect: 'none',
//                                                             MozUserSelect: 'none',
//                                                             msUserSelect: 'none'
//                                                         }}
//                                                         tabIndex={0}
//                                                         onKeyDown={(e) => {
//                                                             if (e.key === 'Enter') {
//                                                                 handleProductSelect(product);
//                                                             }
//                                                         }}
//                                                         title={product.name}
//                                                     >
//                                                         <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
//                                                             {product.uniqueNumber || product.code || index + 1}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={product.name}
//                                                         >
//                                                             {compressText(product.name, 35)}
//                                                         </div>
//                                                         <div
//                                                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
//                                                             title={displayCategory}
//                                                         >
//                                                             {compressText(displayCategory, 20)}
//                                                         </div>
//                                                         <div>Rs.{formatter.format(basePrice)}</div>
//                                                         <div>Rs.{formatter.format(priceWithVAT)}</div>
//                                                         <div>{displayStock}</div>
//                                                         <div>{displayUnit}</div>
//                                                         <div>{product.latestMarginPercentage || 0}%</div>
//                                                     </div>
//                                                 );
//                                             })}

//                                             {/* Loading indicator for infinite scroll */}
//                                             {hasMoreSearchResults && !productSearchQuery && (
//                                                 <div style={{
//                                                     height: '28px',
//                                                     display: 'flex',
//                                                     alignItems: 'center',
//                                                     justifyContent: 'center',
//                                                     fontSize: '0.7rem',
//                                                     color: '#666'
//                                                 }}>
//                                                     Loading more...
//                                                 </div>
//                                             )}
//                                         </>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Modal Footer */}
//                     <div className="modal-footer py-1" style={{
//                         fontSize: '0.75rem',
//                         position: 'relative',
//                         flexShrink: 0,
//                         padding: '8px 16px',
//                         borderTop: '1px solid #dee2e6',
//                         backgroundColor: '#f8f9fa'
//                     }}>
//                         <div className="d-flex justify-content-between w-100">
//                             <div>
//                                 Showing {displayCount} of {totalSearchProducts} products
//                                 {searchPage > 1 && ` (Page ${searchPage})`}
//                                 {zoomLevel !== 1 && ` • Zoom: ${Math.round(zoomLevel * 100)}%`}
//                             </div>
//                             <div className="text-muted" style={{ fontSize: '0.65rem' }}>
//                                 Ctrl+Scroll to zoom
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Product Details Modal */}
//             {showDetailsModal && selectedProduct && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1060,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)',
//                     animation: 'fadeIn 0.3s ease-in-out'
//                 }}
//                     onClick={() => setShowDetailsModal(false)}
//                 >
//                     <div
//                         onClick={(e) => e.stopPropagation()}
//                         style={{
//                             animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
//                         }}
//                     >
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <ProductDetailsModal
//                                 product={selectedProduct}
//                                 onClose={() => setShowDetailsModal(false)}
//                                 onBatchUpdate={handleBatchUpdate}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Batch Update Modal */}
//             {showBatchUpdateModal && batchToUpdate && (
//                 <div style={{
//                     position: 'fixed',
//                     top: 0,
//                     left: 0,
//                     width: '100%',
//                     height: '100%',
//                     zIndex: 1070,
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     backgroundColor: 'rgba(0,0,0,0.5)',
//                     animation: 'fadeIn 0.3s ease-in-out'
//                 }}
//                     onClick={() => setShowBatchUpdateModal(false)}
//                 >
//                     <div
//                         style={{
//                             backgroundColor: '#fff',
//                             borderRadius: '8px',
//                             maxWidth: '600px',
//                             width: '90%',
//                             maxHeight: '90vh',
//                             overflow: 'auto',
//                             boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
//                             animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
//                         }}
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="modal-header py-2" style={{
//                             padding: '12px 20px',
//                             borderBottom: '1px solid #dee2e6',
//                             display: 'flex',
//                             justifyContent: 'space-between',
//                             alignItems: 'center'
//                         }}>
//                             <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
//                                 Update Batch Details
//                             </h5>
//                             <button
//                                 type="button"
//                                 onClick={() => setShowBatchUpdateModal(false)}
//                                 style={{
//                                     border: 'none',
//                                     background: 'transparent',
//                                     cursor: 'pointer',
//                                     fontSize: '0.7rem',
//                                     color: '#000',
//                                     opacity: 0.7,
//                                     transition: 'opacity 0.2s'
//                                 }}
//                                 onMouseEnter={(e) => e.target.style.opacity = '1'}
//                                 onMouseLeave={(e) => e.target.style.opacity = '0.7'}
//                             >
//                                 <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
//                             </button>
//                         </div>
//                         <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
//                             <BatchUpdateModal
//                                 product={selectedProduct}
//                                 batch={batchToUpdate}
//                                 onClose={() => setShowBatchUpdateModal(false)}
//                                 onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* CSS Animations */}
//             <style jsx global>{`
//                 @keyframes fadeIn {
//                     from {
//                         opacity: 0;
//                     }
//                     to {
//                         opacity: 1;
//                     }
//                 }
                
//                 @keyframes scaleIn {
//                     from {
//                         transform: scale(0.9);
//                         opacity: 0;
//                     }
//                     to {
//                         transform: scale(1);
//                         opacity: 1;
//                     }
//                 }
                
//                 @keyframes fadeInOut {
//                     0% {
//                         opacity: 0;
//                         transform: translate(-50%, -50%) scale(0.8);
//                     }
//                     20% {
//                         opacity: 1;
//                         transform: translate(-50%, -50%) scale(1);
//                     }
//                     80% {
//                         opacity: 1;
//                         transform: translate(-50%, -50%) scale(1);
//                     }
//                     100% {
//                         opacity: 0;
//                         transform: translate(-50%, -50%) scale(0.8);
//                     }
//                 }
//             `}</style>
//         </>
//     );
// };

// export default ProductModal;

//----------------------------------------end5

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { usePageNotRefreshContext } from '../../PageNotRefreshContext';
import ProductDetailsModal from './ProductDetailsModal';
import BatchUpdateModal from './BatchUpdateModal';
import { calculateExpiryStatus } from './ExpiryStatus';

const ProductModal = ({ onClose }) => {
    const { productDraftSave, setProductDraftSave } = usePageNotRefreshContext();

    // Modal position and size states
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [modalSize, setModalSize] = useState({ width: 1140, height: 440 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState('');
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [show, setShow] = useState(false);
    const modalRef = useRef(null);

    // Add states for virtualized list
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
    const [totalSearchProducts, setTotalSearchProducts] = useState(0);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [vatStatusFilter, setVatStatusFilter] = useState('all');
    const [currentFocus, setCurrentFocus] = useState(0);

    // Other states
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
    const [batchToUpdate, setBatchToUpdate] = useState(null);

    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const rowRefs = useRef([]);
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

    // Fetch products from backend with search functionality
    const fetchProductsFromBackend = useCallback(async (searchTerm = '', page = 1, append = false) => {
        try {
            setIsSearching(true);
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
                        : 0
                }));

                if (append) {
                    setSearchResults(prev => [...prev, ...productsWithStock]);
                } else {
                    setSearchResults(productsWithStock);
                }

                setHasMoreSearchResults(response.data.pagination?.hasNextPage || false);
                setTotalSearchProducts(response.data.pagination?.totalItems || productsWithStock.length);
                setSearchPage(page);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
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
        if (!isSearching && hasMoreSearchResults && !loadingRef.current && !productSearchQuery) {
            loadingRef.current = true;
            fetchProductsFromBackend(productSearchQuery, searchPage + 1, true);
            setTimeout(() => {
                loadingRef.current = false;
            }, 500);
        }
    }, [isSearching, hasMoreSearchResults, productSearchQuery, searchPage, fetchProductsFromBackend]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchPage(1);
            setCurrentFocus(0);
            fetchProductsFromBackend(productSearchQuery, 1, false);
        }, 300);

        return () => clearTimeout(timer);
    }, [productSearchQuery, vatStatusFilter]);

    // Load initial products when modal opens
    useEffect(() => {
        if (productDraftSave?.products) {
            setSearchResults(productDraftSave.products);
            setTotalSearchProducts(productDraftSave.products?.length || 0);
            setProductSearchQuery(productDraftSave.searchQuery || '');
            setVatStatusFilter(productDraftSave.vatStatusFilter || 'all');
        } else {
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

            if (!isSearching && hasMoreSearchResults && !productSearchQuery) {
                const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
                if (scrollPercentage > 0.9) {
                    loadMoreSearchProducts();
                }
            }
        };

        const container = listRef.current;
        if (container && !productSearchQuery) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [hasMoreSearchResults, isSearching, productSearchQuery, loadMoreSearchProducts]);

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
            handleClose();
        } else if (e.key === 'F2') {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
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

    // Function to compress long text
    const compressText = (text, maxLength = 30) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    };

    const displayProducts = useMemo(() => {
        return searchResults;
    }, [searchResults]);

    const displayCount = displayProducts.length;

    // Format currency
    const formatter = new Intl.NumberFormat('en-NP', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const VAT_RATE = 0.13;

    // Handle close with animation
    const handleClose = () => {
        setShow(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    // Show modal with animation
    useEffect(() => {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            setShow(true);
        }, 50);
        
        return () => clearTimeout(timer);
    }, []);

    // Drag Handlers
    const handleMouseDown = (e) => {
        // Only allow drag from header
        if (e.target.closest('.modal-header') && !e.target.closest('.btn-close') && !e.target.closest('.resize-handle')) {
            e.preventDefault();
            setIsDragging(true);
            const rect = modalRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            e.preventDefault();
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // Keep modal within viewport bounds
            const maxX = window.innerWidth - modalSize.width;
            const maxY = window.innerHeight - modalSize.height;

            setModalPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        } else if (isResizing) {
            e.preventDefault();
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;

            // Handle different resize directions (only right and bottom)
            switch (resizeDirection) {
                case 'right':
                    newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
                    break;
                case 'bottom':
                    newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
                    break;
                case 'bottom-right':
                    newWidth = Math.max(500, Math.min(resizeStart.width + deltaX, window.innerWidth - modalPosition.x));
                    newHeight = Math.max(300, Math.min(resizeStart.height + deltaY, window.innerHeight - modalPosition.y));
                    break;
                default:
                    break;
            }

            setModalSize({ width: newWidth, height: newHeight });
        }
    }, [isDragging, isResizing, dragOffset, modalSize, resizeStart, modalPosition, resizeDirection]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection('');
    }, []);

    // Resize Handlers
    const handleResizeStart = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        const rect = modalRef.current.getBoundingClientRect();
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            left: rect.left,
            top: rect.top
        });
    };

    // Zoom handler
    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newZoom = Math.min(Math.max(0.5, zoomLevel + delta), 2);
            setZoomLevel(newZoom);
        }
    }, [zoomLevel]);

    // Add global event listeners
    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            // Prevent text selection during drag/resize
            document.body.style.userSelect = 'none';
            document.body.style.webkitUserSelect = 'none';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    // Add wheel event listener for zoom
    useEffect(() => {
        const modal = modalRef.current;
        if (modal) {
            modal.addEventListener('wheel', handleWheel, { passive: false });
            return () => {
                modal.removeEventListener('wheel', handleWheel);
            };
        }
    }, [handleWheel]);

    // Center modal on initial load
    useEffect(() => {
        const width = Math.min(1140, window.innerWidth - 40);
        const height = Math.min(440, window.innerHeight - 40);
        setModalSize({ width, height });
        setModalPosition({
            x: (window.innerWidth - width) / 2,
            y: (window.innerHeight - height) / 2
        });
    }, []);

    // Resize handle styles
    const resizeHandleStyle = {
        position: 'absolute',
        zIndex: 20,
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`modal-backdrop fade ${show ? 'show' : ''}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1040,
                    transition: 'opacity 0.15s linear',
                    opacity: show ? 1 : 0,
                    pointerEvents: show ? 'auto' : 'none'
                }}
                onClick={handleClose}
            />

            {/* Product Selection Modal */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1050,
                    pointerEvents: 'none'
                }}
            >
                <div
                    ref={modalRef}
                    className={`modal fade ${show ? 'show' : ''}`}
                    style={{
                        width: `${modalSize.width}px`,
                        height: `${modalSize.height}px`,
                        position: 'fixed',
                        left: `${modalPosition.x}px`,
                        top: `${modalPosition.y}px`,
                        backgroundColor: '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        pointerEvents: show ? 'all' : 'none',
                        cursor: isDragging ? 'grabbing' : 'default',
                        overflow: 'hidden',
                        zIndex: 1051,
                        border: '1px solid rgba(0,0,0,0.1)',
                        transform: `scale(${show ? zoomLevel : 0.8})`,
                        transformOrigin: 'center center',
                        opacity: show ? 1 : 0,
                        transition: isDragging || isResizing ? 'none' : 'all 0.3s ease-in-out',
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {/* Zoom indicator */}
                    {zoomLevel !== 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                            zIndex: 100,
                            pointerEvents: 'none',
                            opacity: 0.8,
                            animation: 'fadeInOut 1.5s ease-in-out'
                        }}>
                            {Math.round(zoomLevel * 100)}%
                        </div>
                    )}

                    {/* Resize Handles - Only Right and Bottom */}
                    {/* Right */}
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            right: '-5px',
                            top: '20px',
                            bottom: '20px',
                            width: '10px',
                            cursor: 'ew-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'right')}
                    />
                    {/* Bottom */}
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            bottom: '-5px',
                            left: '20px',
                            right: '20px',
                            height: '10px',
                            cursor: 'ns-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                    />
                    {/* Bottom-Right Corner */}
                    <div
                        className="resize-handle"
                        style={{
                            ...resizeHandleStyle,
                            bottom: '-5px',
                            right: '-5px',
                            width: '15px',
                            height: '15px',
                            cursor: 'nwse-resize',
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
                    />

                    {/* Drag Handle - Header */}
                    <div
                        className="modal-header py-1"
                        style={{
                            cursor: 'grab',
                            backgroundColor: '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            padding: '8px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0,
                            minHeight: '40px'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <p className="modal-title mb-0" style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                                Product Details
                            </p>
                            {zoomLevel !== 1 && (
                                <span style={{ 
                                    fontSize: '0.65rem', 
                                    color: '#999',
                                    backgroundColor: '#f0f0f0',
                                    padding: '1px 8px',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace'
                                }}>
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                fontSize: '0.7rem',
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#000',
                                opacity: 0.7,
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                        >
                            <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
                        </button>
                    </div>

                    {/* Search and Filter Controls */}
                    <div className="p-2 bg-white" style={{ flexShrink: 0 }}>
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

                    {/* Modal Body - Product List */}
                    <div className="modal-body p-0" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
                        <div style={{ height: '100%' }}>
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
                                    {isSearching && displayCount === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            Loading products...
                                        </div>
                                    ) : displayCount === 0 ? (
                                        <div className="text-center py-3 text-muted" style={{ fontSize: '0.75rem' }}>
                                            {productSearchQuery ? 'No products match your search' : 'No products available'}
                                        </div>
                                    ) : (
                                        <>
                                            {displayProducts.map((product, index) => {
                                                const isVatable = product.vatStatus === '13' || product.vatStatus === 'false';
                                                const basePrice = product.latestPrice || 0;
                                                const priceWithVAT = isVatable ? basePrice * (1 + VAT_RATE) : basePrice;
                                                const displayCategory = product.categoryName || product.category?.name || 'No Category';
                                                const displayStock = product.currentStock || 0;
                                                const displayUnit = product.unitName || '';
                                                const expiryStatus = calculateExpiryStatus(product);

                                                const rowClasses = [
                                                    'dropdown-item',
                                                    isVatable ? 'vatable' : 'vatExempt',
                                                    `expiry-${expiryStatus}`,
                                                    index === currentFocus ? 'active' : ''
                                                ].filter(Boolean).join(' ');

                                                return (
                                                    <div
                                                        key={product._id || product.id || index}
                                                        ref={el => rowRefs.current[index] = el}
                                                        className={rowClasses}
                                                        onClick={() => {
                                                            handleProductSelect(product);
                                                            if (searchInputRef.current) {
                                                                setTimeout(() => {
                                                                    searchInputRef.current.focus();
                                                                }, 0);
                                                            }
                                                        }}
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '0.5fr 3fr 1fr 1fr 1fr 1fr 1fr 0.8fr',
                                                            alignItems: 'center',
                                                            padding: '6px 8px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            borderBottom: '1px solid #f0f0f0',
                                                            margin: 0,
                                                            gap: 0,
                                                            userSelect: 'none',
                                                            WebkitUserSelect: 'none',
                                                            MozUserSelect: 'none',
                                                            msUserSelect: 'none'
                                                        }}
                                                        tabIndex={0}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleProductSelect(product);
                                                            }
                                                        }}
                                                        title={product.name}
                                                    >
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {product.uniqueNumber || product.code || index + 1}
                                                        </div>
                                                        <div
                                                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={product.name}
                                                        >
                                                            {compressText(product.name, 35)}
                                                        </div>
                                                        <div
                                                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                            title={displayCategory}
                                                        >
                                                            {compressText(displayCategory, 20)}
                                                        </div>
                                                        <div>Rs.{formatter.format(basePrice)}</div>
                                                        <div>Rs.{formatter.format(priceWithVAT)}</div>
                                                        <div>{displayStock}</div>
                                                        <div>{displayUnit}</div>
                                                        <div>{product.latestMarginPercentage || 0}%</div>
                                                    </div>
                                                );
                                            })}

                                            {/* Loading indicator for infinite scroll */}
                                            {hasMoreSearchResults && !productSearchQuery && (
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

                    {/* Modal Footer */}
                    <div className="modal-footer py-1" style={{
                        fontSize: '0.75rem',
                        position: 'relative',
                        flexShrink: 0,
                        padding: '8px 16px',
                        borderTop: '1px solid #dee2e6',
                        backgroundColor: '#f8f9fa'
                    }}>
                        <div className="d-flex justify-content-between w-100">
                            <div>
                                Showing {displayCount} of {totalSearchProducts} products
                                {searchPage > 1 && ` (Page ${searchPage})`}
                                {zoomLevel !== 1 && ` • Zoom: ${Math.round(zoomLevel * 100)}%`}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                                Ctrl+Scroll to zoom
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Details Modal */}
            {showDetailsModal && selectedProduct && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1060,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                }}
                    onClick={() => setShowDetailsModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
                            <ProductDetailsModal
                                product={selectedProduct}
                                onClose={() => setShowDetailsModal(false)}
                                onBatchUpdate={handleBatchUpdate}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Update Modal */}
            {showBatchUpdateModal && batchToUpdate && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1070,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                }}
                    onClick={() => setShowBatchUpdateModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header py-2" style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid #dee2e6',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h5 className="modal-title" style={{ fontSize: '0.9rem' }}>
                                Update Batch Details
                            </h5>
                            <button
                                type="button"
                                onClick={() => setShowBatchUpdateModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    color: '#000',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                            >
                                <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>×</span>
                            </button>
                        </div>
                        <div className="modal-body" style={{ fontSize: '0.8rem', padding: '20px' }}>
                            <BatchUpdateModal
                                product={selectedProduct}
                                batch={batchToUpdate}
                                onClose={() => setShowBatchUpdateModal(false)}
                                onUpdate={() => fetchProductsFromBackend(productSearchQuery, 1, false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style jsx global>{`
                .modal.fade {
                    transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
                }
                
                .modal.fade:not(.show) {
                    opacity: 0;
                    transform: scale(0.8);
                }
                
                .modal.fade.show {
                    opacity: 1;
                    transform: scale(1);
                }
                
                .modal-backdrop.fade {
                    transition: opacity 0.15s linear;
                }
                
                .modal-backdrop.fade:not(.show) {
                    opacity: 0;
                }
                
                .modal-backdrop.fade.show {
                    opacity: 1;
                }
                
                @keyframes fadeInOut {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    80% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                }
            `}</style>
        </>
    );
};

export default ProductModal;