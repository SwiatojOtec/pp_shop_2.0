import { Truck } from 'lucide-react';
import { DEFAULT_SELLER_ID, SELLER_OPTIONS, getRentalLessor } from '../../../../constants/sellers';
import { DELIVERY_LABELS, PAYMENT_LABELS } from '../../amounts/orderHelpers';
import { parseDiscountPercent } from '../../amounts/orderAmounts';

export default function OrderDeliveryPaymentCard({
    draft,
    setField,
    hasRent = false,
}) {
    const lessor = getRentalLessor(draft.sellerId || DEFAULT_SELLER_ID);

    return (
        <div className="od-card od-card--delivery">
            <h2 className="od-card__title">
                <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Умови
            </h2>

            <div className="od-readonly-row">
                <span>Спосіб отримання</span>
                <span>{DELIVERY_LABELS[draft.deliveryMethod] || draft.deliveryMethod || '—'}</span>
            </div>
            <div className="od-readonly-row">
                <span>Оплата</span>
                <span>{PAYMENT_LABELS[draft.paymentMethod] || draft.paymentMethod || '—'}</span>
            </div>

            <div className="order-detail-grid2 order-detail-grid2--conditions">
                <div className="form-group">
                    <label>Знижка, %</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={parseDiscountPercent(draft.discount)}
                        onChange={(e) => setField('discount', e.target.value)}
                    />
                    {hasRent && (
                        <span className="form-hint">Діє і на замовлення, і на документи оренди</span>
                    )}
                </div>

                <div className="form-group form-group--full">
                    <label>{hasRent ? 'Орендодавець / Продавець' : 'Продавець'}</label>
                    <select
                        value={draft.sellerId || DEFAULT_SELLER_ID}
                        onChange={(e) => setField('sellerId', e.target.value)}
                    >
                        {SELLER_OPTIONS.map((seller) => (
                            <option key={seller.id} value={seller.id}>
                                {seller.label}
                            </option>
                        ))}
                    </select>
                    {hasRent && (
                        <span className="form-hint">
                            {lessor.name} · ІПН {lessor.ipn}
                        </span>
                    )}
                </div>

                {hasRent && (
                    <div className="form-group form-group--full">
                        <label>Час початку оренди</label>
                        <input
                            type="time"
                            value={draft.rentStartTime || ''}
                            onChange={(e) => setField('rentStartTime', e.target.value || null)}
                            onInput={(e) => setField('rentStartTime', e.target.value || null)}
                        />
                        <span className="form-hint">
                            Той самий час підставиться в «Оренда по» та в документи заявки
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
