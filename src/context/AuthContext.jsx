import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

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
        authApi.me()
            .then((data) => {
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
        try {
            const data = await authApi.login({ email, password });
            window.localStorage.setItem('authToken', data.token);
            setToken(data.token);
            setUser(data.user);
        } catch (err) {
            throw new Error(err.message || 'Помилка входу');
        }
    };

    const register = async (name, lastName, email, password) => {
        try {
            const data = await authApi.register({ name, lastName, email, password });
            if (data.token && data.user) {
                window.localStorage.setItem('authToken', data.token);
                setToken(data.token);
                setUser(data.user);
            }
            return data;
        } catch (err) {
            throw new Error(err.message || 'Помилка реєстрації');
        }
    };

    const updateProfile = async (payload) => {
        if (!token) throw new Error('Not authenticated');
        try {
            const data = await authApi.updateProfile(payload);
            if (data.user) setUser(data.user);
            return data.user;
        } catch (err) {
            throw new Error(err.message || 'Помилка оновлення профілю');
        }
    };

    const logout = () => {
        setUser(null);
        setToken('');
        window.localStorage.removeItem('authToken');
    };

    useEffect(() => {
        const handleUnauthorized = () => logout();
        window.addEventListener('api:unauthorized', handleUnauthorized);
        return () => window.removeEventListener('api:unauthorized', handleUnauthorized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = { user, token, loading, login, register, logout, updateProfile };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
