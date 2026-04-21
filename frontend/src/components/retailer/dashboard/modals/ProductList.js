// import React, { useCallback, useRef, useEffect } from 'react';
// import { FixedSizeList as List } from 'react-window';
// import '../../../../stylesheet/retailer/dashboard/modals/ProductList.css';
// import { calculateExpiryStatus } from './ExpiryStatus';

// const ProductList = React.forwardRef(({ products, currentFocus, onProductSelect }, ref) => {
//     const listRef = useRef(null);

//     // Scroll to center the focused item whenever currentFocus changes
//     useEffect(() => {
//         if (listRef.current && currentFocus !== null) {
//             const itemHeight = 40; // Same as your itemSize
//             const listHeight = 600; // Same as your list height
//             const visibleItems = Math.floor(listHeight / itemHeight);
//             const centerOffset = Math.floor(visibleItems / 2);

//             // Calculate position to center the focused item
//             const scrollToPosition = Math.max(0, (currentFocus - centerOffset) * itemHeight);

//             listRef.current.scrollTo(scrollToPosition);
//         }
//     }, [currentFocus]);

//     const Row = useCallback(({ index, style, data }) => {
//         const product = data[index];
//         const expiryStatus = calculateExpiryStatus(product);
//         const isFocused = index === currentFocus;

//         const rowClass = [
//             'list-group-item',
//             'product-row',
//             isFocused ? 'active' : '',
//             product.vatStatus === 'vatable' ? 'vatable' : '',
//             product.vatStatus === 'vatExempt' ? 'vatExempt' : '',
//             `expiry-${expiryStatus}`
//         ].filter(Boolean).join(' ');

//         // Calculate rate
//         const baseRate = Math.round(product.rate * 100) / 100;

//         const rateWithVAT = product.vatStatus === 'vatable'
//             ? Math.round((product.rate * 1.13) * 100) / 100
//             : baseRate;

//         return (
//             <div
//                 className={rowClass}
//                 onClick={() => onProductSelect(product)}
//                 style={{
//                     ...style,
//                     height: '40px',
//                     display: 'flex',
//                     alignItems: 'center',
//                     cursor: 'pointer'
//                 }}
//             >
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.uniqueNumber}</div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.hscode}</div>
//                 <div className="product-cell product-name" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.name}</div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.company}</div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>
//                     Rs.{baseRate} {product.vatStatus === 'vatable'}
//                 </div>
//                 {/* With Tax */}
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>
//                     Rs.{rateWithVAT}
//                 </div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.stock}</div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{product.unit}</div>
//                 <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px' }}>{Math.round(product.margin * 100) / 100}</div>
//             </div>
//         );
//     }, [currentFocus, onProductSelect]);

//     return (
//         <div id="productDetailsContainer" style={{ height: '100%' }}>
//             {/* Header remains static */}
//             <ul id="productDetailsHeader" className="list-group list-group-horizontal">
//                 <li className="product-cell" style={{ textAlign: 'left' }}>#</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>HSN</li>
//                 <li className="product-cell product-name" style={{ textAlign: 'left' }}>Description of Goods</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>Company</li>
//                 {/* <li className="product-cell" style={{ textAlign: 'left' }}>Category</li> */}
//                 <li className="product-cell" style={{ textAlign: 'left' }}>S.Rate</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>with tax</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>Stock</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>Unit</li>
//                 <li className="product-cell" style={{ textAlign: 'left' }}>%</li>
//             </ul>

//             {/* Virtualized list */}
//             <div style={{ height: 'calc(100% - 40px)', outline: 'none' }}>
//                 {products.length === 0 ? (
//                     <div className="list-group-item text-center py-4 text-muted">
//                         No products found
//                     </div>
//                 ) : (
//                     <List
//                         ref={listRef}
//                         height={600}
//                         itemCount={products.length}
//                         itemSize={40}
//                         width="100%"
//                         itemData={products}
//                     >
//                         {Row}
//                     </List>
//                 )}
//             </div>
//         </div>
//     );
// });

// export default ProductList;

//------------------------------------------------end

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import axios from 'axios';
import '../../../../stylesheet/retailer/dashboard/modals/ProductList.css';
import { calculateExpiryStatus } from './ExpiryStatus';

