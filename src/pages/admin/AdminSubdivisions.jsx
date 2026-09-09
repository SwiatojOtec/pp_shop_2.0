import { useEffect, useState, useMemo, useCallback } from 'react';
import { Network, Plus, Trash2, Pencil, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subdivisionsApi, usersApi, timesheetApi } from '../../services/api';
import PageHeader from '../../features/admin/ui/PageHeader';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import EmptyState from '../../features/admin/ui/EmptyState';
import { ROLE_LABELS } from '../../utils/adminRoles';
import '../../features/admin/company/company.css';

const MAX_MEMBERS = 30;
const GUEST_OPTION = 'guest';
const MONTH_NAMES = [
    'січень', 'лютий', 'березень', 'квітень', 'травень', 'червень',
    'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень',
];

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

function formatUser(u) {
    if (!u) return '—';
    return `${u.name || ''}${u.lastName ? ' ' + u.lastName : ''}`.trim() || u.email;
}

function newMemberRow(partial = {}) {
    return {
        key: partial.key || `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        select: partial.select ?? '',
        name: partial.name ?? '',
    };
}

function rowsFromMembers(members) {
    const list = members || [];
    if (!list.length) return [newMemberRow()];
    return list.map((m) => {
        if (m.isGuest || m.displayName) {
            return newMemberRow({ select: GUEST_OPTION, name: m.displayName || '' });
        }
        return newMemberRow({ select: String(m.id) });
    });
}

function buildMembersPayload(rows) {
    const out = [];
    for (const row of rows) {
        if (!row.select) continue;
        if (row.select === GUEST_OPTION) {
            const n = row.name.trim();
            if (n) out.push({ displayName: n });
            continue;
        }
        const id = parseInt(row.select, 10);
        if (Number.isInteger(id)) out.push({ userId: id });
    }
    return out;
}

function validateMemberRows(rows) {
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].select === GUEST_OPTION && !rows[i].name.trim()) {
            return `Рядок ${i + 1}: вкажіть ім'я або приберіть співробітника`;
        }
    }
    const userIds = rows
        .filter((r) => r.select && r.select !== GUEST_OPTION)
        .map((r) => parseInt(r.select, 10));
    if (new Set(userIds).size !== userIds.length) {
        return 'Один користувач не може бути обраний двічі';
    }
    return null;
}

