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

/** Лише орендний інструмент, включно з тим, що зараз повністю розібраний
 *  «сьогодні» (includeHiddenRent) — бронь на майбутню дату не повинна
 *  залежати від поточного вільного залишку. */
export function searchRentProducts(query: string): Promise<Product[]> {
    return apiGet<Product[]>('/api/products', {
        search: query,
        isRent: 'true',
        includeHiddenRent: 'true',
        limit: 8,
    });
}
