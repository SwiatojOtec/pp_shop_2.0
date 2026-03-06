import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

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
        <div className="admin-auth-page">
            <div className="admin-auth-card">
                <h1 className="admin-title" style={{ textAlign: 'center', marginBottom: '20px' }}>Реєстрація в адмінці</h1>
                {error && <div className="admin-alert error">{error}</div>}
                {info && <div className="admin-alert success">{info}</div>}
                <form onSubmit={handleSubmit} className="admin-form">
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
                            required
                        />
                    </div>
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
                        {loading ? 'Реєстрація...' : 'Зареєструватися'}
                    </button>
                    <p style={{ marginTop: '15px', fontSize: '0.85rem', textAlign: 'center', color: '#6b7280' }}>
                        Вже маєте акаунт? <Link to="/admin/login">Увійти</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

