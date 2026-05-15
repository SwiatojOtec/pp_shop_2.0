import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Network, CheckCircle, XCircle, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select } from '../../components/ui/select';
import './Admin.css';

const ROLE_OPTIONS = [
    { value: 'rent',      label: 'Менеджер оренди' },
    { value: 'manager',   label: 'Менеджер' },
    { value: 'pivdenbud', label: 'ПАН ПІВДЕНЬБУД' },
];

const STATUS_BADGE = {
    active:  <Badge variant="success">Активний</Badge>,
    pending: <Badge variant="warning">Очікує</Badge>,
    blocked: <Badge variant="danger">Заблокований</Badge>,
};

export default function AdminUsers() {
    const { token } = useAuth();
    const [users,      setUsers]      = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [roleDrafts, setRoleDrafts] = useState({});
    const [busy,       setBusy]       = useState(null);

    useEffect(() => {
        if (!token) return;
        loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function loadUsers() {
        setLoading(true);
        try {
            const data = await usersApi.list();
            const list = Array.isArray(data) ? data : [];
            setUsers(list);
            const drafts = {};
            list.forEach((u) => { drafts[u.id] = u.role || 'rent'; });
            setRoleDrafts(drafts);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function updateUser(id, payload) {
        setBusy(id);
        try {
            const updated = await usersApi.update(id, payload);
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setRoleDrafts((prev) => ({ ...prev, [updated.id]: updated.role }));
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(null);
        }
    }

    async function deleteUser(id, name) {
        if (!window.confirm(`Видалити користувача "${name}"? Цю дію неможливо скасувати.`)) return;
        setBusy(id);
        try {
            await usersApi.remove(id);
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(null);
        }
    }

    const pendingCount = users.filter((u) => u.status === 'pending').length;

    return (
        <div>
            <AdminPageHeader
                title="Користувачі"
                subtitle={pendingCount > 0 ? `${pendingCount} очікують підтвердження` : `${users.length} користувачів`}
                actions={
                    <Button variant="secondary" as={Link} asChild>
                        <Link to="/admin/subdivisions" className="no-underline flex items-center gap-2">
                            <Network size={16} /> Підрозділи
                        </Link>
                    </Button>
                }
            />

            {error && <div className="admin-alert error" style={{ marginBottom: '16px' }}>{error}</div>}

            {/* Pending approvals — highlighted section */}
            {pendingCount > 0 && (
                <div style={{ marginBottom: '24px', border: '2px solid #fbbf24', borderRadius: '12px', background: '#fffbeb', padding: '16px 20px' }}>
                    <p className="font-bold text-sm text-amber-700 mb-3">
                        {pendingCount} {pendingCount === 1 ? 'новий користувач чекає' : 'нових користувачів чекають'} підтвердження
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {users.filter((u) => u.status === 'pending').map((u) => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', background: '#fff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                <div style={{ flex: 1 }}>
                                    <div className="font-semibold text-sm">{u.name} {u.lastName}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <Button size="sm" onClick={() => updateUser(u.id, { status: 'active', role: 'rent' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Оренда
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => updateUser(u.id, { status: 'active', role: 'manager' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Менеджер
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={() => updateUser(u.id, { status: 'active', role: 'pivdenbud' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Пан Південьбуд
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteUser(u.id, `${u.name} ${u.lastName}`)} disabled={busy === u.id}>
                                        <XCircle size={14} /> Відхилити
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All users table */}
            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Користувач</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th style={{ textAlign: 'right' }}>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="admin-table-empty">Завантаження...</td></tr>
                        ) : users.filter((u) => u.status !== 'pending').map((u) => (
                            <tr key={u.id}>
                                <td>
                                    <div className="font-semibold">{u.name} {u.lastName}</div>
                                </td>
                                <td className="text-sm text-gray-500">{u.email}</td>
                                <td>
                                    {u.role === 'owner' ? (
                                        <Badge>Власник</Badge>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <Select
                                                value={roleDrafts[u.id] || u.role}
                                                onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                                style={{ width: 'auto', minWidth: '150px' }}
                                            >
                                                {ROLE_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </Select>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled={(roleDrafts[u.id] || u.role) === u.role || busy === u.id}
                                                onClick={() => updateUser(u.id, { role: roleDrafts[u.id] })}
                                            >
                                                Зберегти
                                            </Button>
                                        </div>
                                    )}
                                </td>
                                <td>{STATUS_BADGE[u.status] || u.status}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        {u.status === 'active' && u.role !== 'owner' && (
                                            <Button size="sm" variant="ghost" className="text-orange-500"
                                                onClick={() => updateUser(u.id, { status: 'blocked' })} disabled={busy === u.id}>
                                                <ShieldOff size={14} /> Заблокувати
                                            </Button>
                                        )}
                                        {u.status === 'blocked' && (
                                            <Button size="sm" variant="secondary"
                                                onClick={() => updateUser(u.id, { status: 'active' })} disabled={busy === u.id}>
                                                <CheckCircle size={14} /> Розблокувати
                                            </Button>
                                        )}
                                        {u.role !== 'owner' && (
                                            <Button size="sm" variant="ghost" className="text-red-500"
                                                onClick={() => deleteUser(u.id, `${u.name} ${u.lastName}`)} disabled={busy === u.id}>
                                                Видалити
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && users.filter((u) => u.status !== 'pending').length === 0 && (
                            <tr><td colSpan={5} className="admin-table-empty">Користувачів немає</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
