import { DEFAULT_SELLER_ID, SELLER_OPTIONS, getRentalLessor } from '../../../../constants/sellers';
import { DELIVERY_LABELS, PAYMENT_LABELS } from '../../amounts/orderHelpers';
import { parseDiscountValue } from '../../amounts/orderAmounts';

const money = (value) => Number(value || 0).toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Earliest rentFrom among rent lines + the deal's rentStartTime — "Видача". */
function resolveIssueMoment(draft, rentProductIds) {
    const dates = (draft.items || [])
        .filter((item) => item.isRent || rentProductIds?.has?.(item.id))
        .map((item) => item.rentFrom)
        .filter(Boolean)
        .sort();
    if (!dates.length) return null;
    const [y, m, d] = dates[0].split('-');
    const date = `${d}.${m}.${y}`;
    return draft.rentStartTime ? `${date}, ${draft.rentStartTime}` : date;
}

function resolveTotalDeposit(draft, rentProductIds) {
    return (draft.items || [])
        .filter((item) => item.isRent || rentProductIds?.has?.(item.id))
        .reduce((sum, item) => sum + (parseFloat(item.depositAmount) || 0), 0);
}

export default function OrderDeliveryPaymentCard({
    draft,
    setField,
    hasRent = false,
    rentProductIds,
}) {
    const lessor = getRentalLessor(draft.sellerId || DEFAULT_SELLER_ID);
    const issueMoment = hasRent ? resolveIssueMoment(draft, rentProductIds) : null;
    const deposit = hasRent ? resolveTotalDeposit(draft, rentProductIds) : 0;

    return (
        <div className="ds-card deal-card">
            <div className="ds-card-h"><h2>Доставка та оплата</h2></div>
            <div className="ds-card-b">
                <dl className="ds-field-list">
                    <div className="ds-field">
                        <dt>Продавець</dt>
                        <dd>
                            <select value={draft.sellerId || DEFAULT_SELLER_ID} onChange={(e) => setField('sellerId', e.target.value)}>
                                {SELLER_OPTIONS.map((seller) => (
                                    <option key={seller.id} value={seller.id}>{seller.label}</option>
                                ))}
                            </select>
                            {hasRent && <span className="deal-card__hint">{lessor.name} · ІПН {lessor.ipn}</span>}
                        </dd>
                    </div>
                    <div className="ds-field">
                        <dt>Доставка</dt>
                        <dd>
                            <select value={draft.deliveryMethod || 'pickup'} onChange={(e) => setField('deliveryMethod', e.target.value)}>
                                {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </dd>
                    </div>
                    {draft.deliveryMethod === 'delivery' && (
                        <div className="ds-field">
                            <dt>Адреса доставки</dt>
                            <dd><input type="text" placeholder="Місто, вулиця, будинок" value={draft.address || ''} onChange={(e) => setField('address', e.target.value)} /></dd>
                        </div>
                    )}
                    <div className="ds-field">
                        <dt>Оплата</dt>
                        <dd>{PAYMENT_LABELS[draft.paymentMethod] || draft.paymentMethod || '—'}</dd>
                    </div>
                    <div className="ds-field">
                        <dt>Знижка</dt>
                        <dd>
                            <div className="rental-discount-controls">
                                <select
                                    value={draft.discountType === 'fixed' ? 'fixed' : 'percent'}
                                    onChange={(e) => setField('discountType', e.target.value)}
                                    className="rental-discount-type"
                                >
                                    <option value="percent">%</option>
                                    <option value="fixed">₴</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    max={draft.discountType === 'fixed' ? undefined : 100}
                                    step="0.5"
                                    value={parseDiscountValue(draft.discount, draft.discountType)}
                                    onChange={(e) => setField('discount', e.target.value)}
                                    className="rental-discount-value"
                                />
                            </div>
                            {hasRent && <span className="deal-card__hint">Діє і на замовлення, і на документи оренди</span>}
                        </dd>
                    </div>

                    {hasRent && (
                        <>
                            <div className="ds-field">
                                <dt>Час видачі</dt>
                                <dd>
                                    <input
                                        type="time"
                                        value={draft.rentStartTime || ''}
                                        onChange={(e) => setField('rentStartTime', e.target.value || null)}
                                    />
                                    {issueMoment && <span className="deal-card__hint mono">{issueMoment}</span>}
                                </dd>
                            </div>
                            <div className="ds-field">
                                <dt>Застава</dt>
                                <dd className="num">{money(deposit)} ₴</dd>
                            </div>
                        </>
                    )}
                </dl>
            </div>
        </div>
    );
}
