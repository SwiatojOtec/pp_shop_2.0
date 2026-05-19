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
            (sub.members || []).forEach((m) => s.add(m.id));
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
            if (m.id === hid) return;
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
        setError('');
    }

    function openCreate() {
        setEditingSub(null);
        setSubName('');
        setHeadId('');
        setMember1Id('');
        setMember2Id('');
        setError('');
        setShowForm(true);
    }

    function openEdit(sub) {
        setShowForm(false);
        setError('');
        setSubName(sub.name || '');
        setHeadId(sub.head?.id ? String(sub.head.id) : '');
        const m = sub.members || [];
        setMember1Id(m[0]?.id ? String(m[0].id) : '');
        setMember2Id(m[1]?.id ? String(m[1].id) : '');
        setEditingSub(sub);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const hid = parseInt(headId, 10);
        if (!hid) { setError('Оберіть голову підрозділу'); return; }
        const m1  = member1Id ? parseInt(member1Id, 10) : null;
        const m2  = member2Id ? parseInt(member2Id, 10) : null;
        const memberIds = [...new Set([m1, m2].filter(Number.isInteger))];
        if (memberIds.includes(hid)) { setError('Співробітники не можуть збігатися з головою'); return; }

        setSaving(true);
        setError('');
        try {
            await subdivisionsApi.create({ name: subName.trim() || null, headUserId: hid, memberIds });
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
        const m1  = member1Id ? parseInt(member1Id, 10) : null;
        const m2  = member2Id ? parseInt(member2Id, 10) : null;
        const memberIds = [...new Set([m1, m2].filter(Number.isInteger))];
        if (memberIds.includes(hid)) { setError('Співробітники не можуть збігатися з головою'); return; }

        setSaving(true);
        setError('');
        try {
            await subdivisionsApi.update(editingSub.id, {
                name: subName.trim() || null,
                headUserId: hid,
                memberIds,
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
                            Голова підрозділу отримує роль <code>pivdenbud</code> і бачить табель. До двох співробітників вказуються для відображення в табелі.
                            Нові люди спочатку мають бути в «Користувачі» зі статусом «активний» (не власник).
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
                                    <select value={member1Id} onChange={(e) => setMember1Id(e.target.value)}>
                                        <option value="">— немає —</option>
                                        {memberPool.filter((u) => u.id !== parseInt(member2Id, 10)).map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Співробітник 2 (табель)</label>
                                    <select value={member2Id} onChange={(e) => setMember2Id(e.target.value)}>
                                        <option value="">— немає —</option>
                                        {memberPool.filter((u) => u.id !== parseInt(member1Id, 10)).map((u) => (
                                            <option key={u.id} value={u.id}>{formatUser(u)} ({u.email})</option>
                                        ))}
                                    </select>
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
                                                    {sub.members.map((m) => formatUser(m)).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                            onClick={() => openEdit(sub)}
                                            title="Редагувати підрозділ"
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeleteTarget(sub)}
                                            title="Видалити підрозділ"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
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
