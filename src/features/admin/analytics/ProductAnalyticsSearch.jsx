import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { productsApi } from '../../../services/api';
import { optimizeImageUrl } from '../../../utils/imageOptimize';

/** Пошук товару для аналітики «по товару» — той самий дебаунс-патерн, що й
 *  пошук пов'язаних товарів у картці (ProductRelatedSearch.jsx), але
 *  одиночний вибір замість мультитегів. */
export default function ProductAnalyticsSearch({ selectedProduct, onSelect, onClear }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef(null);

    function handleSearchChange(val) {
        setSearch(val);
        clearTimeout(timeoutRef.current);
        if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
        timeoutRef.current = setTimeout(async () => {
            try {
                const data = await productsApi.list({ search: val, limit: 8 });
                setResults(Array.isArray(data) ? data : []);
                setOpen(true);
            } catch {
                setResults([]);
            }
        }, 300);
    }

    function pick(product) {
        onSelect(product);
        setSearch('');
        setResults([]);
        setOpen(false);
    }

    if (selectedProduct) {
        return (
            <div className="analytics-product-picked">
                {selectedProduct.image && (
                    <img src={optimizeImageUrl(selectedProduct.image, { width: 60 })} alt="" className="analytics-product-picked-img" />
                )}
                <div className="analytics-product-picked-info">
                    <span className="analytics-product-picked-name">{selectedProduct.name}</span>
                    <span className="analytics-muted">{selectedProduct.category}{selectedProduct.brand ? ` · ${selectedProduct.brand}` : ''}</span>
                </div>
                <button type="button" className="ds-icon-btn" onClick={onClear} title="До загального огляду">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="analytics-product-search">
            <Search size={16} className="analytics-product-search-icon" />
            <input
                type="text"
                placeholder="Пошук товару для детальної аналітики..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => results.length > 0 && setOpen(true)}
                className="catalog-input"
            />
            {open && results.length > 0 && (
                <div className="analytics-product-dropdown">
                    {results.map((p) => (
                        <div key={p.id} className="analytics-product-dropdown-item" onClick={() => pick(p)}>
                            {p.image && <img src={optimizeImageUrl(p.image, { width: 60 })} alt="" />}
                            <div>
                                <div className="analytics-product-dropdown-name">{p.name}</div>
                                <div className="analytics-muted">{p.category}{p.brand ? ` · ${p.brand}` : ''} · SKU {p.sku}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
