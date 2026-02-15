// hooks/useInfiniteItems.js
import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteItems = (api, initialLimit = 50) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [isVatExempt, setIsVatExempt] = useState('all');
    
    const observerRef = useRef();
    const lastItemRef = useCallback(node => {
        if (isLoading) return;
        if (observerRef.current) observerRef.current.disconnect();
        
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !searchTerm) {
                loadMore();
            }
        });
        
        if (node) observerRef.current.observe(node);
    }, [isLoading, hasMore, searchTerm]);

    const fetchItems = useCallback(async (pageNum = 1, search = '', vatFilter = 'all', reset = false) => {
        try {
            setIsLoading(true);
            
            const params = {
                page: pageNum,
                limit: initialLimit,
                ...(search && { search }),
                ...(vatFilter !== 'all' && { excludeVat: vatFilter })
            };

            const response = await api.get('/api/retailer/items', { params });
            
            if (response.data.success) {
                if (reset) {
                    setItems(response.data.items);
                } else {
                    setItems(prev => [...prev, ...response.data.items]);
                }
                
                setTotalCount(response.data.pagination.total);
                setHasMore(response.data.pagination.hasMore);
                setPage(pageNum);
                
                if (reset) {
                    setPage(1);
                }
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setIsLoading(false);
        }
    }, [api, initialLimit]);

    const loadMore = () => {
        if (!isLoading && hasMore && !searchTerm) {
            fetchItems(page + 1, searchTerm, isVatExempt, false);
        }
    };

    const searchItems = (search = '', vatFilter = 'all') => {
        setSearchTerm(search);
        setIsVatExempt(vatFilter);
        
        if (search) {
            // For search, fetch with search term and reset items
            fetchItems(1, search, vatFilter, true);
        } else {
            // Clear search, reset to initial state
            setItems([]);
            fetchItems(1, '', vatFilter, true);
        }
    };

    const resetItems = () => {
        setItems([]);
        setPage(1);
        setHasMore(true);
        setSearchTerm('');
        fetchItems(1, '', 'all', true);
    };

    useEffect(() => {
        // Initial fetch
        fetchItems(1, '', 'all', true);
    }, []);

    return {
        items,
        isLoading,
        hasMore,
        totalCount,
        lastItemRef,
        searchItems,
        resetItems,
        loadMore
    };
};

export default useInfiniteItems;