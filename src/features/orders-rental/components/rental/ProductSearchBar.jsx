import { Search } from 'lucide-react';
import { formatRentCatalogPriceCaption } from '../../../../utils/rentPricing';
import { optimizeImageUrl } from '../../../../utils/imageOptimize';

export default function ProductSearchBar({ searchQuery, onSearchChange, searchResults, onSelectProduct }) {
    return (
        <div className="product-search-wrap">
            <Search size={16} className="search-icon" />
            <input
                type="text"
                placeholder="Додати інструмент (пошук за назвою)..."
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                className="product-search-input"
            />
            {searchResults.length > 0 && (
                <div className="search-dropdown">
                    {searchResults.map(p => (
                        <div key={p.id} className="search-dropdown-item" onClick={() => onSelectProduct(p)}>
                            <img src={optimizeImageUrl(p.image, { width: 100 })} alt="" />
                            <div>
                                <div className="sdi-name">{p.name}</div>
                                <div className="sdi-sub">{p.category} · {formatRentCatalogPriceCaption(p)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