const ProductList = React.forwardRef(({ products: initialProducts, currentFocus, onProductSelect, refreshTrigger }, ref) => {
    const [products, setProducts] = useState(initialProducts);
    const listRef = useRef(null);

    // Create axios instance with auth
    const api = axios.create({
        baseURL: process.env.REACT_APP_API_BASE_URL,
        withCredentials: true,
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

    // Update products when initialProducts changes
    useEffect(() => {
        setProducts(initialProducts);
    }, [initialProducts]);

    // Refresh products when refreshTrigger changes
    useEffect(() => {
        if (refreshTrigger) {
            refreshProductList();
        }
    }, [refreshTrigger]);

    // Function to refresh product list from API
    const refreshProductList = async () => {
        try {
            // Get current search query from parent if available
            const searchQuery = localStorage.getItem('productSearchQuery') || '';
            const vatStatus = localStorage.getItem('productVatStatus') || 'all';
            
            const response = await api.get('/api/retailer/items/search', {
                params: {
                    search: searchQuery,
                    vatStatus: vatStatus,
                    page: 1,
                    limit: 100
                }
            });
            
            if (response.data.success && response.data.items) {
                const updatedProducts = response.data.items.map(item => ({
                    id: item.id || item._id,
                    _id: item.id || item._id,
                    uniqueNumber: item.uniqueNumber,
                    hscode: item.hscode || '',
                    name: item.Name || item.name,
                    company: item.itemsCompanyName || '',
                    category: item.categoryName || '',
                    rate: item.Price || item.price || 0,
                    stock: item.totalStock || item.currentStock || 0,
                    unit: item.unitName || '',
                    margin: item.marginPercentage || 0,
                    vatStatus: item.vatStatus || 'vatable',
                    puPrice: item.PuPrice || item.puPrice || 0,
                    mrp: item.mrp || 0,
                    stockEntries: item.stockEntries || []
                }));
                setProducts(updatedProducts);
                
                // Update localStorage if needed
                localStorage.setItem('cachedProducts', JSON.stringify(updatedProducts));
            }
        } catch (error) {
            console.error('Error refreshing product list:', error);
        }
    };

    // Scroll to center the focused item whenever currentFocus changes
    useEffect(() => {
        if (listRef.current && currentFocus !== null && currentFocus !== undefined) {
            const itemHeight = 40;
            const listHeight = 600;
            const visibleItems = Math.floor(listHeight / itemHeight);
            const centerOffset = Math.floor(visibleItems / 2);
            const scrollToPosition = Math.max(0, (currentFocus - centerOffset) * itemHeight);
            listRef.current.scrollTo(scrollToPosition);
        }
    }, [currentFocus]);

    const Row = useCallback(({ index, style, data }) => {
        const product = data[index];
        if (!product) return null;
        
        const expiryStatus = calculateExpiryStatus(product);
        const isFocused = index === currentFocus;

        const rowClass = [
            'list-group-item',
            'product-row',
            isFocused ? 'active' : '',
            product.vatStatus === 'vatable' ? 'vatable' : '',
            product.vatStatus === 'vatExempt' ? 'vatExempt' : '',
            `expiry-${expiryStatus}`
        ].filter(Boolean).join(' ');

        // Calculate rate
        const baseRate = Math.round((product.rate || product.puPrice || 0) * 100) / 100;
        const rateWithVAT = product.vatStatus === 'vatable'
            ? Math.round((baseRate * 1.13) * 100) / 100
            : baseRate;

        return (
            <div
                className={rowClass}
                onClick={() => onProductSelect(product)}
                style={{
                    ...style,
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
            >
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.uniqueNumber || '-'}</div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.hscode || '-'}</div>
                <div className="product-cell product-name" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.name || '-'}</div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.company || '-'}</div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>
                    Rs.{baseRate.toFixed(2)}
                </div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>
                    Rs.{rateWithVAT.toFixed(2)}
                </div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.stock || 0}</div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>{product.unit || '-'}</div>
                <div className="product-cell" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>
                    {Math.round((product.margin || 0) * 100) / 100}%
                </div>
            </div>
        );
    }, [currentFocus, onProductSelect]);

    return (
        <div id="productDetailsContainer" style={{ height: '100%' }}>
            {/* Header remains static */}
            <ul id="productDetailsHeader" className="list-group list-group-horizontal">
                <li className="product-cell" style={{ textAlign: 'left' }}>#</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>HSN</li>
                <li className="product-cell product-name" style={{ textAlign: 'left' }}>Description of Goods</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>Company</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>S.Rate</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>with tax</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>Stock</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>Unit</li>
                <li className="product-cell" style={{ textAlign: 'left' }}>%</li>
            </ul>

            {/* Virtualized list */}
            <div style={{ height: 'calc(100% - 40px)', outline: 'none' }}>
                {products.length === 0 ? (
                    <div className="list-group-item text-center py-4 text-muted">
                        No products found
                    </div>
                ) : (
                    <List
                        ref={listRef}
                        height={600}
                        itemCount={products.length}
                        itemSize={40}
                        width="100%"
                        itemData={products}
                    >
                        {Row}
                    </List>
                )}
            </div>
        </div>
    );
});

export default ProductList;