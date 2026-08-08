import { Button } from '../../../../components/ui/button';
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
    if (!open) return null;

    return (
        <div className="od-contract-modal-backdrop" onClick={() => !contractSaving && onClose()}>
            <div className="od-contract-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="od-contract-modal__title">
                    Даних для створення не вистачає, будь ласка заповніть поля:
                </h3>
                <form onSubmit={onSubmit} className="od-contract-modal__form">
                    {contractMissingFields.map((field) => (
                        <div className="form-group" key={field.key}>
                            <label>{field.label}</label>
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
                        </div>
                    ))}
                    <div className="od-contract-modal__actions">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={contractSaving}>
                            Скасувати
                        </Button>
                        <Button type="submit" disabled={contractSaving}>
                            {contractSaving ? 'Зберігаємо…' : 'Зберегти і сформувати PDF'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
