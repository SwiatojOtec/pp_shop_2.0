import { apiPost } from './client';

export interface LoginUser {
    id: number;
    name: string;
    lastName: string | null;
    email: string;
    role: string;
    status: string;
}

export interface LoginResponse {
    token: string;
    user: LoginUser;
}

export function login(email: string, password: string): Promise<LoginResponse> {
    return apiPost<LoginResponse>('/api/auth/login', { email, password });
}
