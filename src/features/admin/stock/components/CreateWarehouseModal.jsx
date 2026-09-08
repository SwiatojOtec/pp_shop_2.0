import { useState } from 'react';
import { useToast } from '../../../../context/ToastContext';
import Modal from '../../ui/Modal';
import '../stock.css';

const EMPTY_FORM = { name: '', notes: '' };

export default function CreateWarehouseModal({ open, onClose, onCreate }) {
    const { showToast } = useToast();
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const close = () => {
        if (saving) return;
        setForm(EMPTY_FORM);
        onClose();
    };

    const submit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const created = await onCreate({ name: form.name.trim(), notes: form.notes || null, isActive: true });
            showToast('Склад створено.', 'success');
            setForm(EMPTY_FORM);
            onClose();
            return created;
        } catch (e) {
            showToast(e.message || 'Помилка створення складу', 'warning');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={close}
            title="Новий склад"
            size="sm"
            footer={(
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" disabled={saving} onClick={close}>Скасувати</button>
                    <button type="button" className="ds-btn ds-btn--primary" disabled={saving || !form.name.trim()} onClick={submit}>
                        {saving ? 'Збереження...' : 'Створити склад'}
                    </button>
                </div>
            )}
        >
            <div className="stock-modal-form">
                <label className="stock-modal-field">
                    Назва складу
                    <input
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Наприклад: Склад №2"
                    />
                </label>
                <label className="stock-modal-field">
                    Нотатки
                    <input
                        value={form.notes}
                        onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Опціонально"
                    />
                </label>
            </div>
        </Modal>
    );
}
