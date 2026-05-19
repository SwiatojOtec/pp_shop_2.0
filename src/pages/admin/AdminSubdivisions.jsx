import { useEffect, useState, useMemo } from 'react';
import { Network, Plus, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subdivisionsApi, usersApi } from '../../services/api';
import { AdminPageHeader } from '../../components/admin';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ConfirmDialog } from '../../components/admin';
import './Admin.css';

const MAX_MEMBERS = 2;
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

function slotFromMember(m) {
    if (!m) return { select: '', name: '' };
    if (m.isGuest || m.displayName) return { select: GUEST_OPTION, name: m.displayName || '' };
    return { select: String(m.id), name: '' };
}

function buildMembersPayload(select1, name1, select2, name2) {
    const out = [];
    function add(selectVal, nameVal) {
        if (!selectVal) return;
        if (selectVal === GUEST_OPTION) {
            const n = nameVal.trim();
            if (n) out.push({ displayName: n });
            return;
        }
        const id = parseInt(selectVal, 10);
        if (Number.isInteger(id)) out.push({ userId: id });
    }
    add(select1, name1);
    add(select2, name2);
    return out;
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
    const [member1Id,  setMember1Id]  = useState('');
    const [member2Id,  setMember2Id]  = useState('');
    const [member1Name, setMember1Name] = useState('');
    const [member2Name, setMember2Name] = useState('');

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
        setMember1Id('');
        setMember2Id('');
        setMember1Name('');
        setMember2Name('');
        setError('');
    }

    function openCreate() {
        setEditingSub(null);
        setSubName('');
        setHeadId('');
        setMember1Id('');
        setMember2Id('');
        setMember1Name('');
        setMember2Name('');
        setError('');
        setShowForm(true);
    }

    function openEdit(sub) {
        setShowForm(false);
        setError('');
        setSubName(sub.name || '');
        setHeadId(sub.head?.id ? String(sub.head.id) : '');
        const m = sub.members || [];
        const s1 = slotFromMember(m[0]);
        const s2 = slotFromMember(m[1]);
        setMember1Id(s1.select);
        setMember1Name(s1.name);
        setMember2Id(s2.select);
        setMember2Name(s2.name);
        setEditingSub(sub);
    }

    function validateMembers() {
        if (member1Id === GUEST_OPTION && !member1Name.trim()) {
            setError('Вкажіть ім\'я співробітника 1 або оберіть «немає»');
            return false;
        }
        if (member2Id === GUEST_OPTION && !member2Name.trim()) {
            setError('Вкажіть ім\'я співробітника 2 або оберіть «немає»');
            return false;
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const hid = parseInt(headId, 10);
        if (!hid) { setError('Оберіть голову підрозділу'); return; }
        if (!validateMembers()) return;
        const members = buildMembersPayload(member1Id, member1Name, member2Id, member2Name);
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
        if (!validateMembers()) return;
        const members = buildMembersPayload(member1Id, member1Name, member2Id, member2Name);
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
                        <form onSubmit={editingSub ? handleEditSubmit : handleSubmit}>
                            <div style={{ display: 'grid', gap: '14px', maxWidth: '520px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Назва підрозділу</label>
                                    <input
                                        type="text"
                                        value={subName}
                                        onChange={(e) => setSubName(e.target.value)}
                                        placeholder="Наприклад: Бригада №1"
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Голова підрозділу *</label>
                                    <select required value={headId} onChange={(e) => { setHeadId(e.target.value); setMember1Id(''); setMember2Id(''); }}>
                                        <option value="">— оберіть —</option>
                                        {headOptions.map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Співробітник 1 (табель)</label>
                                    <select
                                        value={member1Id}
                                        onChange={(e) => {
                                            setMember1Id(e.target.value);
                                            if (e.target.value !== GUEST_OPTION) setMember1Name('');
                                        }}
                                    >
                                        <option value="">— немає —</option>
                                        <option value={GUEST_OPTION}>Без акаунта (ім’я вручну)</option>
                                        {memberPool.filter((u) => member2Id !== String(u.id)).map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
                                    {member1Id === GUEST_OPTION && (
                                        <input
                                            type="text"
                                            className="mt-2"
                                            value={member1Name}
                                            onChange={(e) => setMember1Name(e.target.value)}
                                            placeholder="ПІБ або як у табелі"
                                        />
                                    )}
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Співробітник 2 (табель)</label>
                                    <select
                                        value={member2Id}
                                        onChange={(e) => {
                                            setMember2Id(e.target.value);
                                            if (e.target.value !== GUEST_OPTION) setMember2Name('');
                                        }}
                                    >
                                        <option value="">— немає —</option>
                                        <option value={GUEST_OPTION}>Без акаунта (ім’я вручну)</option>
                                        {memberPool.filter((u) => member1Id !== String(u.id)).map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
                                    {member2Id === GUEST_OPTION && (
                                        <input
                                            type="text"
                                            className="mt-2"
                                            value={member2Name}
                                            onChange={(e) => setMember2Name(e.target.value)}
                                            placeholder="ПІБ або як у табелі"
                                        />
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Збереження...' : (editingSub ? 'Зберегти зміни' : 'Зберегти підрозділ')}
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={cancelForm}>
                                        Скасувати
                                    </Button>
                                </div>
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
                                                <div>
                                                    <span className="font-medium">Співробітники:</span>{' '}
                                                    {sub.members.map((m) => formatMember(m)).join(', ')}
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
