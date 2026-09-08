import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { clientsApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { normalizePhonesField } from '../../../utils/phoneUtils';
import './clients.css';

const EMPTY = {
    fullName: '', phone: '', email: '', passport: '', passportIssuedAt: '', ipn: '',
    address: '', siteAddress: '', discountPercent: '', notes: '', claims: '',
};

function fromClient(c) {
    return {
        fullName: c.fullName || '', phone: c.phone || '', email: c.email || '',
        passport: c.passport || '', passportIssuedAt: c.passportIssuedAt || '', ipn: c.ipn || '',
        address: c.address || '', siteAddress: c.siteAddress || '',
        discountPercent: c.discountPercent ?? '', notes: c.notes || '', claims: c.claims || '',
    };
}

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

    useEffect(() => {
        if (!open) return;
        setForm(client ? fromClient(client) : EMPTY);
    }, [open, client]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    async function handleSave() {
        if (!form.fullName.trim() || !form.phone.trim()) {
            showToast('Заповніть ПІБ і телефон', 'warning');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                phone: normalizePhonesField(form.phone),
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
                <div className="client-modal-row">
                    <label className="client-modal-field">
                        П.І.Б. *
                        <input value={form.fullName} onChange={set('fullName')} placeholder="Прізвище Ім'я По-батькові" />
                    </label>
                    <label className="client-modal-field">
                        Телефон * <span className="client-modal-hint">(можна кілька через пробіл)</span>
                        <input
                            value={form.phone}
                            onChange={set('phone')}
                            onBlur={(e) => setForm((prev) => ({ ...prev, phone: normalizePhonesField(e.target.value) }))}
                            placeholder="380670064044, 380501234567"
                        />
                    </label>
                </div>
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
                <div className="client-modal-row">
                    <label className="client-modal-field">
                        ІПН
                        <input value={form.ipn} onChange={set('ipn')} placeholder="10 цифр" />
                    </label>
                    <label className="client-modal-field">
                        E-mail
                        <input type="email" value={form.email} onChange={set('email')} />
                    </label>
                </div>
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
                    <div className="client-modal-stack">
                        <label className="client-modal-field">
                            Нотатки
                            <textarea value={form.notes} onChange={set('notes')} placeholder="Особливості, умови, коментарі..." rows={3} />
                        </label>
                        <label className="client-modal-field">
                            Претензії
                            <textarea value={form.claims} onChange={set('claims')} placeholder="Претензії, інциденти — позначка в списку клієнтів" rows={3} />
                        </label>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
