import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, Users, X } from 'lucide-react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

const EMPTY = {
    fullName: '',
    phone: '',
    email: '',
    passport: '',
    address: '',
    siteAddress: '',
    discountPercent: '',
    notes: ''
};

export default function AdminClients() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [modalOpen, setModalOpen] = useState(false);

    const loadClients = async (q = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            const res = await fetch(`${API_URL}/api/clients?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.ok ? await res.json() : [];
            setClients(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        loadClients();
    }, [token]);

    const startEdit = (client) => {
        setEditingId(client.id);
        setForm({
            fullName: client.fullName || '',
            phone: client.phone || '',
            email: client.email || '',
            passport: client.passport || '',
            address: client.address || '',
            siteAddress: client.siteAddress || '',
            discountPercent: client.discountPercent ?? '',
            notes: client.notes || ''
        });
        setModalOpen(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(EMPTY);
    };

    const saveClient = async () => {
        if (!form.fullName.trim() || !form.phone.trim()) {
            alert('Заповніть ПІБ і телефон');
            return;
        }
        const payload = {
            ...form,
            discountPercent: form.discountPercent === '' ? 0 : Number(form.discountPercent)
        };
        const url = editingId ? `${API_URL}/api/clients/${editingId}` : `${API_URL}/api/clients`;
        const method = editingId ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Помилка збереження клієнта');
        }
        closeModal();
        await loadClients(search.trim());
    };

    const removeClient = async (id) => {
        if (!window.confirm('Видалити клієнта?')) return;
        await fetch(`${API_URL}/api/clients/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        await loadClients(search.trim());
    };

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Клієнти</h1>
                <button className="btn btn-primary" onClick={openCreate}>
                    <Plus size={16} /> Новий клієнт
                </button>
            </div>

            <div className="admin-section" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Пошук за ПІБ, телефоном, email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={() => loadClients(search.trim())}>Пошук</button>
                </div>
            </div>

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
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Завантаження...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#999' }}><Users size={20} /> Клієнтів поки немає</td></tr>
                        ) : clients.map(c => (
                            <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/clients/${c.id}`)}>
                                <td style={{ fontWeight: 700 }}>{c.fullName}</td>
                                <td>
                                    <div>{c.phone}</div>
                                    {c.email && <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>{c.email}</div>}
                                </td>
                                <td>{Number(c.discountPercent || 0).toFixed(2)}%</td>
                                <td style={{ color: '#6b7280' }}>{c.siteAddress || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                                        <button className="action-btn" onClick={(e) => { e.stopPropagation(); startEdit(c); }}><Edit2 size={16} /></button>
                                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); removeClient(c.id); }}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="admin-modal-overlay" onClick={closeModal}>
                    <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>
                                {editingId ? 'Редагувати клієнта' : 'Створити клієнта'}
                            </h2>
                            <button className="action-btn" onClick={closeModal}><X size={14} /></button>
                        </div>
                        <div className="admin-form">
                            <div className="form-row">
                                <div className="form-group"><label>П.І.Б.</label><input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
                                <div className="form-group"><label>Телефон</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>E-mail</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                <div className="form-group"><label>Паспорт / ID</label><input value={form.passport} onChange={e => setForm({ ...form, passport: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label>Адреса проживання</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-group"><label>Адреса майданчика</label><input value={form.siteAddress} onChange={e => setForm({ ...form, siteAddress: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Закріплена знижка, %</label>
                                    <input type="number" min="0" max="100" step="0.01" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} />
                                </div>
                                <div className="form-group"><label>Нотатки</label><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button className="btn btn-primary" onClick={() => saveClient().catch(e => alert(e.message))}>Зберегти</button>
                            <button className="btn btn-secondary" onClick={closeModal}>Скасувати</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
