import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../features/admin/auth/auth.css';

export default function AdminRegister() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const res = await register(name, lastName, email, password);
            if (res.token && res.user) {
                // Перший користувач – одразу в адмінку
                navigate('/admin', { replace: true });
            } else {
                setInfo('Реєстрація успішна. Дочекайтесь, поки адміністратор підтвердить доступ.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-wordmark">
                <img src="/admin-sidebar-logo.png" alt="PPbud Tech · PAN PARKET" />
            </div>
            <div className="auth-card">
                <h1 className="auth-title">Реєстрація в адмінці</h1>
                {error && <div className="auth-alert auth-alert--error">{error}</div>}
                {info && <div className="auth-alert auth-alert--success">{info}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                    <label className="auth-field">
                        Ім'я
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </label>
                    <label className="auth-field">
                        Прізвище
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </label>
                    <label className="auth-field">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>
                    <label className="auth-field">
                        Пароль
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>
                    <button type="submit" className="ds-btn ds-btn--primary auth-submit" disabled={loading}>
                        {loading ? 'Реєстрація...' : 'Зареєструватися'}
                    </button>
                    <p className="auth-switch">
                        Вже маєте акаунт? <Link to="/admin/login">Увійти</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
