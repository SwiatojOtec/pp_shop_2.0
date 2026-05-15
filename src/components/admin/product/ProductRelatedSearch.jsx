import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { productsApi } from '../../../services/api';

/**
 * Rent product "also rented with" picker.
 */
export default function ProductRelatedSearch({ productId, selected = [], onChange }) {
    const [search, setSearch]   = useState('');
    const [results, setResults] = useState([]);
    const timeoutRef            = useRef(null);

    function handleSearchChange(val) {
        setSearch(val);
        clearTimeout(timeoutRef.current);
        if (val.trim().length < 2) { setResults([]); return; }
        timeoutRef.current = setTimeout(async () => {
            try {
                const data = await productsApi.list({
                    search: val,
                    isRent: true,
                    includeHiddenRent: true,
                });
                const rows = Array.isArray(data) ? data : [];
                const existingIds = selected.map((r) => r.id);
                setResults(
                    rows
                        .filter((p) => p.id !== (productId ? parseInt(productId) : null) && !existingIds.includes(p.id))
                        .slice(0, 6)
                );
            } catch {
                setResults([]);
            }
        }, 300);
    }

    function addItem(product) {
        onChange([...selected, { id: product.id, name: product.name, image: product.image, slug: product.slug }]);
        setSearch('');
        setResults([]);
    }

    function removeItem(id) {
        onChange(selected.filter((r) => r.id !== id));
    }

    return (
        <div className="admin-section">
            <h2 className="section-title">З цим товаром також беруть</h2>
            <p className="section-hint">
                Вкажіть товари, які клієнти часто орендують разом з цим інструментом.
            </p>

            <div className="related-tags">
                {selected.length > 0 ? (
                    selected.map((item) => (
                        <div key={item.id} className="related-tag">
                            {item.image && (
                                <img src={item.image} alt="" className="related-tag-img" />
                            )}
                            <span>{item.name}</span>
                            <button
                                type="button"
                                className="related-tag-remove"
                                onClick={() => removeItem(item.id)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))
                ) : (
                    <span className="empty-hint">Товарів не вибрано</span>
                )}
            </div>

            <div className="related-search-wrapper">
                <input
                    type="text"
                    placeholder="Пошук товару за назвою..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                />
                {results.length > 0 && (
                    <div className="related-dropdown">
                        {results.map((p) => (
                            <div
                                key={p.id}
                                className="related-dropdown-item"
                                onClick={() => addItem(p)}
                            >
                                <img src={p.image} alt="" className="related-dropdown-img" />
                                <div>
                                    <div className="related-dropdown-name">{p.name}</div>
                                    <div className="related-dropdown-meta">{p.category} · {p.price} ₴/доба</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
