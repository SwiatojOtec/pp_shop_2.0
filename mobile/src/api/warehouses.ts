import { apiGet } from './client';

export interface Warehouse {
    id: number;
    name: string;
    isActive: boolean;
}

export function listWarehouses(): Promise<Warehouse[]> {
    return apiGet<Warehouse[]>('/api/warehouses');
}
