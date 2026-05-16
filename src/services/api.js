import { API_URL } from '../apiConfig';

function getToken() {
    return window.localStorage.getItem('authToken') || '';
}

/**
 * Base fetch wrapper.
 * - Automatically attaches Authorization header if token exists.
 * - Throws an Error with server message on non-2xx responses.
 */
export async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
            const body = await res.json();
            message = body.message || message;
        } catch {
            // ignore parse errors
        }
        const err = new Error(message);
        err.status = res.status;
        if (res.status === 401) {
            window.dispatchEvent(new CustomEvent('api:unauthorized'));
        }
        throw err;
    }

    // 204 No Content — nothing to parse
    if (res.status === 204) return null;

    return res.json();
}

// ─── Convenience wrappers ────────────────────────────────────────────────────

export const apiGet = (path, params) => {
    const url = params
        ? `${path}?${new URLSearchParams(params).toString()}`
        : path;
    return apiFetch(url);
};

export const apiPost = (path, body) =>
    apiFetch(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = (path, body) =>
    apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = (path, body) =>
    apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = (path) =>
    apiFetch(path, { method: 'DELETE' });

// ─── Domain-specific helpers ─────────────────────────────────────────────────

export const productsApi = {
    list: (params) => apiGet('/api/products', params),
    get: (slugOrId) => apiGet(`/api/products/${slugOrId}`),
    getById: (id) => apiGet(`/api/products/by-id/${id}`),
    create: (data) => apiPost('/api/products', data),
    update: (id, data) => apiPut(`/api/products/${id}`, data),
    remove: (id) => apiDelete(`/api/products/${id}`),
};

export const ordersApi = {
    list: (params) => apiGet('/api/orders', params),
    get: (id) => apiGet(`/api/orders/${id}`),
    create: (data) => apiPost('/api/orders', data),
    /** Створення з адмінки (без Telegram-сповіщення). */
    createAdmin: (data) => apiPost('/api/orders/admin', data),
    update: (id, data) => apiPut(`/api/orders/${id}`, data),
    remove: (id) => apiDelete(`/api/orders/${id}`),
};

export const authApi = {
    me: () => apiGet('/api/auth/me'),
    login: (data) => apiPost('/api/auth/login', data),
    register: (data) => apiPost('/api/auth/register', data),
    updateProfile: (data) => apiPatch('/api/auth/me', data),
};

export const contactApi = {
    send: (data) => apiPost('/api/contact', data),
};

export const categoriesApi = {
    list: () => apiGet('/api/categories'),
    create: (data) => apiPost('/api/categories', data),
    update: (id, data) => apiPut(`/api/categories/${id}`, data),
    remove: (id) => apiDelete(`/api/categories/${id}`),
};

export const brandsApi = {
    list: (params) => apiGet('/api/brands', params),
    create: (data) => apiPost('/api/brands', data),
    update: (id, data) => apiPut(`/api/brands/${id}`, data),
    patch: (id, data) => apiPatch(`/api/brands/${id}`, data),
    remove: (id) => apiDelete(`/api/brands/${id}`),
};

export const blogApi = {
    list: (params) => apiGet('/api/blog', params),
    get: (id) => apiGet(`/api/blog/${id}`),
    create: (data) => apiPost('/api/blog', data),
    update: (id, data) => apiPut(`/api/blog/${id}`, data),
    remove: (id) => apiDelete(`/api/blog/${id}`),
};

export const rentCategoriesApi = {
    list: () => apiGet('/api/rent-categories'),
    create: (data) => apiPost('/api/rent-categories', data),
    update: (id, data) => apiPut(`/api/rent-categories/${id}`, data),
    patch: (id, data) => apiPatch(`/api/rent-categories/${id}`, data),
    remove: (id) => apiDelete(`/api/rent-categories/${id}`),
};

export const rentalApplicationsApi = {
    list: (params) => apiGet('/api/rental-applications', params),
    get: (id) => apiGet(`/api/rental-applications/${id}`),
    create: (data) => apiPost('/api/rental-applications', data),
    update: (id, data) => apiPut(`/api/rental-applications/${id}`, data),
    remove: (id) => apiDelete(`/api/rental-applications/${id}`),
};

export const clientsApi = {
    list: (params) => apiGet('/api/clients', params),
    get: (id) => apiGet(`/api/clients/${id}`),
    create: (data) => apiPost('/api/clients', data),
    update: (id, data) => apiPut(`/api/clients/${id}`, data),
    remove: (id) => apiDelete(`/api/clients/${id}`),
};

export const usersApi = {
    list: () => apiGet('/api/users'),
    get: (id) => apiGet(`/api/users/${id}`),
    update: (id, data) => apiPatch(`/api/users/${id}`, data),
    remove: (id) => apiDelete(`/api/users/${id}`),
};

export const warehousesApi = {
    list: () => apiGet('/api/warehouses'),
    get: (id) => apiGet(`/api/warehouses/${id}`),
    create: (data) => apiPost('/api/warehouses', data),
    update: (id, data) => apiPut(`/api/warehouses/${id}`, data),
    remove: (id) => apiDelete(`/api/warehouses/${id}`),
    requestDelete: (id, data) => apiPost(`/api/warehouses/${id}/request-delete`, data),
};

export const inventoryApi = {
    list: (params) => apiGet('/api/inventory', params),
    get: (id) => apiGet(`/api/inventory/${id}`),
    create: (data) => apiPost('/api/inventory', data),
    update: (id, data) => apiPut(`/api/inventory/${id}`, data),
    updateItem: (id, data) => apiPut(`/api/inventory/item/${id}`, data),
    deleteItem: (id) => apiDelete(`/api/inventory/item/${id}`),
    remove: (id) => apiDelete(`/api/inventory/${id}`),
    suggest: (params) => apiGet('/api/inventory/suggest', params),
    move: (data) => apiPost('/api/inventory/move', data),
    moveToRepair: (data) => apiPost('/api/inventory/move-to-repair', data),
    restoreInStock: (data) => apiPost('/api/inventory/restore-in-stock', data),
    events: (params) => apiGet('/api/inventory/events', params),
};

export const warehouseApi = {
    dashboard: (params) => apiGet('/api/warehouse/dashboard', params),
    productRentals: (productId) => apiGet(`/api/warehouse/product-rentals/${productId}`),
    eventUsers: () => apiGet('/api/warehouse/events/users'),
    events: (params) => apiGet('/api/warehouse/events', params),
    deleteRequests: () => apiGet('/api/warehouse/delete-requests'),
    approveDeleteRequest: (id) => apiPost(`/api/warehouse/delete-requests/${id}/approve`),
    rejectDeleteRequest: (id) => apiPost(`/api/warehouse/delete-requests/${id}/reject`),
};

export const currenciesApi = {
    list: () => apiGet('/api/currencies'),
    update: (id, data) => apiPut(`/api/currencies/${id}`, data),
};

export const timesheetApi = {
    list: (params) => apiGet('/api/timesheet', params),
    overview: (params) => apiGet('/api/timesheet/overview', params),
    saveMonth: (data) => apiPut('/api/timesheet/month', data),
    save: (data) => apiPost('/api/timesheet', data),
    remove: (id) => apiDelete(`/api/timesheet/${id}`),
};

export const subdivisionsApi = {
    list: () => apiGet('/api/subdivisions'),
    get: (id) => apiGet(`/api/subdivisions/${id}`),
    create: (data) => apiPost('/api/subdivisions', data),
    update: (id, data) => apiPut(`/api/subdivisions/${id}`, data),
    remove: (id) => apiDelete(`/api/subdivisions/${id}`),
    members: (id) => apiGet(`/api/subdivisions/${id}/members`),
};