function MemberRowEditor({ index, row, memberPool, otherSelectedIds, onChange, onRemove, canRemove }) {
    const pool = memberPool.filter(
        (u) => !otherSelectedIds.has(u.id) || String(u.id) === row.select
    );
    return (
        <div className="company-member-row">
            <span className="company-member-row__num">{index + 1}</span>
            <div className="company-member-row__fields">
                <select
                    value={row.select}
                    onChange={(e) => onChange({
                        ...row,
                        select: e.target.value,
                        name: e.target.value === GUEST_OPTION ? row.name : '',
                    })}
                >
                    <option value="">— не додавати —</option>
                    <option value={GUEST_OPTION}>Без акаунта (ім'я вручну)</option>
                    {pool.map((u) => (
                        <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                    ))}
                </select>
                {row.select === GUEST_OPTION && (
                    <input
                        type="text"
                        value={row.name}
                        onChange={(e) => onChange({ ...row, name: e.target.value })}
                        placeholder="ПІБ для табеля"
                    />
                )}
            </div>
            {canRemove && (
                <button type="button" className="company-member-row__remove" onClick={onRemove} title="Прибрати рядок">
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

export default function AdminSubdivisions() {
    const { token, user: me } = useAuth();
    const { showToast } = useToast();
    const isOwner = me?.role === 'owner';

    const [subdivisions, setSubdivisions] = useState([]);
    const [users, setUsers]               = useState([]);
    const [timesheetByHead, setTimesheetByHead] = useState(new Map());
    const [loading, setLoading]           = useState(true);
    const [showForm, setShowForm]         = useState(false);
    const [editingSub, setEditingSub]     = useState(null);
    const [saving, setSaving]             = useState(false);
    const [error, setError]               = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [subName,    setSubName]    = useState('');
    const [headId,     setHeadId]     = useState('');
    const [memberRows, setMemberRows] = useState([newMemberRow()]);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    useEffect(() => {
        if (!token) return;
        reload().finally(() => setLoading(false));
    }, [token]);

    async function reload() {
        const [subs, usrs, overview] = await Promise.all([
            subdivisionsApi.list(),
            usersApi.list(),
            timesheetApi.overview({ year, month }).catch(() => ({ sheets: [] })),
        ]);
        setSubdivisions(Array.isArray(subs) ? subs : []);
        setUsers(Array.isArray(usrs) ? usrs : []);
        const map = new Map();
        (overview?.sheets || []).forEach((sheet) => map.set(sheet.headUserId, sheet));
        setTimesheetByHead(map);
    }

    const busyIds = useMemo(() => {
        const s = new Set();
        subdivisions.forEach((sub) => {
            if (editingSub && sub.id === editingSub.id) return;
            if (sub.head?.id) s.add(sub.head.id);
            (sub.members || []).forEach((m) => { if (m.id) s.add(m.id); });
        });
        return s;
    }, [subdivisions, editingSub]);

    const eligible    = useMemo(() => users.filter((u) => u.status === 'active' && u.role !== 'owner'), [users]);
    const headOptions = useMemo(() => {
        let list = eligible.filter((u) => !busyIds.has(u.id));
        if (editingSub?.head) {
            const hid = editingSub.head.id;
            if (!list.some((u) => u.id === hid)) {
                const full = users.find((u) => u.id === hid);
                if (full) list = [full, ...list];
            }
        }
        return list;
    }, [eligible, busyIds, editingSub, users]);
    const memberPool  = useMemo(() => {
        const hid = parseInt(headId, 10);
        let list = eligible.filter((u) => !busyIds.has(u.id) && u.id !== hid);
        (editingSub?.members || []).forEach((m) => {
            if (!m.id || m.id === hid) return;
            if (!list.some((u) => u.id === m.id)) {
                const full = users.find((u) => u.id === m.id);
                if (full) list = [full, ...list];
            }
        });
        return list;
    }, [eligible, busyIds, headId, editingSub, users]);

    const filledMemberCount = useMemo(
        () => memberRows.filter((r) => r.select).length,
        [memberRows]
    );

    const getOtherSelectedIds = useCallback((rowKey) => {
        const setIds = new Set();
        memberRows.forEach((r) => {
            if (r.key === rowKey || !r.select || r.select === GUEST_OPTION) return;
            const id = parseInt(r.select, 10);
            if (Number.isInteger(id)) setIds.add(id);
        });
        return setIds;
    }, [memberRows]);

    function addMemberRow() {
        if (filledMemberCount >= MAX_MEMBERS) {
            setError(`Не більше ${MAX_MEMBERS} співробітників (окрім голови)`);
            return;
        }
        setMemberRows((prev) => [...prev, newMemberRow()]);
    }

    function cancelForm() {
        setShowForm(false);
        setEditingSub(null);
        setSubName('');
        setHeadId('');
        setMemberRows([newMemberRow()]);
        setError('');
    }

    function openCreate() {
        setEditingSub(null);
        setSubName('');
        setHeadId('');
        setMemberRows([newMemberRow()]);
        setError('');
        setShowForm(true);
    }

    function openEdit(sub) {
        setShowForm(false);
        setError('');
        setSubName(sub.name || '');
        setHeadId(sub.head?.id ? String(sub.head.id) : '');
        setMemberRows(rowsFromMembers(sub.members));
        setEditingSub(sub);
    }

    function prepareMembersPayload() {
        const err = validateMemberRows(memberRows);
        if (err) {
            setError(err);
            return null;
        }
        const members = buildMembersPayload(memberRows);
        if (members.length > MAX_MEMBERS) {
            setError(`Не більше ${MAX_MEMBERS} співробітників`);
            return null;
        }
        return members;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const hid = parseInt(headId, 10);
        if (!hid) { setError('Оберіть голову підрозділу'); return; }
        const members = prepareMembersPayload();
        if (!members) return;
        const memberUserIds = members.filter((m) => m.userId).map((m) => m.userId);
        if (memberUserIds.includes(hid)) { setError('Співробітники не можуть збігатися з головою'); return; }

        setSaving(true);
        setError('');
        try {
            await subdivisionsApi.create({ name: subName.trim() || null, headUserId: hid, members });
            cancelForm();
            await reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleEditSubmit(e) {
        e.preventDefault();
        if (!editingSub) return;
        const hid = parseInt(headId, 10);
        if (!hid) { setError('Оберіть голову підрозділу'); return; }
        const members = prepareMembersPayload();
        if (!members) return;
        const memberUserIds = members.filter((m) => m.userId).map((m) => m.userId);
        if (memberUserIds.includes(hid)) { setError('Співробітники не можуть збігатися з головою'); return; }

        setSaving(true);
        setError('');
        try {
            await subdivisionsApi.update(editingSub.id, {
                name: subName.trim() || null,
                headUserId: hid,
                members,
            });
            cancelForm();
            await reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await subdivisionsApi.remove(deleteTarget.id);
            await reload();
        } catch (err) {
            showToast(err.message, 'warning');
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    }

    const columns = useMemo(() => [
        {
            key: 'name',
            label: 'Підрозділ',
            render: (name, sub) => (
                <div className="company-sub-title">
                    <Network size={15} />
                    {name || `Підрозділ #${sub.id}`}
                </div>
            ),
        },
        {
            key: 'head',
            label: 'Голова',
            render: (head) => head ? (
                <div>
                    {formatUser(head)}
                    <div className="company-pending-email">{ROLE_LABELS[head.role] || head.role}</div>
                </div>
            ) : '—',
        },
        {
            key: 'members',
            label: 'Людей',
            align: 'right',
            render: (members) => <span className="num">{(members?.length || 0) + 1}</span>,
        },
        {
            key: 'id',
            label: `Табель за ${MONTH_NAMES[month - 1]}`,
            render: (_, sub) => {
                const sheet = sub.head ? timesheetByHead.get(sub.head.id) : null;
                return sheet?.savedAt
                    ? <StatusBadge tone="success" label={`Збережено ${fmtDate(sheet.savedAt)}`} />
                    : <StatusBadge tone="neutral" label="Не збережено" />;
            },
        },
        {
            key: 'actions',
            label: 'Дії',
            align: 'right',
            render: (_, sub) => (
                <div className="company-sub-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={() => openEdit(sub)}>
                        <Pencil size={15} /> Редагувати
                    </button>
                    <button type="button" className="ds-icon-btn" onClick={() => setDeleteTarget(sub)} title="Видалити підрозділ">
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ], [timesheetByHead, month]);

    if (!isOwner) {
        return (
            <div>
                <EmptyState title="Доступ лише для власника" />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Підрозділи"
                subtitle="Структура компанії для табелю ПАН ПІВДЕНЬБУД"
                actions={
                    !showForm && !editingSub && (
                        <button type="button" className="ds-btn ds-btn--primary" onClick={openCreate}>
                            <Plus size={16} /> Створити підрозділ
                        </button>
                    )
                }
            />

            {error && <div className="company-banner">{error}</div>}

            {(showForm || editingSub) && (
                <div className="company-sub-form">
                    <h2 className="company-sub-form-title">
                        {editingSub ? 'Редагувати підрозділ' : 'Новий підрозділ'}
                    </h2>
                    <p className="company-sub-form-hint">
                        <strong>Голова</strong> — лише з облікового запису (входить у табель). <strong>Співробітники</strong> — можна обрати користувача
                        або «без акаунта» і вписати ім'я вручну (лише підпис у колонках табеля).
                    </p>
                    <form onSubmit={editingSub ? handleEditSubmit : handleSubmit}>
                        <div className="company-sub-form-grid">
                            <div className="company-sub-form-main">
                                <div className="company-form-group">
                                    <label>Назва підрозділу</label>
                                    <input
                                        type="text"
                                        value={subName}
                                        onChange={(e) => setSubName(e.target.value)}
                                        placeholder="Наприклад: МАКС І АНТОН"
                                    />
                                </div>
                                <div className="company-form-group">
                                    <label>Голова підрозділу *</label>
                                    <select required value={headId} onChange={(e) => setHeadId(e.target.value)}>
                                        <option value="">— оберіть —</option>
                                        {headOptions.map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
                                    <p className="company-field-hint">Перший рядок у табелі; потрібен вхід у систему.</p>
                                </div>
                            </div>

                            <div>
                                <div className="company-sub-form-members-head">
                                    <label>Співробітники в табелі</label>
                                    <span className="company-sub-form-counter">{filledMemberCount} / {MAX_MEMBERS}</span>
                                </div>
                                <p className="company-sub-form-hint">
                                    Кожен співробітник — окремий рядок у табелі. Можна без акаунта (лише ім'я).
                                </p>
                                <div className="company-members-list">
                                    {memberRows.map((row, idx) => (
                                        <MemberRowEditor
                                            key={row.key}
                                            index={idx}
                                            row={row}
                                            memberPool={memberPool}
                                            otherSelectedIds={getOtherSelectedIds(row.key)}
                                            canRemove={memberRows.length > 1}
                                            onChange={(next) => setMemberRows((prev) => prev.map((r) => (r.key === row.key ? next : r)))}
                                            onRemove={() => setMemberRows((prev) => prev.filter((r) => r.key !== row.key))}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="ds-btn ds-btn--secondary"
                                    onClick={addMemberRow}
                                    disabled={filledMemberCount >= MAX_MEMBERS}
                                >
                                    <UserPlus size={15} /> Додати співробітника
                                </button>
                            </div>
                        </div>
                        <div className="company-sub-form-actions">
                            <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                                {saving ? 'Збереження...' : (editingSub ? 'Зберегти зміни' : 'Зберегти підрозділ')}
                            </button>
                            <button type="button" className="ds-btn ds-btn--secondary" onClick={cancelForm}>
                                Скасувати
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <DataTable
                columns={columns}
                rows={subdivisions}
                loading={loading}
                emptyIcon={Network}
                emptyTitle="Підрозділів ще немає"
                emptyDescription="Натисніть «Створити підрозділ» щоб додати перший"
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити підрозділ?"
                message={
                    deleteTarget
                        ? `Видалити «${deleteTarget.name || `Підрозділ #${deleteTarget.id}`}»? Голова підрозділу втратить роль «${ROLE_LABELS.pivdenbud}» (стане «${ROLE_LABELS.rent}»), якщо вона була надана лише через цей підрозділ.`
                        : ''
                }
                confirmText="Видалити"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
