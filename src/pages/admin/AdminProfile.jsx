import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/adminRoles';
import PageHeader from '../../features/admin/ui/PageHeader';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import '../../features/admin/auth/auth.css';

export default function AdminProfile() {
    const { user, updateProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const roleLabel = ROLE_LABELS[user?.role] || user?.role || '—';
    const subdivisionLabel = user?.subdivision
        ? `${user.subdivision.name || `Підрозділ #${user.subdivision.id}`}${user.subdivision.isHead ? ' · голова' : ''}`
        : 'Без підрозділу';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Імʼя не може бути порожнім');
            return;
        }

        if (password || passwordConfirm || currentPassword) {
            if (!currentPassword) {
                setError('Вкажіть поточний пароль');
                return;
            }
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
                payload.currentPassword = currentPassword;
            }
            await updateProfile(payload);
            setSuccess('Профіль оновлено');
            setCurrentPassword('');
            setPassword('');
            setPasswordConfirm('');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="profile-page">
            <PageHeader title="Мій кабінет" subtitle="Особисті дані та пароль доступу до адмінки" />

            {error && <div className="auth-alert auth-alert--error">{error}</div>}
            {success && <div className="auth-alert auth-alert--success">{success}</div>}

            <div className="profile-section">
                <h2 className="profile-section-title">Особисті дані</h2>
                <div className="profile-meta-row">
                    <StatusBadge tone="accent" label={roleLabel} />
                    <StatusBadge tone="neutral" label={subdivisionLabel} />
                </div>
                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="profile-row">
                        <label className="profile-field">
                            Ім'я
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </label>
                        <label className="profile-field">
                            Прізвище
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </label>
                    </div>
                    <label className="profile-field">
                        Email (тільки для входу)
                        <input type="email" value={user?.email || ''} disabled />
                    </label>

                    <h3 className="profile-section-title">Змінити пароль</h3>
                    <p className="profile-section-hint">
                        Заповніть ці поля, тільки якщо хочете змінити пароль. Інакше залиште порожніми.
                    </p>
                    <label className="profile-field">
                        Поточний пароль
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </label>
                    <div className="profile-row">
                        <label className="profile-field">
                            Новий пароль
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Мінімум 6 символів"
                            />
                        </label>
                        <label className="profile-field">
                            Повторіть пароль
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                            />
                        </label>
                    </div>

                    <button type="submit" className="ds-btn ds-btn--primary" disabled={saving}>
                        {saving ? 'Збереження...' : 'Зберегти зміни'}
                    </button>
                </form>
            </div>
        </div>
    );
}
