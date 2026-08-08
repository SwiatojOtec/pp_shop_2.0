import { Truck } from 'lucide-react';
import { DEFAULT_SELLER_ID, SELLER_OPTIONS } from '../../../../constants/sellers';
import { DELIVERY_LABELS, PAYMENT_LABELS } from '../../amounts/orderHelpers';
import { parseDiscountPercent } from '../../amounts/orderAmounts';

export default function OrderDeliveryPaymentCard({ draft, setField }) {
    return (
        <div className="od-card od-card--delivery">
            <h2 className="od-card__title">
                <Truck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Доставка та оплата
            </h2>
            <div className="od-readonly-row">
                <span>Спосіб отримання</span>
                <span>{DELIVERY_LABELS[draft.deliveryMethod] || draft.deliveryMethod || '—'}</span>
            </div>
            <div className="od-readonly-row">
                <span>Оплата</span>
                <span>{PAYMENT_LABELS[draft.paymentMethod] || draft.paymentMethod || '—'}</span>
            </div>
            <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>Знижка, %</label>
                <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={parseDiscountPercent(draft.discount)}
                    onChange={(e) => setField('discount', e.target.value)}
                />
            </div>
            <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                <label>Орендодавець / Продавець</label>
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
            </div>
        </div>
    );
}
