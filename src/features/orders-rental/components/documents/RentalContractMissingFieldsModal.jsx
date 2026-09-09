import Modal from '../../../admin/ui/Modal';
import { DEFAULT_SELLER_ID, FOP_SELLER_OPTIONS } from '../../../../constants/sellers';

export default function RentalContractMissingFieldsModal({
    open,
    draft,
    contractMissingFields,
    contractForm,
    setContractForm,
    contractSaving,
    onClose,
    onSubmit,
    setField,
}) {
    return (
        <Modal
            open={open}
            onClose={() => !contractSaving && onClose()}
            title="Даних для створення не вистачає, будь ласка заповніть поля:"
            footer={(
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose} disabled={contractSaving}>
                        Скасувати
                    </button>
                    <button type="submit" form="contract-missing-fields-form" className="ds-btn ds-btn--primary" disabled={contractSaving}>
                        {contractSaving ? 'Зберігаємо…' : 'Зберегти і сформувати PDF'}
                    </button>
                </div>
            )}
        >
            <form onSubmit={onSubmit} id="contract-missing-fields-form" className="deal-modal-stack">
                {contractMissingFields.map((field) => (
                    <label className="deal-modal-field" key={field.key}>
                        {field.label}
                        {field.key === 'sellerId' ? (
                            <select
                                value={contractForm.sellerId || draft?.sellerId || DEFAULT_SELLER_ID}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setContractForm((prev) => ({ ...prev, sellerId: value }));
                                    setField('sellerId', value);
                                }}
                            >
                                {FOP_SELLER_OPTIONS.map((seller) => (
                                    <option key={seller.id} value={seller.id}>
                                        {seller.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={contractForm[field.key] || ''}
                                onChange={(e) => setContractForm((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                }))}
                                placeholder={
                                    field.key === 'passportIssued'
                                        ? 'ДД.ММ.РРРР'
                                        : field.key === 'ipn'
                                            ? '10 цифр'
                                            : ''
                                }
                                required
                            />
                        )}
                    </label>
                ))}
            </form>
        </Modal>
    );
}
