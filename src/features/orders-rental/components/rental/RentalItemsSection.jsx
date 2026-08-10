import { Plus } from 'lucide-react';
import ProductSearchBar from './ProductSearchBar';
import RentalItemCard from './RentalItemCard';
import RentalTotalsBlock from './RentalTotalsBlock';

export default function RentalItemsSection({
    items,
    searchQuery,
    onSearchChange,
    searchResults,
    onSelectProduct,
    onUpdateItem,
    onRemoveItem,
    onRemoveKitItem,
    onAddEmptyItem,
    totals,
    discountType,
    discountValue,
    onDiscountTypeChange,
    onDiscountValueChange,
    discountLocked = false,
    enrichmentOnly = false,
}) {
    return (
        <>
            <div className="rental-section">
                <div className="rental-section-header">
                    <h2>{enrichmentOnly ? 'Деталі оренди по позиціях' : 'Інструменти у заявці'}</h2>
                    {!enrichmentOnly && (
                        <ProductSearchBar
                            searchQuery={searchQuery}
                            onSearchChange={onSearchChange}
                            searchResults={searchResults}
                            onSelectProduct={onSelectProduct}
                        />
                    )}
                </div>

                {enrichmentOnly && (
                    <p className="rental-enrichment-hint">
                        Склад і кількість змінюйте у блоці «Товари» вище. Тут — серійні номери, стан, застава і комплект для документів.
                    </p>
                )}

                <div className="rental-items-wrap">
                    {items.length === 0 ? (
                        <p className="rental-enrichment-hint">
                            {enrichmentOnly
                                ? 'Додайте інструмент оренди у блоці «Товари».'
                                : 'Позицій поки немає.'}
                        </p>
                    ) : items.map((item, idx) => (
                        <RentalItemCard
                            key={item._key}
                            item={item}
                            index={idx}
                            enrichmentOnly={enrichmentOnly}
                            onUpdate={(field, value) => onUpdateItem(item._key, field, value)}
                            onRemove={() => onRemoveItem(item._key)}
                            onRemoveKitItem={(kitIndex) => onRemoveKitItem(item._key, kitIndex)}
                        />
                    ))}

                    {!enrichmentOnly && (
                        <button
                            onClick={onAddEmptyItem}
                            className="add-item-btn"
                        >
                            <Plus size={16} /> Додати рядок вручну
                        </button>
                    )}
                </div>
            </div>
            <RentalTotalsBlock
                totalRental={totals.totalRental}
                discountType={discountType}
                discountValue={discountValue}
                onDiscountTypeChange={onDiscountTypeChange}
                onDiscountValueChange={onDiscountValueChange}
                discountAmount={totals.discountAmount}
                totalRentalAfterDiscount={totals.totalRentalAfterDiscount}
                totalDeposit={totals.totalDeposit}
                grandTotal={totals.grandTotal}
                discountLocked={discountLocked}
            />
        </>
    );
}
