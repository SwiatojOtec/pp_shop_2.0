import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Loader2 } from 'lucide-react';
import Modal from '../../../admin/ui/Modal';
import { ordersApi, clientsApi } from '../../../../services/api';
import { useToast } from '../../../../context/ToastContext';
import { isValidUaPhone, normalizeUaPhone } from '../../../../utils/phoneUtils';

/**
 * "Нова угода" — мінімум даних (ім'я, телефон), решта (клієнт з бази, товари,
 * доставка/оплата) редагується вже на екрані угоди. Один об'єкт — один екран:
 * без окремого композера, як було раніше в AdminOrders.jsx.
 *
 * `prefillClient` (з /admin/deals?newClientId=... — кнопки "Нове замовлення"
 * на картці клієнта) заповнює поля й одразу лінкує угоду до цього клієнта.
 *
 * Без prefillClient телефон перевіряється проти бази клієнтів тим самим
 * /api/clients/lookup, що й на екрані угоди (OrderClientCard) — знайдений
 * клієнт одразу підтягує ім'я (якщо поле ще порожнє) і лінкується до угоди
 * при створенні, без окремого кроку "Прив'язати" вже після створення.
 *
 * Поле "Ім'я" має свій пошук (/api/clients/search) — менеджер часто памʼятає
 * клієнта на ім'я, а не телефон напам'ять; вибір підказки заповнює і
 * телефон, і лінкує клієнта так само, як збіг за телефоном.
 */
export default function NewDealModal({ open, onClose, prefillClient = null }) {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);
    const [phoneMatch, setPhoneMatch] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [nameResults, setNameResults] = useState([]);
    const [nameDropdownOpen, setNameDropdownOpen] = useState(false);
    const latestNameRef = useRef('');

    useEffect(() => {
        if (!open) return;
        setName(prefillClient?.fullName || '');
        setPhone(prefillClient?.phone ? normalizeUaPhone(prefillClient.phone) : '');
        setPhoneMatch(null);
        setNameResults([]);
        setNameDropdownOpen(false);
    }, [open, prefillClient]);

    useEffect(() => {
        if (!open || prefillClient) return undefined;
        const normalized = normalizeUaPhone(phone);
        if (!isValidUaPhone(normalized)) {
            setPhoneMatch(null);
            setLookupLoading(false);
            return undefined;
        }
        setLookupLoading(true);
        const timer = setTimeout(() => {
            clientsApi.lookupByPhone(normalized)
                .then((res) => {
                    const found = res?.found ? res.client : null;
                    setPhoneMatch(found);
                    setName((prev) => (found && !prev.trim() ? found.fullName || '' : prev));
                })
                .catch(() => setPhoneMatch(null))
                .finally(() => setLookupLoading(false));
        }, 400);
        return () => clearTimeout(timer);
    }, [phone, open, prefillClient]);

    // Клієнт уже знайдений за телефоном — підказки за ім'ям тільки заважали б.
    useEffect(() => {
        if (!open || prefillClient || phoneMatch) {
            setNameResults([]);
            return undefined;
        }
        const val = name.trim();
        latestNameRef.current = val;
        if (val.length < 2) {
            setNameResults([]);
            return undefined;
        }
        const timer = setTimeout(() => {
            clientsApi.search(val)
                .then((rows) => {
                    if (latestNameRef.current !== val) return;
                    const list = Array.isArray(rows) ? rows : [];
                    setNameResults(list);
                    setNameDropdownOpen(list.length > 0);
                })
                .catch(() => {
                    if (latestNameRef.current === val) setNameResults([]);
                });
        }, 400);
        return () => clearTimeout(timer);
    }, [name, open, prefillClient, phoneMatch]);

    function selectNameMatch(client) {
        setName(client.fullName || '');
        setPhone(client.phone ? normalizeUaPhone(client.phone) : '');
        setPhoneMatch(client);
        setNameResults([]);
        setNameDropdownOpen(false);
    }

    function handleClose() {
        if (saving) return;
        setName('');
        setPhone('');
        setPhoneMatch(null);
        setNameResults([]);
        setNameDropdownOpen(false);
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
            const client = prefillClient || phoneMatch;
            const created = await ordersApi.createAdmin({
                customerName: name.trim(),
                customerPhone: normalizeUaPhone(phone),
                customerEmail: client?.email || '',
                address: client?.address || '',
                deliveryMethod: 'pickup',
                paymentMethod: 'invoice',
                items: [],
                totalAmount: 0,
                discount: Number(client?.discountPercent) || 0,
                clientId: client?.id || undefined,
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
                <label className="deal-modal-field deal-modal-field--autocomplete">
                    Ім&apos;я
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => { if (nameResults.length > 0) setNameDropdownOpen(true); }}
                        onBlur={() => setTimeout(() => setNameDropdownOpen(false), 150)}
                        autoComplete="off"
                        autoFocus
                    />
                    {nameDropdownOpen && nameResults.length > 0 && (
                        <div className="deal-name-dropdown">
                            {nameResults.map((c) => (
                                <div
                                    key={c.id}
                                    className="deal-name-dropdown-item"
                                    onMouseDown={(e) => { e.preventDefault(); selectNameMatch(c); }}
                                >
                                    <span className="deal-name-dropdown-name">{c.fullName || '—'}</span>
                                    <span className="deal-name-dropdown-phone">{c.phone}</span>
                                </div>
                            ))}
                        </div>
                    )}
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
                {!prefillClient && lookupLoading && (
                    <div className="deal-client-status">
                        <Loader2 size={14} className="animate-spin" /> Перевіряємо базу клієнтів…
                    </div>
                )}
                {!prefillClient && !lookupLoading && phoneMatch && (
                    <div className="deal-client-status deal-client-status--linked">
                        <UserCheck size={14} />
                        <span>Є в базі — {phoneMatch.fullName}. Угоду прив&apos;яжемо до нього.</span>
                    </div>
                )}
                <p className="deal-modal-hint">Товари, доставку й оплату можна додати на екрані угоди.</p>
            </form>
        </Modal>
    );
}
