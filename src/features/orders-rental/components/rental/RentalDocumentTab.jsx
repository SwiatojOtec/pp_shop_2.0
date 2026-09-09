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
            <div className="rental-doc-tab-body">
                <div className="rental-doc-actions">
                    <button
                        onClick={() => onDownloadApplication().catch(console.error)}
                        className="btn-secondary-icon"
                        title="Скачати PDF"
                    >
                        <Download size={18} /> Заявка (PDF)
                    </button>
                    <button
                        onClick={() => onDownloadReturnAct().catch(console.error)}
                        className="btn-secondary-icon"
                        title="Акт повернення-огляду"
                    >
                        <Download size={18} /> Акт повернення (PDF)
                    </button>
                    <button onClick={onPrint} className="btn-secondary-icon" title="Друк">
                        <Printer size={18} /> Друк
                    </button>
                </div>

                <div className="rental-doc-summary">
                    <div className="party-field"><span>№ заявки:</span><strong>{applicationNumber || '(буде присвоєно після збереження)'}</strong></div>
                    <div className="party-field"><span>Клієнт:</span><strong>{client.name || '—'}</strong></div>
                    <div className="party-field"><span>Телефон:</span>{client.phone || '—'}</div>
                    <div className="party-field"><span>Позицій:</span>{itemsCount} шт.</div>
                    <div className="party-field"><span>Оренда:</span><strong>{totalRentalAfterDiscount.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                    <div className="party-field"><span>Застава:</span><strong>{totalDeposit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong></div>
                    <div className="party-field party-field--total">
                        <span>Всього:</span>
                        <strong>{grandTotal.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴</strong>
                    </div>
                </div>

                <div>
                    <label className="rental-doc-notes-label">Нотатки</label>
                    <textarea
                        value={notes}
                        onChange={e => onNotesChange(e.target.value)}
                        placeholder="Додаткові умови, примітки, особливості..."
                        rows={4}
                        className="rental-doc-notes-textarea"
                    />
                </div>
            </div>
        </div>
    );
}
