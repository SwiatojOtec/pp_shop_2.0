import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { suppliersApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import '../company/company.css';

const EMPTY = {
    name: '', contactPerson: '', phone: '', email: '',
    warehouseAddress: '', officeAddress: '', discountPercent: '', notes: '',
    isActive: true,
};

function fromSupplier(s) {
    const out = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
        if (s[key] != null) out[key] = s[key];
    }
    return out;
}

/** Create/edit form for a Supplier (постачальник товарів). */
export default function SupplierFormModal({ open, supplier, onClose, onSaved }) {
    const { showToast } = useToast();
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const editingId = supplier?.id ?? null;

    useEffect(() => {
        if (!open) return;
        setForm(supplier ? fromSupplier(supplier) : EMPTY);
    }, [open, supplier]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const setBool = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }));

    async function handleSave() {
        if (!form.name.trim()) {
            showToast('Вкажіть назву постачальника', 'warning');
            return;
        }
        setSaving(true);
        try {
            const saved = editingId ? await suppliersApi.update(editingId, form) : await suppliersApi.create(form);
            onSaved(saved);
        } catch (e) {
            showToast(e.message || 'Помилка збереження постачальника', 'warning');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editingId ? 'Редагувати постачальника' : 'Новий постачальник'}
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
            <div className="seller-form-grid">
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Назва *
                        <input value={form.name} onChange={set('name')} placeholder="ТОВ «Постачальник»" />
                    </label>
                    <label className="seller-form-field">
                        Контактна особа
                        <input value={form.contactPerson} onChange={set('contactPerson')} />
                    </label>
                </div>

                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Телефон
                        <input value={form.phone} onChange={set('phone')} />
                    </label>
                    <label className="seller-form-field">
                        E-mail
                        <input type="email" value={form.email} onChange={set('email')} />
                    </label>
                </div>

                <label className="seller-form-field">
                    Адреса складу
                    <textarea value={form.warehouseAddress} onChange={set('warehouseAddress')} rows={2} />
                </label>
                <label className="seller-form-field">
                    Адреса офісу
                    <textarea value={form.officeAddress} onChange={set('officeAddress')} rows={2} />
                </label>

                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Знижка на закупівлю, %
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            className="mono"
                            value={form.discountPercent}
                            onChange={set('discountPercent')}
                        />
                    </label>
                    <label className="seller-form-checkbox seller-form-field">
                        <input type="checkbox" checked={form.isActive} onChange={setBool('isActive')} />
                        Активний
                    </label>
                </div>

                <label className="seller-form-field">
                    Примітки
                    <textarea value={form.notes} onChange={set('notes')} rows={3} />
                </label>
            </div>
        </Modal>
    );
}
