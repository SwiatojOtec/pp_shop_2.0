import { apiGet } from './client';

export interface Product {
    id: number;
    name: string;
    sku: string;
    price: string | number;
    unit: string;
    packSize: number | null;
    isRent: boolean;
    isService?: boolean;
}

export function searchProducts(query: string): Promise<Product[]> {
    return apiGet<Product[]>('/api/products', { search: query, limit: 8 });
}
