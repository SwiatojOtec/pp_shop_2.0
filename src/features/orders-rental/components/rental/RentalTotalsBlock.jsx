export default function RentalTotalsBlock({
    totalRental,
    discountType,
    discountValue,
    onDiscountTypeChange,
    onDiscountValueChange,
    discountAmount,
    totalRentalAfterDiscount,
    totalDeposit,
    grandTotal,
}) {
    return (
        <div className="rental-footer-grid">
            <div className="rental-totals rental-totals--row">
                <div className="total-row">
                    <span>Загальна сума оренди:</span>
                    <strong>{totalRental.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                </div>
                <div className="total-row" style={{ gap: '10px', flexWrap: 'wrap' }}>
                    <span>Знижка:</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                            value={discountType}
                            onChange={e => onDiscountTypeChange(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd' }}
                        >
                            <option value="fixed">₴</option>
                            <option value="percent">%</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            max={discountType === 'percent' ? 100 : undefined}
                            step="0.01"
                            value={discountValue}
                            onChange={e => onDiscountValueChange(e.target.value)}
                            placeholder={discountType === 'percent' ? '0-100' : '0.00'}
                            style={{ width: '100px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>
                    <strong style={{ marginLeft: 'auto', color: '#b91c1c' }}>
                        -{discountAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
                    </strong>
                </div>
                <div className="total-row">
                    <span>Оренда зі знижкою:</span>
                    <strong>{totalRentalAfterDiscount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                </div>
                <div className="total-row">
                    <span>Загальна застава:</span>
                    <strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                </div>
                <div className="total-row total-row--grand">
                    <span>До сплати (оренда зі знижкою + застава):</span>
                    <strong>{grandTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                </div>
            </div>
        </div>
    );
}
