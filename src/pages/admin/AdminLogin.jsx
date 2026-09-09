import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../features/admin/auth/auth.css';

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/admin', { replace: true });
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
                <h1 className="auth-title">Вхід в адмінку</h1>
                {error && <div className="auth-alert auth-alert--error">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
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
                        {loading ? 'Вхід...' : 'Увійти'}
                    </button>
                    <p className="auth-switch">
                        Ще немає доступу? <Link to="/admin/register">Зареєструватися</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
