import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { sellersApi } from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import './company.css';

const EMPTY = {
    label: '', type: 'fop', appliesVat: false,
    personName: '', fullName: '', taxIdLabel: 'ІПН', taxId: '', legalAddress: '',
    phone: '', email: '', warehouseAddress: '',
    bankName: '', bankMfo: '', iban: '', signedBy: '',
    rentalContractCity: '', rentalContractEdrDate: '', rentalContractEdrNumber: '',
};

function fromSeller(s) {
    const out = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
        if (s[key] != null) out[key] = s[key];
    }
    return out;
}

/** Create/edit form for a Seller (юрособа-орендодавець/продавець). */
export default function SellerFormModal({ open, seller, onClose, onSaved }) {
    const { showToast } = useToast();
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const editingId = seller?.id ?? null;

    useEffect(() => {
        if (!open) return;
        setForm(seller ? fromSeller(seller) : EMPTY);
    }, [open, seller]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
    const setBool = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }));

    async function handleSave() {
        if (!form.label.trim()) {
            showToast('Вкажіть назву юрособи', 'warning');
            return;
        }
        setSaving(true);
        try {
            const saved = editingId ? await sellersApi.update(editingId, form) : await sellersApi.create(form);
            onSaved(saved);
        } catch (e) {
            showToast(e.message || 'Помилка збереження юрособи', 'warning');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editingId ? 'Редагувати юрособу' : 'Нова юрособа'}
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
                        <input value={form.label} onChange={set('label')} placeholder="ФОП Іванов І.І." />
                    </label>
                    <label className="seller-form-field">
                        Тип
                        <select value={form.type} onChange={set('type')}>
                            <option value="fop">ФОП</option>
                            <option value="tov">ТОВ</option>
                        </select>
                    </label>
                </div>

                <div className="seller-form-checks">
                    <label className="seller-form-checkbox">
                        <input type="checkbox" checked={form.appliesVat} onChange={setBool('appliesVat')} />
                        Платник ПДВ
                    </label>
                </div>

                <div className="seller-form-section-title">Юридичні дані</div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Повна юридична назва
                        <input value={form.fullName} onChange={set('fullName')} placeholder="Фізична особа-підприємець Іванов Іван Іванович" />
                    </label>
                    <label className="seller-form-field">
                        Підписант
                        <input value={form.signedBy} onChange={set('signedBy')} placeholder="Іванов І.І." />
                    </label>
                </div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Мітка ІПН/ЄДРПОУ
                        <select value={form.taxIdLabel} onChange={set('taxIdLabel')}>
                            <option value="ІПН">ІПН</option>
                            <option value="ЄДРПОУ">ЄДРПОУ</option>
                        </select>
                    </label>
                    <label className="seller-form-field">
                        Номер
                        <input value={form.taxId} onChange={set('taxId')} className="mono" />
                    </label>
                </div>
                <label className="seller-form-field">
                    Юридична адреса
                    <textarea value={form.legalAddress} onChange={set('legalAddress')} rows={2} />
                </label>

                <div className="seller-form-section-title">Банк</div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Банк
                        <input value={form.bankName} onChange={set('bankName')} />
                    </label>
                    <label className="seller-form-field">
                        МФО
                        <input value={form.bankMfo} onChange={set('bankMfo')} className="mono" />
                    </label>
                </div>
                <label className="seller-form-field">
                    IBAN
                    <input value={form.iban} onChange={set('iban')} className="mono" />
                </label>

                <div className="seller-form-section-title">Орендодавець (друковані форми оренди)</div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Ім'я орендодавця
                        <input value={form.personName} onChange={set('personName')} placeholder="Іванов Іван Іванович" />
                    </label>
                    <label className="seller-form-field">
                        Телефон
                        <input value={form.phone} onChange={set('phone')} />
                    </label>
                </div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        E-mail
                        <input type="email" value={form.email} onChange={set('email')} />
                    </label>
                    <label className="seller-form-field">
                        Адреса складу видачі
                        <input value={form.warehouseAddress} onChange={set('warehouseAddress')} />
                    </label>
                </div>

                <div className="seller-form-section-title">Договір оренди</div>
                <div className="seller-form-row">
                    <label className="seller-form-field">
                        Місто укладення
                        <input value={form.rentalContractCity} onChange={set('rentalContractCity')} placeholder="м. Київ" />
                    </label>
                    <label className="seller-form-field">
                        Дата запису ЄДР
                        <input value={form.rentalContractEdrDate} onChange={set('rentalContractEdrDate')} placeholder="ДД.ММ.РРРР" />
                    </label>
                </div>
                <label className="seller-form-field">
                    Номер запису ЄДР
                    <input value={form.rentalContractEdrNumber} onChange={set('rentalContractEdrNumber')} className="mono" />
                </label>
            </div>
        </Modal>
    );
}
