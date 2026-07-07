export const DEFAULT_SELLER_ID = 'fop_pankratiev_mo';

export const SELLER_OPTIONS = [
    { id: 'fop_pankratiev_mo', label: 'ФОП Панкрат\'єв М.О.' },
    { id: 'fop_pankratiev_mykhailo', label: 'ФОП Панкрат\'єв Михайло О.' },
    { id: 'fop_pankratiev_om', label: 'ФОП Панкрат\'єв О.М.' },
    { id: 'tov_pan_pivdenbud', label: 'ТОВ «ПАН-ПІВДЕНЬБУД»' },
];

export const FOP_SELLER_OPTIONS = SELLER_OPTIONS.filter((s) => s.id !== 'tov_pan_pivdenbud');

export function resolveSellerId(sellerId) {
    const id = String(sellerId || '').trim();
    if (SELLER_OPTIONS.some((s) => s.id === id)) return id;
    return DEFAULT_SELLER_ID;
}
