import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Network, CheckCircle, ShieldOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersApi } from '../../services/api';
import { ROLE_LABELS } from '../../utils/adminRoles';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import '../../features/admin/company/company.css';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS)
    .filter(([value]) => value !== 'owner')
    .map(([value, label]) => ({ value, label }));

const USER_STATUS = {
    active:  { label: 'Активний', tone: 'success' },
    pending: { label: 'Очікує', tone: 'warning' },
    blocked: { label: 'Заблокований', tone: 'danger' },
};

const STATUS_OPTIONS = Object.entries(USER_STATUS).map(([value, meta]) => ({ value, label: meta.label }));

export default function AdminUsers() {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';

    const [users,      setUsers]      = useState([]);
    const [loading,    setLoading]    = useState(true);
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
            list.forEach((u) => { drafts[u.id] = u.role === 'owner' ? 'rent' : (u.role || 'rent'); });
            setRoleDrafts(drafts);
        } catch (err) {
            showToast(err.message, 'warning');
        } finally {
            setLoading(false);
        }
    }

    function updateParams(patch) {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (!value) next.delete(key);
            else next.set(key, value);
        });
        setSearchParams(next, { replace: true });
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

    const pendingUsers = useMemo(() => users.filter((u) => u.status === 'pending'), [users]);
    const activeAndBlocked = useMemo(() => users.filter((u) => u.status !== 'pending').filter((u) => {
        const matchQ = !q
            || `${u.name} ${u.lastName}`.toLowerCase().includes(q.toLowerCase())
            || (u.email || '').toLowerCase().includes(q.toLowerCase());
        const matchRole = !roleFilter || u.role === roleFilter;
        const matchStatus = !statusFilter || u.status === statusFilter;
        return matchQ && matchRole && matchStatus;
    }), [users, q, roleFilter, statusFilter]);
    const pendingCount = pendingUsers.length;

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Користувач',
            render: (_, u) => <span className="company-user-name">{u.name} {u.lastName}</span>,
        },
        { key: 'email', label: 'Email' },
        {
            key: 'role',
            label: 'Роль',
            render: (_, u) => (u.role === 'owner' ? (
                <StatusBadge tone="accent" label={ROLE_LABELS.owner} />
            ) : (
                <div className="company-role-cell">
                    <select
                        value={roleDrafts[u.id] || u.role}
                        onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        className="ds-toolbar-select"
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
                <div className="company-actions-cell">
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

            {pendingCount > 0 && (
                <>
                    <div className="company-banner">
                        {pendingCount} {pendingCount === 1 ? 'новий користувач чекає' : 'нових користувачів чекають'} підтвердження
                    </div>
                    <div className="company-pending-list">
                        {pendingUsers.map((u) => (
                            <div key={u.id} className="company-pending-row">
                                <div className="company-pending-info">
                                    <div className="company-pending-name">{u.name} {u.lastName}</div>
                                    <div className="company-pending-email">{u.email}</div>
                                </div>
                                <div className="company-pending-actions">
                                    <select
                                        value={roleDrafts[u.id] || 'rent'}
                                        onChange={(e) => setRoleDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                                        className="ds-toolbar-select"
                                    >
                                        {ROLE_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => updateUser(u.id, { status: 'active', role: roleDrafts[u.id] || 'rent' })} disabled={busy === u.id}>
                                        <CheckCircle size={14} /> Схвалити
                                    </button>
                                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => setDeleteTarget(u)} disabled={busy === u.id}>
                                        Видалити
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Toolbar
                search={q}
                onSearch={(value) => updateParams({ q: value })}
                placeholder="Пошук за іменем або email..."
                filters={[
                    { key: 'role', label: 'Всі ролі', value: roleFilter, options: ROLE_OPTIONS },
                    { key: 'status', label: 'Всі статуси', value: statusFilter, options: STATUS_OPTIONS },
                ]}
                onFilter={(key, value) => updateParams({ [key]: value })}
            />

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
