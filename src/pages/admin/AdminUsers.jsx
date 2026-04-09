import React, { useEffect, useState, useMemo } from 'react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const MAX_MEMBERS = 2;

export default function AdminUsers() {
    const { token, user } = useAuth();
    const isOwner = user?.role === 'owner';
    const [users, setUsers] = useState([]);
    const [subdivisions, setSubdivisions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [error, setError] = useState('');
    const [subError, setSubError] = useState('');

    const [subName, setSubName] = useState('');
    const [subHeadId, setSubHeadId] = useState('');
    const [subMember1, setSubMember1] = useState('');
    const [subMember2, setSubMember2] = useState('');
    const [savingSub, setSavingSub] = useState(false);
    const [showSubForm, setShowSubForm] = useState(false);
    const [roleDrafts, setRoleDrafts] = useState({});

    const fetchUsers = async () => {
        if (!token) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Помилка завантаження користувачів');
            }
            setUsers(Array.isArray(data) ? data : []);
            const nextDrafts = {};
            (Array.isArray(data) ? data : []).forEach((u) => {
                nextDrafts[u.id] = u.role || 'rent';
            });
            setRoleDrafts(nextDrafts);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubdivisions = async () => {
        if (!token || !isOwner) return;
        setLoadingSubs(true);
        setSubError('');
        try {
            const res = await fetch(`${API_URL}/api/subdivisions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Не вдалося завантажити підрозділи');
            }
            setSubdivisions(Array.isArray(data) ? data : []);
        } catch (err) {
            setSubError(err.message);
        } finally {
            setLoadingSubs(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (isOwner && token) {
            fetchSubdivisions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, isOwner]);

    const busyUserIds = useMemo(() => {
        const s = new Set();
        subdivisions.forEach(sub => {
            if (sub.head?.id) s.add(sub.head.id);
            (sub.members || []).forEach(m => s.add(m.id));
        });
        return s;
    }, [subdivisions]);

    const eligibleUsers = useMemo(
        () =>
            users.filter(
                u => u.status === 'active' && u.role !== 'owner'
            ),
        [users]
    );

    const headOptions = useMemo(
        () => eligibleUsers.filter(u => !busyUserIds.has(u.id)),
        [eligibleUsers, busyUserIds]
    );

    const memberPool = useMemo(() => {
        const hid = parseInt(subHeadId, 10);
        return eligibleUsers.filter(u => !busyUserIds.has(u.id) && u.id !== hid);
    }, [eligibleUsers, busyUserIds, subHeadId]);

    const deleteUser = async (id, name) => {
        if (!window.confirm(`Видалити користувача "${name}"? Цю дію неможливо скасувати.`)) return;
        try {
            const res = await fetch(`${API_URL}/api/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Помилка видалення');
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const updateUser = async (id, payload) => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Помилка оновлення користувача');
            }
            setUsers(prev => prev.map(u => (u.id === data.id ? data : u)));
        } catch (err) {
            alert(err.message);
        }
    };

    const formatUserOption = u =>
        `${u.name || ''}${u.lastName ? ' ' + u.lastName : ''} (${u.email})`.trim();

    const submitSubdivision = async e => {
        e.preventDefault();
        if (!token) return;
        const headUserId = parseInt(subHeadId, 10);
        if (!headUserId) {
            alert('Оберіть голову підрозділу');
            return;
        }
        const m1 = subMember1 ? parseInt(subMember1, 10) : null;
        const m2 = subMember2 ? parseInt(subMember2, 10) : null;
        const memberIds = [...new Set([m1, m2].filter(n => Number.isInteger(n) && n > 0))];
        if (memberIds.includes(headUserId)) {
            alert('Співробітники не можуть збігатися з головою');
            return;
        }
        if (memberIds.length > MAX_MEMBERS) {
            alert(`Не більше ${MAX_MEMBERS} співробітників`);
            return;
        }

        setSavingSub(true);
        setSubError('');
        try {
            const res = await fetch(`${API_URL}/api/subdivisions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: subName.trim() || null,
                    headUserId,
                    memberIds
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Помилка створення підрозділу');
            }
            setSubName('');
            setSubHeadId('');
            setSubMember1('');
            setSubMember2('');
            setShowSubForm(false);
            await fetchSubdivisions();
            await fetchUsers();
        } catch (err) {
            setSubError(err.message);
        } finally {
            setSavingSub(false);
        }
    };

    const deleteSubdivision = async (id, title) => {
        if (!window.confirm(`Видалити підрозділ «${title}»? У голови буде знято роль «pivdenbud» (стане rent), якщо вона була лише через цей підрозділ.`)) return;
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/subdivisions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Помилка видалення');
            }
            await fetchSubdivisions();
            await fetchUsers();
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) {
        return <div className="admin-content">Завантаження користувачів...</div>;
    }

    return (
        <div className="admin-users">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Користувачі</h1>
            </div>

            {error && <div className="admin-alert error" style={{ marginBottom: '20px' }}>{error}</div>}

            {isOwner && (
                <div className="admin-section" style={{ marginBottom: '24px', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: showSubForm ? '12px' : '8px' }}>
                        <h2 className="admin-title" style={{ fontSize: '1.05rem', margin: 0 }}>
                            Підрозділи компанії
                        </h2>
                        {!showSubForm && (
                            <button type="button" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 14px' }} onClick={() => setShowSubForm(true)}>
                                Створити підрозділ
                            </button>
                        )}
                    </div>

                    {subError && <div className="admin-alert error" style={{ marginBottom: '10px' }}>{subError}</div>}

                    {!showSubForm && (
                        <p style={{ margin: 0, color: '#666', fontSize: '0.82rem', lineHeight: 1.45 }}>
                            Голова отримує роль <code style={{ fontSize: '0.78rem' }}>pivdenbud</code> і до двох співробітників для табелю. Зайняті в іншому підрозділі не показуються у списках.
                        </p>
                    )}

                    {showSubForm && (
                        <>
                            <p style={{ marginBottom: '12px', color: '#555', fontSize: '0.86rem', maxWidth: '640px' }}>
                                Оберіть голову та за потреби до двох співробітників. Користувачі вже в іншому підрозділі недоступні.
                            </p>
                            <form onSubmit={submitSubdivision} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'grid', gap: '10px', maxWidth: '520px' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                        Назва (необовʼязково)
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={subName}
                                            onChange={e => setSubName(e.target.value)}
                                            placeholder="Наприклад: Бригада №1"
                                            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                        />
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                        Голова підрозділу *
                                        <select
                                            required
                                            value={subHeadId}
                                            onChange={e => {
                                                setSubHeadId(e.target.value);
                                                setSubMember1('');
                                                setSubMember2('');
                                            }}
                                            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                        >
                                            <option value="">— оберіть —</option>
                                            {headOptions.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {formatUserOption(u)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                        Співробітник 1 (табель)
                                        <select
                                            value={subMember1}
                                            onChange={e => setSubMember1(e.target.value)}
                                            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                        >
                                            <option value="">— немає —</option>
                                            {memberPool
                                                .filter(u => u.id !== parseInt(subMember2, 10))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {formatUserOption(u)}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem' }}>
                                        Співробітник 2 (табель)
                                        <select
                                            value={subMember2}
                                            onChange={e => setSubMember2(e.target.value)}
                                            style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                                        >
                                            <option value="">— немає —</option>
                                            {memberPool
                                                .filter(u => u.id !== parseInt(subMember1, 10))
                                                .map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {formatUserOption(u)}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                                        <button type="submit" className="btn btn-primary" disabled={savingSub || loadingSubs} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                                            {savingSub ? 'Збереження...' : 'Зберегти підрозділ'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                                            onClick={() => {
                                                setShowSubForm(false);
                                                setSubError('');
                                            }}
                                        >
                                            Скасувати
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </>
                    )}

                    <h3 style={{ fontSize: '0.88rem', marginBottom: '8px', marginTop: showSubForm ? '8px' : '14px', color: '#444' }}>Існуючі підрозділи</h3>
                    {loadingSubs ? (
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>Завантаження...</p>
                    ) : subdivisions.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>Підрозділів ще немає</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {subdivisions.map(sub => (
                                <li
                                    key={sub.id}
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'baseline',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        padding: '12px 0',
                                        borderBottom: '1px solid #eee'
                                    }}
                                >
                                    <div>
                                        <strong>{sub.name || `Підрозділ #${sub.id}`}</strong>
                                        <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '4px' }}>
                                            Голова:{' '}
                                            {sub.head
                                                ? `${sub.head.name || ''} ${sub.head.lastName || ''} (${sub.head.email})`.trim()
                                                : '—'}
                                            {sub.members?.length > 0 && (
                                                <>
                                                    <br />
                                                    Співробітники:{' '}
                                                    {sub.members.map(m => `${m.name || ''} ${m.lastName || ''}`.trim() || m.email).join(', ')}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.75rem', color: '#c53030', borderColor: '#feb2b2' }}
                                        onClick={() => deleteSubdivision(sub.id, sub.name || `Підрозділ #${sub.id}`)}
                                    >
                                        Видалити
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <p style={{ marginBottom: '15px', color: '#555', fontSize: '0.9rem' }}>
                Тут можна переглядати всіх користувачів адмінки, змінювати ролі та підтверджувати доступ для нових реєстрацій.
            </p>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Імʼя</th>
                            <th>Прізвище</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(userRow => (
                            <tr key={userRow.id}>
                                <td>{userRow.id}</td>
                                <td>{userRow.name}</td>
                                <td>{userRow.lastName}</td>
                                <td>{userRow.email}</td>
                                <td>
                                    {userRow.role === 'owner' ? (
                                        <span>{userRow.role}</span>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <select
                                                value={roleDrafts[userRow.id] || userRow.role || 'rent'}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setRoleDrafts((prev) => ({ ...prev, [userRow.id]: val }));
                                                }}
                                                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.8rem' }}
                                            >
                                                <option value="rent">rent</option>
                                                <option value="manager">manager</option>
                                                <option value="pivdenbud">pivdenbud</option>
                                            </select>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                                disabled={(roleDrafts[userRow.id] || userRow.role) === userRow.role}
                                                onClick={() => updateUser(userRow.id, { role: roleDrafts[userRow.id] || userRow.role })}
                                            >
                                                Зберегти
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td>{userRow.status}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {userRow.status === 'pending' && (
                                            <>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                    onClick={() => updateUser(userRow.id, { status: 'active', role: 'rent' })}
                                                >
                                                    Підтвердити (оренда)
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                    onClick={() => updateUser(userRow.id, { status: 'active', role: 'manager' })}
                                                >
                                                    Підтвердити (менеджер)
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                    onClick={() => updateUser(userRow.id, { status: 'active', role: 'pivdenbud' })}
                                                >
                                                    Підтвердити (Пан Південьбуд)
                                                </button>
                                            </>
                                        )}
                                        {userRow.status === 'active' && (
                                            <>
                                                {userRow.role !== 'owner' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                        onClick={() => updateUser(userRow.id, { status: 'blocked' })}
                                                    >
                                                        Заблокувати
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {userRow.status === 'blocked' && (
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                onClick={() => updateUser(userRow.id, { status: 'active' })}
                                            >
                                                Розблокувати
                                            </button>
                                        )}
                                        {userRow.role !== 'owner' && (
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#e53e3e', borderColor: '#e53e3e' }}
                                                onClick={() => deleteUser(userRow.id, `${userRow.name} ${userRow.lastName}`)}
                                            >
                                                Видалити
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    Користувачів поки немає
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
