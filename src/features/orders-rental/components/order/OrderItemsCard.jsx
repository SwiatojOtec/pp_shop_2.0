import { Search } from 'lucide-react';
import { parseDiscountPercent } from '../../amounts/orderAmounts';
import DealItemRow from './DealItemRow';

export default function OrderItemsCard({
    draft,
    rentProductIds,
    billingOptions,
    orderAmounts,
    productSearch,
    setProductSearch,
    suggestedProducts,
    onAddItem,
    onRemoveItem,
    onUpdateQty,
    onUpdateRentDates,
    onUpdateItemEnrichment,
    onRemoveItemKit,
}) {
    return (
        <div className="ds-card deal-card deal-card--items">
            <div className="ds-card-h">
                <h2>Позиції</h2>
                <span className="ds-tab-count">{draft.items.length}</span>
            </div>

            <div className="deal-item-list">
                {draft.items.map((item, idx) => {
                    const isRentLine = item.isRent || rentProductIds.has(item.id);
                    return (
                        <DealItemRow
                            key={idx}
                            item={item}
                            isRentLine={isRentLine}
                            sellerId={draft.sellerId}
                            billingOptions={billingOptions}
                            onRemove={() => onRemoveItem(idx)}
                            onUpdateQty={(qty) => onUpdateQty(idx, qty)}
                            onUpdateRentDates={(dates) => onUpdateRentDates(idx, dates)}
                            onUpdateEnrichment={(field, value) => onUpdateItemEnrichment(idx, field, value)}
                            onRemoveKitItem={(kitIndex) => onRemoveItemKit(idx, kitIndex)}
                        />
                    );
                })}
                {!draft.items.length && (
                    <p className="deal-items-empty">Позицій поки немає</p>
                )}
            </div>

            <div className="deal-product-search">
                <Search size={15} className="deal-product-search__icon" />
                <input
                    type="text"
                    className="deal-product-search__input"
                    placeholder="Додати товар: введіть назву або артикул..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                />
                {suggestedProducts.length > 0 && (
                    <div className="deal-product-search__suggest">
                        {suggestedProducts.map((p) => (
                            <div key={p.id} className="deal-product-search__item" onClick={() => onAddItem(p)}>
                                <div>
                                    <div className="deal-product-search__name">{p.name}</div>
                                    {p.sku && <div className="deal-product-search__sku">SKU: {p.sku}</div>}
                                </div>
                                <span className="deal-product-search__price">{p.price} ₴</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="deal-items-footer">
                <div className="deal-items-footer__row">
                    <span>Підсумок</span>
                    <span className="num">{orderAmounts.netSubtotal.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴</span>
                </div>
                {parseDiscountPercent(draft.discount) > 0 && (
                    <div className="deal-items-footer__row">
                        <span>Знижка {parseDiscountPercent(draft.discount)} %</span>
                        <span className="num">
                            −{(orderAmounts.netSubtotal - orderAmounts.netAfterDiscount).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                        </span>
                    </div>
                )}
                {orderAmounts.appliesVat && (
                    <div className="deal-items-footer__row deal-items-footer__row--muted">
                        <span>у т. ч. ПДВ {orderAmounts.vatPercent} %</span>
                        <span className="num">{orderAmounts.vatAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴</span>
                    </div>
                )}
                <div className="deal-items-footer__row deal-items-footer__row--total">
                    <span>Разом</span>
                    <span className="num">{orderAmounts.total.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴</span>
                </div>
            </div>
        </div>
    );
}
