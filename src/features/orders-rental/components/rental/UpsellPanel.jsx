import { Plus, X, Sparkles } from 'lucide-react';
import { formatRentCatalogPriceCaption } from '../../../../utils/rentPricing';

export default function UpsellPanel({
    visible,
    productName,
    items,
    upsellItems,
    onClose,
    onAddProduct,
}) {
    return (
        <div className={`upsell-panel ${visible ? 'upsell-panel--open' : ''}`}>
            <div className="upsell-panel-header">
                <div className="upsell-panel-title">
                    <Sparkles size={16} />
                    <span>Не забудьте порадити замовнику:</span>
                </div>
                <button className="upsell-close" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>
            <p className="upsell-subtitle">
                До «{productName}» часто беруть:
            </p>
            <div className="upsell-items">
                {upsellItems.map(p => {
                    const alreadyAdded = items.some(i => i.productId === p.id);
                    return (
                        <div
                            key={p.id}
                            className={`upsell-item ${alreadyAdded ? 'upsell-item--added' : ''}`}
                            onClick={() => !alreadyAdded && onAddProduct(p)}
                        >
                            <img src={p.image} alt={p.name} className="upsell-item-img" />
                            <div className="upsell-item-info">
                                <span className="upsell-item-name">{p.name}</span>
                                <span className="upsell-item-price">{formatRentCatalogPriceCaption(p)}</span>
                            </div>
                            <button className={`upsell-add-btn ${alreadyAdded ? 'added' : ''}`}>
                                {alreadyAdded ? '✓' : <Plus size={16} />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
