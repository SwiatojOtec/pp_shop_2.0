import * as SecureStore from 'expo-secure-store';

/**
 * Той самий бойовий API, що й веб-адмінка (server/, Railway) — жодних
 * нових ендпоїнтів, мобільний додаток лише клієнт до вже робочого API
 * (docs plan «Мобільний додаток... Швидкий рахунок»).
 *
 * Проставте реальний URL Railway перед першим запуском.
 */
export const API_URL = 'https://ВАШ-БЕКЕНД.up.railway.app';

const TOKEN_KEY = 'pp_admin_token';

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** AuthContext підписується сюди, щоб самому розлогінити на 401 — той
 *  самий сенс, що `window.dispatchEvent('api:unauthorized')` у вебі
 *  (src/services/api.js), лише без браузерних подій. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
    unauthorizedListeners.add(listener);
    return () => unauthorizedListeners.delete(listener);
}

type FetchOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/** Базова обгортка — той самий контракт, що apiFetch у src/services/api.js:
 *  Bearer-токен, JSON-тіло, кидає ApiError з message з тіла відповіді. */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
    };

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            if (body?.message) message = body.message;
        } catch {
            // тіло не JSON — лишаємо дефолтне повідомлення
        }
        if (res.status === 401) {
            unauthorizedListeners.forEach((fn) => fn());
        }
        throw new ApiError(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

function toQueryString(params?: Record<string, string | number | undefined>): string {
    if (!params) return '';
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (!entries.length) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
}

export const apiGet = <T>(path: string, params?: Record<string, string | number | undefined>) =>
    apiFetch<T>(`${path}${toQueryString(params)}`);

export const apiPost = <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body });

/** Скачування бінарного файлу (PDF рахунку) — окремо від apiFetch, бо
 *  відповідь не JSON. Повертає сирі байти. */
export async function apiGetBinary(path: string): Promise<ArrayBuffer> {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
        throw new ApiError(`HTTP ${res.status}`, res.status);
    }
    return res.arrayBuffer();
}
