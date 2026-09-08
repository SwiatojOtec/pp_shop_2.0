import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Network, CheckCircle, XCircle, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersApi } from '../../services/api';
import PageHeader from '../../features/admin/ui/PageHeader';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import './Admin.css';

const ROLE_OPTIONS = [
    { value: 'rent',         label: 'Менеджер оренди' },
    { value: 'shop_manager', label: 'Менеджер магазину' },
    { value: 'shop_rent',    label: 'Менеджер магазину та оренди' },
    { value: 'pivdenbud',    label: 'ПАН ПІВДЕНЬБУД' },
];

const USER_STATUS = {
    active:  { label: 'Активний', tone: 'success' },
    pending: { label: 'Очікує', tone: 'warning' },
    blocked: { label: 'Заблокований', tone: 'danger' },
};

export default function AdminUsers() {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [users,      setUsers]      = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [error,      setError]      = useState('');
    const [roleDrafts, setRoleDrafts] = useState({});
    const [busy,       setBusy]       = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!token) return;
        loadUsers();
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
            showToast(err.message, 'warning');
        } finally {
            setBusy(null);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await usersApi.remove(deleteTarget.id);
            setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message, 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const pendingUsers = users.filter((u) => u.status === 'pending');
    const activeAndBlocked = users.filter((u) => u.status !== 'pending');
    const pendingCount = pendingUsers.length;

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Користувач',
            render: (_, u) => <div className="font-semibold">{u.name} {u.lastName}</div>,
        },
        { key: 'email', label: 'Email', className: 'text-sm text-gray-500' },
        {
            key: 'role',
            label: 'Роль',
            render: (_, u) => (u.role === 'owner' ? (
                <StatusBadge tone="accent" label="Власник" />
            ) : (
                <div className="flex gap-2 items-center">
                    <select
                        value={roleDrafts[u.id] || u.role}
                        onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        className="ds-toolbar-select w-auto min-w-[150px]"
                    >
                        {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="ds-btn ds-btn--secondary"
                        disabled={(roleDrafts[u.id] || u.role) === u.role || busy === u.id}
                        onClick={() => updateUser(u.id, { role: roleDrafts[u.id] })}
                    >
                        Зберегти
                    </button>
                </div>
            )),
        },
        {
            key: 'status',
            label: 'Статус',
            render: (_, u) => {
                const meta = USER_STATUS[u.status] || { label: u.status, tone: 'neutral' };
                return <StatusBadge tone={meta.tone} label={meta.label} />;
            },
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, u) => (
                <div className="flex gap-2 justify-end">
                    {u.status === 'active' && u.role !== 'owner' && (
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => updateUser(u.id, { status: 'blocked' })} disabled={busy === u.id}>
                            <ShieldOff size={14} /> Заблокувати
                        </button>
                    )}
                    {u.status === 'blocked' && (
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => updateUser(u.id, { status: 'active' })} disabled={busy === u.id}>
                            <CheckCircle size={14} /> Розблокувати
                        </button>
                    )}
                    {u.role !== 'owner' && (
                        <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setDeleteTarget(u)} disabled={busy === u.id}>
                            Видалити
                        </button>
                    )}
                </div>
            ),
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [roleDrafts, busy]);

    return (
        <div>
            <PageHeader
                title="Користувачі"
                subtitle={pendingCount > 0 ? `${pendingCount} очікують підтвердження` : `${users.length} користувачів`}
                actions={(
                    <Link to="/admin/company/subdivisions" className="ds-btn ds-btn--secondary">
                        <Network size={16} /> Підрозділи
                    </Link>
                )}
            />

            {error && <div className="admin-alert error mb-4">{error}</div>}

            {/* Pending approvals — highlighted section */}
            {pendingCount > 0 && (
                <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
                    <p className="font-bold text-sm text-amber-700 mb-3">
                        {pendingCount} {pendingCount === 1 ? 'новий користувач чекає' : 'нових користувачів чекають'} підтвердження
                    </p>
                    <div className="flex flex-col gap-2.5">
                        {pendingUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-3 flex-wrap bg-white px-3.5 py-2.5 rounded-lg border border-amber-200">
                                <div className="flex-1">
                                    <div className="font-semibold text-sm">{u.name} {u.lastName}</div>
                                    <div className="text-xs text-gray-500">{u.email}</div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => updateUser(u.id, { status: 'active', role: 'rent' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Оренда
                                    </button>
                                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => updateUser(u.id, { status: 'active', role: 'shop_manager' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Магазин
                                    </button>
                                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => updateUser(u.id, { status: 'active', role: 'shop_rent' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Магазин + оренда
                                    </button>
                                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => updateUser(u.id, { status: 'active', role: 'pivdenbud' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Пан Південьбуд
                                    </button>
                                    <button type="button" className="ds-btn ds-btn--secondary text-red-500" onClick={() => setDeleteTarget(u)} disabled={busy === u.id}>
                                        <XCircle size={14} /> Відхилити
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DataTable
                columns={columns}
                rows={activeAndBlocked}
                loading={loading}
                emptyTitle="Користувачів немає"
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити користувача?"
                message={deleteTarget ? `Видалити «${deleteTarget.name} ${deleteTarget.lastName}»? Цю дію неможливо скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
