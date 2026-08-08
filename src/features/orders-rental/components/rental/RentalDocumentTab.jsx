import { Download, Printer } from 'lucide-react';

export default function RentalDocumentTab({
    applicationNumber,
    client,
    itemsCount,
    totalRentalAfterDiscount,
    totalDeposit,
    grandTotal,
    notes,
    onNotesChange,
    onDownloadApplication,
    onDownloadReturnAct,
    onPrint,
}) {
    return (
        <div className="rental-section">
            <h2>Документ</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onDownloadApplication().catch(console.error)}
                        className="btn-secondary-icon"
                        title="Скачати PDF"
                        style={{ flex: 1, minWidth: '180px' }}
                    >
                        <Download size={18} /> Заявка (PDF)
                    </button>
                    <button
                        onClick={() => onDownloadReturnAct().catch(console.error)}
                        className="btn-secondary-icon"
                        title="Акт повернення-огляду"
                        style={{ flex: 1, minWidth: '180px' }}
                    >
                        <Download size={18} /> Акт повернення (PDF)
                    </button>
                    <button onClick={onPrint} className="btn-secondary-icon" title="Друк" style={{ flex: 1, minWidth: '120px' }}>
                        <Printer size={18} /> Друк
                    </button>
                </div>

                <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
                    <div className="party-field"><span>№ заявки:</span><strong>{applicationNumber || '(буде присвоєно після збереження)'}</strong></div>
                    <div className="party-field"><span>Клієнт:</span><strong>{client.name || '—'}</strong></div>
                    <div className="party-field"><span>Телефон:</span>{client.phone || '—'}</div>
                    <div className="party-field"><span>Позицій:</span>{itemsCount} шт.</div>
                    <div className="party-field"><span>Оренда:</span><strong>{totalRentalAfterDiscount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                    <div className="party-field"><span>Застава:</span><strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                    <div className="party-field" style={{ borderTop: '1px solid #e5e7eb', marginTop: '8px', paddingTop: '8px' }}>
                        <span>Всього:</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--admin-accent)' }}>{grandTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Нотатки</label>
                    <textarea
                        value={notes}
                        onChange={e => onNotesChange(e.target.value)}
                        placeholder="Додаткові умови, примітки, особливості..."
                        rows={4}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: '0.9rem' }}
                    />
                </div>
            </div>
        </div>
    );
}
