import { Package, Search, X } from 'lucide-react';
import { calcLineDisplayAmounts, parseDiscountPercent } from '../../amounts/orderAmounts';
import { calcDays } from '../../model/rentalItems';

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
}) {
    return (
        <div className="od-card od-card--products">
            <h2 className="od-card__title">
                <Package size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Товари
            </h2>

            <div className="order-item-list">
                {draft.items.map((item, idx) => {
                    const isRentLine = item.isRent || rentProductIds.has(item.id);
                    const line = calcLineDisplayAmounts(item, draft.sellerId, billingOptions);
                    const days = calcDays(item.rentFrom, item.rentTo);
                    return (
                        <div key={idx} className={`order-item-row${isRentLine ? ' order-item-row--rent' : ''}`}>
                            <span className="order-item-row__name">{item.name}</span>
                            {isRentLine ? (
                                <div className="order-item-row__measures">
                                    <div className="order-item-row__qty">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={item.quantity ?? 1}
                                            onChange={(e) => onUpdateQty(idx, e.target.value)}
                                        />
                                        <span className="order-item-row__unit">шт</span>
                                    </div>
                                    <div className="order-item-row__date">
                                        <label>з</label>
                                        <input
                                            type="date"
                                            value={item.rentFrom || ''}
                                            onChange={(e) => onUpdateRentDates(idx, {
                                                rentFrom: e.target.value,
                                                rentTo: item.rentTo || '',
                                            })}
                                        />
                                    </div>
                                    <div className="order-item-row__date">
                                        <label>по</label>
                                        <input
                                            type="date"
                                            value={item.rentTo || ''}
                                            onChange={(e) => onUpdateRentDates(idx, {
                                                rentFrom: item.rentFrom || '',
                                                rentTo: e.target.value,
                                            })}
                                        />
                                    </div>
                                    {days > 0 && (
                                        <span className="order-item-row__days-hint">{days} діб</span>
                                    )}
                                </div>
                            ) : (
                                <div className="order-item-row__qty">
                                    <input
                                        type="number"
                                        min="0"
                                        value={line.quantity ?? item.quantity}
                                        onChange={(e) => onUpdateQty(idx, e.target.value)}
                                    />
                                    <span className="order-item-row__unit">{line.unit || (item.unit === 'м²' ? 'уп.' : 'шт.')}</span>
                                </div>
                            )}
                            <span className="order-item-row__price">
                                {line.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                            </span>
                            <button type="button" className="order-item-row__remove" onClick={() => onRemoveItem(idx)} title="Прибрати">
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
                {!draft.items.length && (
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '0 0 12px' }}>Позицій поки немає</p>
                )}
            </div>

            <div className="order-product-search-wrap">
                <Search size={15} className="order-product-search-icon" />
                <input
                    type="text"
                    className="order-product-search-input"
                    placeholder="Додати товар: введіть назву або артикул..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                />
                {suggestedProducts.length > 0 && (
                    <div className="order-product-suggest">
                        {suggestedProducts.map((p) => (
                            <div key={p.id} className="order-product-suggest__item" onClick={() => onAddItem(p)}>
                                <div>
                                    <div className="font-semibold text-sm">{p.name}</div>
                                    {p.sku && <div className="text-xs text-gray-400">SKU: {p.sku}</div>}
                                </div>
                                <span className="font-bold text-[#e63946]">{p.price} ₴</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="od-footer-bar">
                <div className="od-footer-bar__total">
                    <div>
                        Разом:{' '}
                        <strong>
                            {orderAmounts.total.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{' '}
                            ₴
                        </strong>
                        {parseDiscountPercent(draft.discount) > 0 && (
                            <span className="od-footer-bar__vat">
                                {' '}
                                (знижка {parseDiscountPercent(draft.discount)}%: −
                                {(
                                    (orderAmounts.appliesVat
                                        ? orderAmounts.grossSubtotal - orderAmounts.grossAfterDiscount
                                        : orderAmounts.netSubtotal - orderAmounts.netAfterDiscount)
                                ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{' '}
                                ₴)
                            </span>
                        )}
                        {orderAmounts.appliesVat && (
                            <span className="od-footer-bar__vat">
                                {' '}
                                (в т.ч. ПДВ {orderAmounts.vatPercent}%:{' '}
                                {orderAmounts.vatAmount.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}{' '}
                                ₴)
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
