import { useEffect, useState, useRef, useCallback } from 'react';
import { Edit2, Plus, Trash2, X, Phone, Mail, MapPin, Search, User, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminPageHeader, ConfirmDialog } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { clientsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { parsePhones, normalizePhonesField } from '../../utils/phoneUtils';
import './Admin.css';

const EMPTY = {
    fullName: '', phone: '', email: '', passport: '', passportIssuedAt: '', ipn: '',
    address: '', siteAddress: '', discountPercent: '', notes: '', claims: '',
};

export default function AdminClients() {
    const navigate  = useNavigate();
    const { user } = useAuth();
    const canCreateShopOrders = user?.role !== 'rent' && user?.role !== 'pivdenbud';

    const [clients,    setClients]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [editingId,  setEditingId]  = useState(null);
    const [form,       setForm]       = useState(EMPTY);
    const [modalOpen,  setModalOpen]  = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const debounceRef = useRef(null);

    const loadClients = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const params = q ? { q } : undefined;
            const data = await clientsApi.list(params);
            setClients(Array.isArray(data) ? data : []);
        } catch {
            setClients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadClients(); }, [loadClients]);

    // Live search with debounce
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => loadClients(search.trim()), 300);
        return () => clearTimeout(debounceRef.current);
    }, [search, loadClients]);

    const openCreate = () => { setEditingId(null); setForm(EMPTY); setModalOpen(true); };
    const startEdit  = (c) => {
        setEditingId(c.id);
        setForm({ fullName: c.fullName || '', phone: c.phone || '', email: c.email || '',
                  passport: c.passport || '', passportIssuedAt: c.passportIssuedAt || '', ipn: c.ipn || '',
                  address: c.address || '', siteAddress: c.siteAddress || '',
                  discountPercent: c.discountPercent ?? '', notes: c.notes || '', claims: c.claims || '' });
        setModalOpen(true);
    };
    const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(EMPTY); };

    const saveClient = async () => {
        if (!form.fullName.trim() || !form.phone.trim()) { alert('Заповніть ПІБ і телефон'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                phone: normalizePhonesField(form.phone),
                discountPercent: form.discountPercent === '' ? 0 : Number(form.discountPercent),
            };
            if (editingId) {
                await clientsApi.update(editingId, payload);
            } else {
                await clientsApi.create(payload);
            }
            closeModal();
            await loadClients(search.trim());
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await clientsApi.remove(deleteTarget.id);
            await loadClients(search.trim());
        } catch (e) {
            alert(e.message || 'Помилка видалення');
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div>
            <AdminPageHeader
                title="Клієнти"
                subtitle={loading ? '' : `${clients.length} клієнтів`}
                actions={
                    <Button onClick={openCreate}>
                        <Plus size={16} /> Новий клієнт
                    </Button>
                }
            />

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                    type="text"
                    placeholder="Пошук за ПІБ, телефоном, email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.9rem', background: 'white' }}
                />
            </div>

            {/* Table */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Клієнт</th>
                            <th>Контакти</th>
                            <th>Знижка</th>
                            <th>Адреса майданчика</th>
                            <th style={{ textAlign: 'right' }}>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="admin-table-empty">Завантаження...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan="5" className="admin-table-empty">Клієнтів не знайдено</td></tr>
                        ) : clients.map(c => {
                            const phones = parsePhones(c.phone);
                            const discount = Number(c.discountPercent || 0);
                            return (
                                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/clients/${c.id}`)}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                            {c.claims && String(c.claims).trim() && (
                                                <span
                                                    title="Є претензії"
                                                    style={{ flexShrink: 0, color: '#b45309', marginTop: '2px' }}
                                                    aria-label="Претензії"
                                                >
                                                    <AlertTriangle size={17} />
                                                </span>
                                            )}
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 700 }}>{c.fullName}</div>
                                                {c.notes && (
                                                    <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '2px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.notes}>
                                                        {c.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {phones.map((p, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.88rem' }}>
                                                <Phone size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                                <a href={`tel:${p}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{p}</a>
                                            </div>
                                        ))}
                                        {c.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                                <Mail size={12} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{c.email}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {discount > 0
                                            ? <Badge variant="success">{discount.toFixed(0)}%</Badge>
                                            : <span style={{ color: '#d1d5db' }}>—</span>}
                                    </td>
                                    <td style={{ color: '#6b7280', fontSize: '0.88rem' }}>
                                        {c.siteAddress
                                            ? <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                <MapPin size={12} style={{ color: '#9ca3af', flexShrink: 0, marginTop: '3px' }} />
                                                <span>{c.siteAddress}</span>
                                              </div>
                                            : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                                            {canCreateShopOrders && (
                                                <Link
                                                    to={`/admin/orders?newClientId=${c.id}`}
                                                    className="action-btn"
                                                    title="Нове замовлення магазину"
                                                    style={{ color: '#0369a1' }}
                                                >
                                                    <ShoppingCart size={15} />
                                                </Link>
                                            )}
                                            <button className="action-btn" onClick={() => startEdit(c)} title="Редагувати"><Edit2 size={15} /></button>
                                            <button className="action-btn delete" onClick={() => setDeleteTarget(c)} title="Видалити"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="admin-modal-overlay" onClick={closeModal}>
                    <div className="admin-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                                {editingId ? 'Редагувати клієнта' : 'Новий клієнт'}
                            </h2>
                            <button className="action-btn" onClick={closeModal}><X size={14} /></button>
                        </div>

                        <div className="admin-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>П.І.Б. *</label>
                                    <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Прізвище Ім'я По-батькові" />
                                </div>
                                <div className="form-group">
                                    <label>Телефон * <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.78rem' }}>(можна кілька через пробіл)</span></label>
                                    <input
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        onBlur={e => setForm({ ...form, phone: normalizePhonesField(e.target.value) })}
                                        placeholder="380670064044, 380501234567"
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Паспорт</label>
                                    <input value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} placeholder="Серія та номер, напр. AA 123456" />
                                </div>
                                <div className="form-group">
                                    <label>Дата видачі паспорта</label>
                                    <input value={form.passportIssuedAt} onChange={e => setForm({ ...form, passportIssuedAt: e.target.value })} placeholder="ДД.ММ.РРРР" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>ІПН</label>
                                    <input value={form.ipn} onChange={e => setForm({ ...form, ipn: e.target.value })} placeholder="10 цифр" />
                                </div>
                                <div className="form-group">
                                    <label>E-mail</label>
                                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Адреса проживання</label>
                                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Адреса майданчика</label>
                                    <input value={form.siteAddress} onChange={e => setForm({ ...form, siteAddress: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row" style={{ alignItems: 'flex-start' }}>
                                <div className="form-group" style={{ maxWidth: '160px', flexShrink: 0 }}>
                                    <label>Знижка, %</label>
                                    <input type="number" min="0" max="100" step="0.5" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} placeholder="0" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Нотатки</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            placeholder="Особливості, умови, коментарі..."
                                            rows={3}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label>Претензії</label>
                                        <textarea
                                            value={form.claims}
                                            onChange={e => setForm({ ...form, claims: e.target.value })}
                                            placeholder="Претензії, інциденти — позначка в списку клієнтів"
                                            rows={3}
                                            style={{ resize: 'vertical' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <Button onClick={() => saveClient()} disabled={saving}>
                                {saving ? 'Збереження...' : 'Зберегти'}
                            </Button>
                            <Button variant="secondary" onClick={closeModal}>Скасувати</Button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити клієнта?"
                message={deleteTarget ? `Видалити «${deleteTarget.fullName}»? Всі пов'язані заявки залишаться, але посилання на клієнта буде знято.` : ''}
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
