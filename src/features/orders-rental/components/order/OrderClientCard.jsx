import { Link } from 'react-router-dom';
import { User, UserCheck, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
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
}) {
    function renderClientDbStatus() {
        const phone = normalizeUaPhone(draft?.customerPhone || '');

        if (clientLookupLoading) {
            return (
                <div className="od-client-status od-client-status--checking">
                    <span className="od-client-status__text">
                        <Loader2 size={16} className="animate-spin" />
                        Перевіряємо базу клієнтів…
                    </span>
                </div>
            );
        }

        const knownClient = linkedClient || phoneMatch;
        if (knownClient) {
            const isLinked = !!draft.clientId;
            return (
                <div className="od-client-status od-client-status--linked">
                    <span className="od-client-status__text">
                        <UserCheck size={18} />
                        <span>
                            Цей клієнт вже є в базі
                            {knownClient.fullName ? ` — ${knownClient.fullName}` : ''}.
                            {' '}
                            <Link to={`/admin/clients/${knownClient.id}`} className="od-client-status__link">
                                Відкрити картку →
                            </Link>
                        </span>
                    </span>
                    {!isLinked && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onLinkClient(knownClient.id)}
                            disabled={linkingClient}
                        >
                            {linkingClient ? 'Прив\'язуємо…' : 'Прив\'язати до замовлення'}
                        </Button>
                    )}
                </div>
            );
        }

        if (!isValidUaPhone(phone)) return null;

        return (
            <div className="od-client-status od-client-status--missing">
                <span className="od-client-status__text">
                    <UserPlus size={18} />
                    Цього клієнта немає в базі даних. Бажаєте додати?
                </span>
                <Button size="sm" onClick={onAddClient} disabled={addingClient}>
                    {addingClient ? 'Додаємо…' : 'Додати'}
                </Button>
            </div>
        );
    }

    return (
        <div className="od-card od-card--client">
            <h2 className="od-card__title">
                <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Клієнт
            </h2>
            <div className="order-detail-grid2">
                <div className="form-group">
                    <label>Ім&apos;я</label>
                    <input type="text" value={draft.customerName || ''} onChange={(e) => setField('customerName', e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Телефон</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="380670064044"
                        value={draft.customerPhone || ''}
                        onChange={(e) => setField('customerPhone', e.target.value)}
                        onBlur={(e) => setField('customerPhone', normalizeUaPhone(e.target.value))}
                    />
                </div>
                <div className="form-group form-group--full">
                    <label>Email</label>
                    <input
                        type="email"
                        value={draft.customerEmail || ''}
                        onChange={(e) => setField('customerEmail', e.target.value)}
                        placeholder="email@example.com"
                    />
                </div>
                <div className="form-group form-group--full">
                    <label>Адреса доставки</label>
                    <input
                        type="text"
                        placeholder="Вкажіть адресу або «Самовивіз»"
                        value={draft.address || ''}
                        onChange={(e) => setField('address', e.target.value)}
                    />
                </div>
            </div>
            {renderClientDbStatus()}
        </div>
    );
}
