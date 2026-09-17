import { apiGet, apiPost } from './client';

export interface ProductUnit {
    id: number;
    productId: number;
    warehouseId: number | null;
    serialNumber: string | null;
    inventoryNumber: string | null;
    technicalCondition: string | null;
    isActive: boolean;
    lastCheckedAt: string | null;
    Product?: {
        id: number;
        name: string;
        sku: string;
    };
}

export function listUnits(warehouseId: number): Promise<ProductUnit[]> {
    return apiGet<ProductUnit[]>('/api/product-units', {
        warehouseId,
        isActive: 'true',
    });
}

export interface CheckUnitPatch {
    technicalCondition?: string;
    isActive?: boolean;
}

/** "Підтверджено на місці" — POST .../check проставляє lastCheckedAt і
 *  опційно оновлює стан/активність в тому самому запиті. */
export function checkUnit(id: number, patch?: CheckUnitPatch): Promise<ProductUnit> {
    return apiPost<ProductUnit>(`/api/product-units/${id}/check`, patch || {});
}
