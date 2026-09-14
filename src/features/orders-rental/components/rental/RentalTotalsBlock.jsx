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
    discountLocked = false,
}) {
    return (
        <div className="rental-footer-grid">
            <div className="rental-totals rental-totals--row">
                <div className="total-row">
                    <span>Загальна сума оренди:</span>
                    <strong>{totalRental.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                </div>
                <div className="total-row total-row--discount">
                    <span>Знижка:</span>
                    {discountLocked ? (
                        <span className="rental-discount-locked">
                            {Number(discountValue || 0).toFixed(discountType === 'fixed' ? 2 : 0)}
                            {discountType === 'fixed' ? ' ₴' : '%'} · із замовлення
                        </span>
                    ) : (
                        <div className="rental-discount-controls">
                            <select
                                value={discountType}
                                onChange={e => onDiscountTypeChange(e.target.value)}
                                className="rental-discount-type"
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
                                className="rental-discount-value"
                            />
                        </div>
                    )}
                    <strong className="rental-discount-amount">
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
