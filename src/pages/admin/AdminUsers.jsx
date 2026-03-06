import React, { useEffect, useState } from 'react';
import { API_URL } from '../../apiConfig';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function AdminUsers() {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

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

    if (loading) {
        return <div className="admin-content">Завантаження користувачів...</div>;
    }

    return (
        <div className="admin-users">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Користувачі</h1>
            </div>

            {error && <div className="admin-alert error" style={{ marginBottom: '20px' }}>{error}</div>}

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
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.name}</td>
                                <td>{user.lastName}</td>
                                <td>{user.email}</td>
                                <td>{user.role}</td>
                                <td>{user.status}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {user.status === 'pending' && (
                                            <>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                    onClick={() => updateUser(user.id, { status: 'active', role: 'rent' })}
                                                >
                                                    Підтвердити (оренда)
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                    onClick={() => updateUser(user.id, { status: 'active', role: 'manager' })}
                                                >
                                                    Підтвердити (менеджер)
                                                </button>
                                            </>
                                        )}
                                        {user.status === 'active' && (
                                            <>
                                                {user.role !== 'owner' && (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                        onClick={() => updateUser(user.id, { status: 'blocked' })}
                                                    >
                                                        Заблокувати
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {user.status === 'blocked' && (
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                                onClick={() => updateUser(user.id, { status: 'active' })}
                                            >
                                                Розблокувати
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
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

