import { Link } from 'react-router-dom';
import { UserCheck, UserPlus, Loader2, Plus, X } from 'lucide-react';
import { isValidUaPhone, normalizeUaPhone } from '../../../../utils/phoneUtils';

export default function OrderClientCard({
    draft,
    setField,
    linkedClient,
    phoneMatch,
    clientLookupLoading,
    linkingClient,
    addingClient,
    onLinkClient,
    onAddClient,
    hasRent = false,
    rentalExtras = null,
    onRentalExtraChange,
    onResponsibleChange,
    onAddResponsible,
    onRemoveResponsible,
}) {
    function renderClientDbStatus() {
        const phone = normalizeUaPhone(draft?.customerPhone || '');

        if (clientLookupLoading) {
            return (
                <div className="deal-client-status">
                    <Loader2 size={14} className="animate-spin" /> Перевіряємо базу клієнтів…
                </div>
            );
        }

        const knownClient = linkedClient || phoneMatch;
        if (knownClient) {
            const isLinked = !!draft.clientId;
            return (
                <div className="deal-client-status deal-client-status--linked">
                    <UserCheck size={14} />
                    <span>
                        {isLinked ? 'З бази' : 'Є в базі'}
                        {knownClient.fullName ? ` — ${knownClient.fullName}` : ''}.
                    </span>
                    {!isLinked && (
                        <button
                            type="button"
                            className="ds-btn ds-btn--secondary ds-btn--sm"
                            onClick={() => onLinkClient(knownClient.id)}
                            disabled={linkingClient}
                        >
                            {linkingClient ? 'Прив\'язуємо…' : 'Прив\'язати'}
                        </button>
                    )}
                </div>
            );
        }

        if (!isValidUaPhone(phone)) return null;

        return (
            <div className="deal-client-status">
                <UserPlus size={14} />
                <span>Цього клієнта немає в базі. Додати?</span>
                <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm" onClick={onAddClient} disabled={addingClient}>
                    {addingClient ? 'Додаємо…' : 'Додати'}
                </button>
            </div>
        );
    }

    const extras = rentalExtras || {};
    const responsible = Array.isArray(extras.responsible) ? extras.responsible : [];
    const knownClient = linkedClient || phoneMatch;

    return (
        <div className="ds-card deal-card">
            <div className="ds-card-h">
                <h2>{hasRent ? 'Клієнт / Орендар' : 'Клієнт'}</h2>
                {!!draft.clientId && <span className="ds-badge ds-badge--success">З бази</span>}
            </div>
            <div className="ds-card-b">
                <dl className="ds-field-list">
                    <div className="ds-field">
                        <dt>П.І.Б.</dt>
                        <dd><input type="text" value={draft.customerName || ''} onChange={(e) => setField('customerName', e.target.value)} /></dd>
                    </div>
                    <div className="ds-field">
                        <dt>Телефон</dt>
                        <dd>
                            <input
                                type="text"
                                inputMode="numeric"
                                placeholder="380670064044"
                                value={draft.customerPhone || ''}
                                onChange={(e) => setField('customerPhone', e.target.value)}
                                onBlur={(e) => setField('customerPhone', normalizeUaPhone(e.target.value))}
                            />
                        </dd>
                    </div>
                    <div className="ds-field">
                        <dt>Email</dt>
                        <dd><input type="email" value={draft.customerEmail || ''} onChange={(e) => setField('customerEmail', e.target.value)} placeholder="email@example.com" /></dd>
                    </div>
                    {hasRent && onRentalExtraChange && (
                        <>
                            <div className="ds-field">
                                <dt>Паспорт / ID</dt>
                                <dd><input type="text" placeholder="Серія, номер або ID-картка" value={extras.passport || ''} onChange={(e) => onRentalExtraChange('passport', e.target.value)} /></dd>
                            </div>
                            {knownClient?.ipn && (
                                <div className="ds-field">
                                    <dt>ІПН</dt>
                                    <dd className="mono">{knownClient.ipn}</dd>
                                </div>
                            )}
                            <div className="ds-field">
                                <dt>Майданчик</dt>
                                <dd><input type="text" placeholder="Адреса будівельного майданчика" value={extras.siteAddress || ''} onChange={(e) => onRentalExtraChange('siteAddress', e.target.value)} /></dd>
                            </div>
                        </>
                    )}
                </dl>

                {hasRent && onAddResponsible && (
                    <div className="deal-responsible">
                        <div className="deal-responsible__label">Відповідальні особи</div>
                        {responsible.map((person, index) => (
                            <div key={index} className="deal-responsible__row">
                                <input value={person.name || ''} onChange={(e) => onResponsibleChange(index, 'name', e.target.value)} placeholder="П.І.Б." />
                                <input
                                    value={person.phone || ''}
                                    onChange={(e) => onResponsibleChange(index, 'phone', e.target.value)}
                                    onBlur={(e) => onResponsibleChange(index, 'phone', normalizeUaPhone(e.target.value))}
                                    placeholder="380670064044"
                                />
                                <button type="button" className="ds-icon-btn" onClick={() => onRemoveResponsible(index)} title="Прибрати">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <button type="button" className="deal-responsible__add" onClick={onAddResponsible}>
                            <Plus size={13} /> Додати відповідальну особу
                        </button>
                    </div>
                )}

                {renderClientDbStatus()}

                {knownClient && (
                    <Link to={`/admin/clients/${knownClient.id}`} className="ds-btn ds-btn--secondary ds-btn--sm deal-card__link-btn">
                        Відкрити картку
                    </Link>
                )}
            </div>
        </div>
    );
}
