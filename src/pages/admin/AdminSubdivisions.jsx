import { useEffect, useState, useMemo, useCallback } from 'react';
import { Network, Plus, Trash2, Pencil, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subdivisionsApi, usersApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/admin';
import './Admin.css';

const MAX_MEMBERS = 30;
const GUEST_OPTION = 'guest';

const ROLE_LABELS = {
    owner:     'Власник',
    manager:   'Менеджер',
    rent:      'Оренда',
    pivdenbud: 'ПАН ПІВДЕНЬБУД',
};

function formatUser(u) {
    if (!u) return '—';
    return `${u.name || ''}${u.lastName ? ' ' + u.lastName : ''}`.trim() || u.email;
}

function formatMember(m) {
    if (!m) return '—';
    if (m.isGuest || m.displayName) return m.displayName;
    return formatUser(m);
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
        <div className="subdiv-member-row">
            <span className="subdiv-member-row__num">{index + 1}</span>
            <div className="subdiv-member-row__fields">
                <select
                    value={row.select}
                    onChange={(e) => onChange({
                        ...row,
                        select: e.target.value,
                        name: e.target.value === GUEST_OPTION ? row.name : '',
                    })}
                >
                    <option value="">— не додавати —</option>
                    <option value={GUEST_OPTION}>Без акаунта (ім’я вручну)</option>
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
                <button type="button" className="subdiv-member-row__remove" onClick={onRemove} title="Прибрати рядок">
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

export default function AdminSubdivisions() {
    const { token, user: me } = useAuth();
    const isOwner = me?.role === 'owner';

    const [subdivisions, setSubdivisions] = useState([]);
    const [users, setUsers]               = useState([]);
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

    useEffect(() => {
        if (!token) return;
        Promise.all([
            subdivisionsApi.list(),
            usersApi.list(),
        ]).then(([subs, usrs]) => {
            setSubdivisions(Array.isArray(subs)  ? subs  : []);
            setUsers(Array.isArray(usrs)  ? usrs  : []);
        }).catch((err) => setError(err.message))
          .finally(() => setLoading(false));
    }, [token]);

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

    async function reload() {
        const [subs, usrs] = await Promise.all([subdivisionsApi.list(), usersApi.list()]);
        setSubdivisions(Array.isArray(subs) ? subs : []);
        setUsers(Array.isArray(usrs) ? usrs : []);
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
            setError(err.message);
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    }

    if (!isOwner) {
        return (
            <div className="admin-content">
                <p style={{ color: '#6b7280' }}>Доступ лише для власника.</p>
            </div>
        );
    }

    return (
        <div>
            <AdminPageHeader
                title="Підрозділи"
                subtitle="Структура компанії для табелю ПАН ПІВДЕНЬБУД"
                actions={
                    !showForm && !editingSub && (
                        <Button onClick={openCreate}>
                            <Plus size={16} /> Створити підрозділ
                        </Button>
                    )
                }
            />

            {error && (
                <div className="admin-alert error" style={{ marginBottom: '16px' }}>
                    {error}
                    <button style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError('')}>✕</button>
                </div>
            )}

            {/* Create / edit form */}
            {(showForm || editingSub) && (
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <h2 className="text-base font-bold mb-4">
                            {editingSub ? 'Редагувати підрозділ' : 'Новий підрозділ'}
                        </h2>
                        <p className="text-sm text-gray-500 mb-4">
                            <strong>Голова</strong> — лише з облікового запису (входить у табель). <strong>Співробітники</strong> — можна обрати користувача
                            або «без акаунта» і вписати ім’я вручну (лише підпис у колонках табеля).
                        </p>
                        <form onSubmit={editingSub ? handleEditSubmit : handleSubmit} className="subdiv-form">
                            <div className="subdiv-form__grid">
                                <div className="subdiv-form__main">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Назва підрозділу</label>
                                        <input
                                            type="text"
                                            value={subName}
                                            onChange={(e) => setSubName(e.target.value)}
                                            placeholder="Наприклад: МАКС І АНТОН"
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label>Голова підрозділу *</label>
                                        <select required value={headId} onChange={(e) => setHeadId(e.target.value)}>
                                            <option value="">— оберіть —</option>
                                            {headOptions.map((u) => (
                                                <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                            ))}
                                        </select>
                                        <p className="subdiv-form__hint">Перший рядок у табелі; потрібен вхід у систему.</p>
                                    </div>
                                </div>

                                <div className="subdiv-form__members">
                                    <div className="subdiv-form__members-head">
                                        <label>Співробітники в табелі</label>
                                        <span className="subdiv-form__counter">{filledMemberCount} / {MAX_MEMBERS}</span>
                                    </div>
                                    <p className="subdiv-form__hint subdiv-form__hint--block">
                                        Кожен співробітник — окремий рядок у табелі. Можна без акаунта (лише ім’я).
                                    </p>
                                    <div className="subdiv-members-list">
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
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="subdiv-add-member-btn"
                                        onClick={addMemberRow}
                                        disabled={filledMemberCount >= MAX_MEMBERS}
                                    >
                                        <UserPlus size={15} /> Додати співробітника
                                    </Button>
                                </div>
                            </div>
                            <div className="subdiv-form__actions">
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Збереження...' : (editingSub ? 'Зберегти зміни' : 'Зберегти підрозділ')}
                                </Button>
                                <Button type="button" variant="secondary" onClick={cancelForm}>
                                    Скасувати
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Subdivisions list */}
            {loading ? (
                <p className="text-gray-500">Завантаження...</p>
            ) : subdivisions.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-gray-400">
                        <Network size={40} className="mx-auto mb-3 opacity-30" />
                        <p>Підрозділів ще немає</p>
                        <p className="text-sm mt-1">Натисніть «Створити підрозділ» щоб додати перший</p>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subdivisions.map((sub) => (
                        <Card key={sub.id}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Network size={16} className="text-gray-400" />
                                            <h3 className="font-bold text-base">
                                                {sub.name || `Підрозділ #${sub.id}`}
                                            </h3>
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <div>
                                                <span className="font-medium">Голова:</span>{' '}
                                                {sub.head ? (
                                                    <>
                                                        {formatUser(sub.head)}
                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                            {ROLE_LABELS[sub.head.role] || sub.head.role}
                                                        </Badge>
                                                    </>
                                                ) : '—'}
                                            </div>
                                            {sub.members?.length > 0 && (
                                                <div className="subdiv-list-members">
                                                    <span className="font-medium">Співробітники ({sub.members.length}):</span>
                                                    <div className="subdiv-chips">
                                                        {sub.members.map((m, i) => (
                                                            <span key={i} className="subdiv-chip">{formatMember(m)}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEdit(sub)}
                                        >
                                            <Pencil size={15} /> Редагувати
                                        </Button>
                                        <button
                                            type="button"
                                            className="action-btn delete"
                                            onClick={() => setDeleteTarget(sub)}
                                            title="Видалити підрозділ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити підрозділ?"
                message={
                    deleteTarget
                        ? `Видалити «${deleteTarget.name || `Підрозділ #${deleteTarget.id}`}»? Голова підрозділу втратить роль «pivdenbud» (стане «rent»), якщо вона була надана лише через цей підрозділ.`
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
