import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

export default function AdminProfile() {
    const { user, updateProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Імʼя не може бути порожнім');
            return;
        }

        if (password || passwordConfirm) {
            if (password !== passwordConfirm) {
                setError('Паролі не співпадають');
                return;
            }
            if (password.length < 6) {
                setError('Пароль має містити мінімум 6 символів');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                lastName: lastName.trim()
            };
            if (password) {
                payload.password = password;
            }
            await updateProfile(payload);
            setSuccess('Профіль оновлено');
            setPassword('');
            setPasswordConfirm('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-profile">
            <div className="admin-header" style={{ marginBottom: '24px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>Мій кабінет</h1>
                <p className="admin-subtitle" style={{ marginTop: '6px', color: '#6b7280', fontSize: '0.9rem' }}>
                    Тут можна оновити свої дані та пароль доступу до адмінки.
                </p>
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            {success && <div className="admin-alert success">{success}</div>}

            <div className="form-section" style={{ maxWidth: 640 }}>
                <h2 className="form-section-title">Особисті дані</h2>
                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Імʼя</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Прізвище</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Email (тільки для входу)</label>
                        <input type="email" value={user?.email || ''} disabled />
                    </div>

                    <h3 style={{ marginTop: '25px', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', color: '#4b5563' }}>
                        Змінити пароль
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '10px' }}>
                        Заповніть ці поля, тільки якщо хочете змінити пароль. Інакше залиште порожніми.
                    </p>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Новий пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Мінімум 6 символів"
                            />
                        </div>
                        <div className="form-group">
                            <label>Повторіть пароль</label>
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ marginTop: '10px' }}
                    >
                        {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                </form>
            </div>
        </div>
    );
}

