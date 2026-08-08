import { useState, useEffect, useRef, useCallback } from 'react';
import { productsApi } from '../../../services/api';
import { buildItemFromProduct } from '../model/rentalItems';

export function useProductSearch(items, setItems) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimeout = useRef(null);

    const [upsellItems, setUpsellItems] = useState([]);
    const [upsellVisible, setUpsellVisible] = useState(false);
    const [upsellProductName, setUpsellProductName] = useState('');

    useEffect(() => {
        clearTimeout(searchTimeout.current);
        if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await productsApi.list({
                    search: searchQuery.trim(),
                    isRent: true,
                    includeHiddenRent: true,
                });
                const rows = Array.isArray(data) ? data : [];
                setSearchResults(rows.slice(0, 8));
            } catch {
                setSearchResults([]);
            }
        }, 300);
    }, [searchQuery]);

    const addProductFromSearch = useCallback(async (product) => {
        setItems(prev => [...prev, buildItemFromProduct(product)]);
        setSearchQuery('');
        setSearchResults([]);

        if (product.relatedProducts && product.relatedProducts.length > 0) {
            const related = await Promise.all(
                product.relatedProducts.map((pid) =>
                    productsApi.getById(pid).catch(() => null)
                )
            );
            const filtered = related.filter(Boolean);
            if (filtered.length > 0) {
                setUpsellItems(filtered);
                setUpsellProductName(product.name);
                setUpsellVisible(true);
            }
        }
    }, [setItems]);

    const addUpsellProduct = useCallback((product) => {
        const alreadyAdded = items.some(i => i.productId === product.id);
        if (alreadyAdded) return;
        setItems(prev => [...prev, buildItemFromProduct(product)]);
        setUpsellItems(prev => prev.filter(p => p.id !== product.id));
        if (upsellItems.length <= 1) setUpsellVisible(false);
    }, [items, setItems, upsellItems.length]);

    return {
        searchQuery,
        setSearchQuery,
        searchResults,
        addProductFromSearch,
        upsellItems,
        upsellVisible,
        setUpsellVisible,
        upsellProductName,
        addUpsellProduct,
    };
}
