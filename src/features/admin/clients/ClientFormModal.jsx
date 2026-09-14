import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Switch from '../ui/Switch';
import { clientsApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { normalizeUaPhone } from '../../../utils/phoneUtils';
import './clients.css';

const EMPTY = {
    fullName: '', clientType: 'individual',
    phone: '', phoneSecondary: '', phoneEmergency: '',
    email: '', passport: '', passportIssuedAt: '', ipn: '',
    bankName: '', bankAccount: '',
    address: '', siteAddress: '', discountPercent: '', notes: '',
    isRegularClient: false, hasComplaint: false, isGoodClient: false, isBlacklisted: false,
};

function fromClient(c) {
    return {
        fullName: c.fullName || '', clientType: c.clientType || 'individual',
        phone: c.phone || '', phoneSecondary: c.phoneSecondary || '', phoneEmergency: c.phoneEmergency || '',
        email: c.email || '',
        passport: c.passport || '', passportIssuedAt: c.passportIssuedAt || '', ipn: c.ipn || '',
        bankName: c.bankName || '', bankAccount: c.bankAccount || '',
        address: c.address || '', siteAddress: c.siteAddress || '',
        discountPercent: c.discountPercent ?? '', notes: c.notes || '',
        isRegularClient: !!c.isRegularClient, hasComplaint: !!c.hasComplaint,
        isGoodClient: !!c.isGoodClient, isBlacklisted: !!c.isBlacklisted,
    };
}

const CLIENT_TYPE_OPTIONS = [
    { value: 'individual', label: 'Фіз особа' },
    { value: 'fop', label: 'ФОП' },
    { value: 'tov', label: 'ТОВ' },
];

/**
 * Create/edit form shared by the clients list and the client details page —
 * both need the exact same fields and save logic.
 *
 * Props:
 *   open     – boolean
 *   client   – client being edited, or null/undefined to create a new one
 *   onClose  – called to dismiss without saving
 *   onSaved  – called with the created/updated client after a successful save
 */
export default function ClientFormModal({ open, client, onClose, onSaved }) {
    const { showToast } = useToast();
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const editingId = client?.id ?? null;
    const isOrg = form.clientType === 'tov';

    useEffect(() => {
        if (!open) return;
        setForm(client ? fromClient(client) : EMPTY);
    }, [open, client]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const setFlag = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
    const setPhone = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const blurPhone = (key) => (e) => setForm((prev) => ({ ...prev, [key]: normalizeUaPhone(e.target.value) || e.target.value }));

    async function handleSave() {
        if (!form.fullName.trim() || !form.phone.trim()) {
            showToast(isOrg ? 'Заповніть назву та телефон' : 'Заповніть ПІБ і телефон', 'warning');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                phone: normalizeUaPhone(form.phone) || form.phone,
                phoneSecondary: form.phoneSecondary ? (normalizeUaPhone(form.phoneSecondary) || form.phoneSecondary) : '',
                phoneEmergency: form.phoneEmergency ? (normalizeUaPhone(form.phoneEmergency) || form.phoneEmergency) : '',
                discountPercent: form.discountPercent === '' ? 0 : Number(form.discountPercent),
            };
            const saved = editingId ? await clientsApi.update(editingId, payload) : await clientsApi.create(payload);
            onSaved(saved);
        } catch (e) {
            showToast(e.message || 'Помилка збереження клієнта', 'warning');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editingId ? 'Редагувати клієнта' : 'Новий клієнт'}
            size="lg"
            footer={(
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose} disabled={saving}>
                        Скасувати
                    </button>
                    <button type="button" className="ds-btn ds-btn--primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Збереження...' : 'Зберегти'}
                    </button>
                </div>
            )}
        >
            <div className="client-modal-form">
                <div className="client-modal-row client-modal-row--tight">
                    <label className="client-modal-field">
                        Тип клієнта
                        <select value={form.clientType} onChange={set('clientType')}>
                            {CLIENT_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="client-modal-field">
                        {isOrg ? 'Назва організації' : 'П.І.Б.'} *
                        <input
                            value={form.fullName}
                            onChange={set('fullName')}
                            placeholder={isOrg ? 'ТОВ «Назва»' : "Прізвище Ім'я По-батькові"}
                        />
                    </label>
                </div>
                <div className="client-modal-row client-modal-row--triple">
                    <label className="client-modal-field">
                        Основний телефон *
                        <input value={form.phone} onChange={setPhone('phone')} onBlur={blurPhone('phone')} placeholder="380670064044" />
                    </label>
                    <label className="client-modal-field">
                        Додатковий номер
                        <input value={form.phoneSecondary} onChange={setPhone('phoneSecondary')} onBlur={blurPhone('phoneSecondary')} placeholder="380501234567" />
                    </label>
                    <label className="client-modal-field">
                        Екстрений номер
                        <input value={form.phoneEmergency} onChange={setPhone('phoneEmergency')} onBlur={blurPhone('phoneEmergency')} placeholder="380931234567" />
                    </label>
                </div>
                <div className="client-modal-row">
                    <label className="client-modal-field">
                        {isOrg ? 'ЄДРПОУ' : 'ІПН'}
                        <input value={form.ipn} onChange={set('ipn')} placeholder={isOrg ? '8 цифр' : '10 цифр'} />
                    </label>
                    <label className="client-modal-field">
                        E-mail
                        <input type="email" value={form.email} onChange={set('email')} />
                    </label>
                </div>
                {!isOrg && (
                    <div className="client-modal-row">
                        <label className="client-modal-field">
                            Паспорт
                            <input value={form.passport} onChange={set('passport')} placeholder="Серія та номер, напр. AA 123456" />
                        </label>
                        <label className="client-modal-field">
                            Дата видачі паспорта
                            <input value={form.passportIssuedAt} onChange={set('passportIssuedAt')} placeholder="ДД.ММ.РРРР" />
                        </label>
                    </div>
                )}
                {isOrg && (
                    <div className="client-modal-row">
                        <label className="client-modal-field">
                            Банк
                            <input value={form.bankName} onChange={set('bankName')} placeholder="Назва банку" />
                        </label>
                        <label className="client-modal-field">
                            Розрахунковий рахунок (IBAN)
                            <input value={form.bankAccount} onChange={set('bankAccount')} placeholder="UA..." />
                        </label>
                    </div>
                )}
                <div className="client-modal-row">
                    <label className="client-modal-field">
                        Адреса проживання
                        <input value={form.address} onChange={set('address')} />
                    </label>
                    <label className="client-modal-field">
                        Адреса майданчика
                        <input value={form.siteAddress} onChange={set('siteAddress')} />
                    </label>
                </div>
                <div className="client-modal-row client-modal-row--tight">
                    <label className="client-modal-field">
                        Знижка, %
                        <input type="number" min="0" max="100" step="0.5" value={form.discountPercent} onChange={set('discountPercent')} placeholder="0" />
                    </label>
                    <label className="client-modal-field">
                        Нотатки
                        <textarea value={form.notes} onChange={set('notes')} placeholder="Особливості, умови, коментарі..." rows={3} />
                    </label>
                </div>
                <div className="client-modal-flags">
                    <label className="client-modal-flag">
                        <Switch checked={form.isRegularClient} onChange={setFlag('isRegularClient')} label="Постійний клієнт" />
                        Постійний клієнт
                    </label>
                    <label className="client-modal-flag">
                        <Switch checked={form.isGoodClient} onChange={setFlag('isGoodClient')} label="Хороший клієнт" />
                        Хороший клієнт
                    </label>
                    <label className="client-modal-flag">
                        <Switch checked={form.hasComplaint} onChange={setFlag('hasComplaint')} label="Претензія до клієнта" />
                        Претензія до клієнта
                    </label>
                    <label className="client-modal-flag">
                        <Switch checked={form.isBlacklisted} onChange={setFlag('isBlacklisted')} label="Клієнт у чорному списку" />
                        Клієнт у чорному списку
                    </label>
                </div>
            </div>
        </Modal>
    );
}
