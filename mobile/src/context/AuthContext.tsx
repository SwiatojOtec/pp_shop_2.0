import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getToken, setToken as persistToken, clearToken, onUnauthorized } from '../api/client';
import { login as loginRequest, LoginUser } from '../api/auth';

interface AuthContextValue {
    user: LoginUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Той самий сенс, що src/context/AuthContext.jsx у веб-адмінці — токен у
 *  сховищі (тут SecureStore замість localStorage), автовихід на 401. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<LoginUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const token = await getToken();
            // Токен без користувача (після перезапуску) — довіряємо йому,
            // бо /api/auth/me тут не критичний: перший-ліпший запит з
            // недійсним токеном сам приведе до onUnauthorized нижче.
            setUser(token ? { id: 0, name: '', lastName: null, email: '', role: '', status: 'active' } : null);
            setLoading(false);
        })();
    }, []);

    useEffect(() => onUnauthorized(() => {
        clearToken();
        setUser(null);
    }), []);

    const login = useCallback(async (email: string, password: string) => {
        const { token, user: loggedInUser } = await loginRequest(email, password);
        await persistToken(token);
        setUser(loggedInUser);
    }, []);

    const logout = useCallback(async () => {
        await clearToken();
        setUser(null);
    }, []);

    const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
