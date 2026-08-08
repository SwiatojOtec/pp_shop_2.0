import { Plus, X } from 'lucide-react';
import { RENTAL_LESSOR } from '../../documents/rentalPdfPayload';
import { normalizeUaPhone } from '../../../../utils/phoneUtils';

const LESSOR = RENTAL_LESSOR;

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
}) {
    return (
        <div className="rental-parties-grid">
            <div className="rental-party-block">
                <h3 className="party-title">Орендодавець</h3>
                <div className="party-field"><span>П.І.Б.:</span><strong>{LESSOR.name}</strong></div>
                <div className="party-field"><span>ІПН:</span>{LESSOR.ipn}</div>
                <div className="party-field"><span>Адреса:</span>{LESSOR.address}</div>
                <div className="party-field"><span>Телефон:</span>{LESSOR.phone}</div>
                <div className="party-field"><span>E-mail:</span>{LESSOR.email}</div>
                <div className="party-field"><span>Адреса складу:</span>{LESSOR.warehouseAddress}</div>
            </div>

            <div className="rental-party-block">
                <h3 className="party-title">Орендар</h3>
                <div style={{ marginBottom: '10px' }}>
                    <select
                        value={selectedClientId}
                        onChange={e => onClientSelect(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd' }}
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
                    <div style={{ marginTop: '10px', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                        <div className="party-title" style={{ marginBottom: '8px' }}>Відповідальні особи</div>
                        {responsible.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                <input
                                    value={r.name}
                                    onChange={e => onResponsibleChange(i, 'name', e.target.value)}
                                    placeholder="П.І.Б. відповідальної особи"
                                    style={{ flex: 2, border: 'none', borderBottom: '1px dashed #ddd', padding: '2px 4px', fontSize: '0.88rem', outline: 'none', background: 'transparent' }}
                                />
                                <input
                                    value={r.phone}
                                    onChange={e => onResponsibleChange(i, 'phone', e.target.value)}
                                    onBlur={e => onResponsibleChange(i, 'phone', normalizeUaPhone(e.target.value))}
                                    placeholder="380670064044"
                                    style={{ flex: 1, border: 'none', borderBottom: '1px dashed #ddd', padding: '2px 4px', fontSize: '0.88rem', outline: 'none', background: 'transparent' }}
                                />
                                <button
                                    onClick={() => onRemoveResponsible(i)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: '2px', opacity: 0.6 }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={onAddResponsible}
                    style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px dashed #ddd', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#888', width: '100%', justifyContent: 'center' }}
                >
                    <Plus size={13} /> Додати відповідальну особу
                </button>
            </div>
        </div>
    );
}
