import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../admin/ui/Modal';
import { ordersApi } from '../../../../services/api';
import { useToast } from '../../../../context/ToastContext';
import { normalizeUaPhone } from '../../../../utils/phoneUtils';

/**
 * "Нова угода" — мінімум даних (ім'я, телефон), решта (клієнт з бази, товари,
 * доставка/оплата) редагується вже на екрані угоди. Один об'єкт — один екран:
 * без окремого композера, як було раніше в AdminOrders.jsx.
 *
 * `prefillClient` (з /admin/deals?newClientId=... — кнопки "Нове замовлення"
 * на картці клієнта) заповнює поля й одразу лінкує угоду до цього клієнта.
 */
export default function NewDealModal({ open, onClose, prefillClient = null }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(prefillClient?.fullName || '');
        setPhone(prefillClient?.phone ? normalizeUaPhone(prefillClient.phone) : '');
    }, [open, prefillClient]);

    function handleClose() {
        if (saving) return;
        setName('');
        setPhone('');
        onClose();
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            showToast('Вкажіть ім\'я та телефон клієнта', 'warning');
            return;
        }
        setSaving(true);
        try {
            const created = await ordersApi.createAdmin({
                customerName: name.trim(),
                customerPhone: normalizeUaPhone(phone),
                customerEmail: prefillClient?.email || '',
                address: prefillClient?.address || '',
                deliveryMethod: 'pickup',
                paymentMethod: 'invoice',
                items: [],
                totalAmount: 0,
                discount: Number(prefillClient?.discountPercent) || 0,
                clientId: prefillClient?.id || undefined,
            });
            navigate(`/admin/deals/${created.id}`);
        } catch (err) {
            showToast(err.message || 'Не вдалося створити угоду', 'warning');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Нова угода"
            size="sm"
            footer={(
                <div className="ds-confirm-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={handleClose} disabled={saving}>
                        Скасувати
                    </button>
                    <button type="submit" form="new-deal-form" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Створення…' : 'Створити'}
                    </button>
                </div>
            )}
        >
            <form id="new-deal-form" onSubmit={handleSubmit} className="deal-modal-stack">
                {prefillClient && (
                    <p className="deal-modal-hint">Угода буде одразу прив&apos;язана до клієнта {prefillClient.fullName}.</p>
                )}
                <label className="deal-modal-field">
                    Ім&apos;я
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </label>
                <label className="deal-modal-field">
                    Телефон
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="380670064044"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={(e) => setPhone(normalizeUaPhone(e.target.value))}
                    />
                </label>
                <p className="deal-modal-hint">Товари, доставку й оплату можна додати на екрані угоди.</p>
            </form>
        </Modal>
    );
}
