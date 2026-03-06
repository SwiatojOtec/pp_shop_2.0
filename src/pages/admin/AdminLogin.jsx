import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

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
        <div className="admin-auth-page">
            <div className="admin-auth-card">
                <h1 className="admin-title" style={{ textAlign: 'center', marginBottom: '20px' }}>Вхід в адмінку</h1>
                {error && <div className="admin-alert error">{error}</div>}
                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Пароль</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
                        {loading ? 'Вхід...' : 'Увійти'}
                    </button>
                    <p style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center', color: '#6b7280' }}>
                        Ще немає доступу? <Link to="/admin/register">Зареєструватися</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

