import { Plus, X } from 'lucide-react';
import { normalizeUaPhone } from '../../../../utils/phoneUtils';
import { getRentalLessor } from '../../../../constants/sellers';

const CLIENT_FIELDS = [
    { label: 'П.І.Б.', field: 'name', placeholder: "Прізвище Ім'я По-батькові" },
    { label: 'Телефон', field: 'phone', placeholder: '380670064044' },
    { label: 'E-mail', field: 'email', placeholder: 'email@example.com' },
    { label: 'Паспорт / ID', field: 'passport', placeholder: 'Серія, номер або ID-картка' },
    { label: 'Адреса проживання', field: 'address', placeholder: 'вул. Прикладна, 1, м. Київ' },
    { label: 'Адреса майданчика', field: 'siteAddress', placeholder: 'Адреса будівельного майданчика' },
];

export default function RentalPartiesSection({
    clients,
    selectedClientId,
    onClientSelect,
    client,
    onClientChange,
    responsible,
    onResponsibleChange,
    onAddResponsible,
    onRemoveResponsible,
    sellerId,
}) {
    const lessor = getRentalLessor(sellerId);
    return (
        <div className="rental-parties-grid">
            <div className="rental-party-block">
                <h3 className="party-title">Орендодавець</h3>
                <div className="party-field"><span>П.І.Б.:</span><strong>{lessor.name}</strong></div>
                <div className="party-field"><span>ІПН:</span>{lessor.ipn}</div>
                <div className="party-field"><span>Адреса:</span>{lessor.address}</div>
                <div className="party-field"><span>Телефон:</span>{lessor.phone}</div>
                <div className="party-field"><span>E-mail:</span>{lessor.email}</div>
                <div className="party-field"><span>Адреса складу:</span>{lessor.warehouseAddress}</div>
            </div>

            <div className="rental-party-block">
                <h3 className="party-title">Орендар</h3>
                <div className="rental-party-select-wrap">
                    <select
                        value={selectedClientId}
                        onChange={e => onClientSelect(e.target.value)}
                        className="rental-party-select"
                    >
                        <option value="">Обрати клієнта з бази (опціонально)</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.fullName} · {c.phone}
                                {Number(c.discountPercent || 0) > 0 ? ` · знижка ${Number(c.discountPercent).toFixed(0)}%` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                {CLIENT_FIELDS.map(({ label, field, placeholder }) => (
                    <div key={field} className="party-field editable">
                        <span>{label}:</span>
                        <input
                            value={client[field]}
                            onChange={e => onClientChange(field, e.target.value)}
                            onBlur={field === 'phone'
                                ? (e) => onClientChange('phone', normalizeUaPhone(e.target.value))
                                : undefined}
                            placeholder={placeholder}
                        />
                    </div>
                ))}

                {responsible.length > 0 && (
                    <div className="rental-responsible-block">
                        <div className="party-title rental-responsible-title">Відповідальні особи</div>
                        {responsible.map((r, i) => (
                            <div key={i} className="rental-responsible-row">
                                <input
                                    value={r.name}
                                    onChange={e => onResponsibleChange(i, 'name', e.target.value)}
                                    placeholder="П.І.Б. відповідальної особи"
                                    className="rental-responsible-input rental-responsible-input--name"
                                />
                                <input
                                    value={r.phone}
                                    onChange={e => onResponsibleChange(i, 'phone', e.target.value)}
                                    onBlur={e => onResponsibleChange(i, 'phone', normalizeUaPhone(e.target.value))}
                                    placeholder="380670064044"
                                    className="rental-responsible-input rental-responsible-input--phone"
                                />
                                <button
                                    onClick={() => onRemoveResponsible(i)}
                                    className="rental-responsible-remove-btn"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={onAddResponsible} className="rental-add-responsible-btn">
                    <Plus size={13} /> Додати відповідальну особу
                </button>
            </div>
        </div>
    );
}
