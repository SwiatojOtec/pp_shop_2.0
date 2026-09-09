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
}) {
    return (
        <>
            <div className="rental-section">
                <div className="rental-section-header">
                    <h2>Інструменти у заявці</h2>
                    <ProductSearchBar
                        searchQuery={searchQuery}
                        onSearchChange={onSearchChange}
                        searchResults={searchResults}
                        onSelectProduct={onSelectProduct}
                    />
                </div>

                <div className="rental-items-wrap">
                    {items.length === 0 ? (
                        <p className="rental-enrichment-hint">Позицій поки немає.</p>
                    ) : items.map((item, idx) => (
                        <RentalItemCard
                            key={item._key}
                            item={item}
                            index={idx}
                            onUpdate={(field, value) => onUpdateItem(item._key, field, value)}
                            onRemove={() => onRemoveItem(item._key)}
                            onRemoveKitItem={(kitIndex) => onRemoveKitItem(item._key, kitIndex)}
                        />
                    ))}

                    <button
                        onClick={onAddEmptyItem}
                        className="add-item-btn"
                    >
                        <Plus size={16} /> Додати рядок вручну
                    </button>
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
