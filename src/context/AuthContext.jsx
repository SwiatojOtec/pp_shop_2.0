import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_URL } from '../apiConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => window.localStorage.getItem('authToken') || '');
    const [loading, setLoading] = useState(!!token);

    useEffect(() => {
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`${API_URL}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Unauthorized');
                return res.json();
            })
            .then(data => {
                setUser(data.user);
                setLoading(false);
            })
            .catch(() => {
                setUser(null);
                setToken('');
                window.localStorage.removeItem('authToken');
                setLoading(false);
            });
    }, [token]);

    const login = async (email, password) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Помилка входу');
        }
        window.localStorage.setItem('authToken', data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (name, lastName, email, password) => {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, lastName, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Помилка реєстрації');
        }
        // Якщо це перший користувач – сервер поверне токен
        if (data.token && data.user) {
            window.localStorage.setItem('authToken', data.token);
            setToken(data.token);
            setUser(data.user);
        }
        return data;
    };

    const updateProfile = async (payload) => {
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${API_URL}/api/auth/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Помилка оновлення профілю');
        }
        if (data.user) {
            setUser(data.user);
        }
        return data.user;
    };

    const logout = () => {
        setUser(null);
        setToken('');
        window.localStorage.removeItem('authToken');
    };

    const value = { user, token, loading, login, register, logout, updateProfile };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

