export const DEFAULT_SELLER_ID = 'fop_pankratiev_mo';

/** Shared office contacts shown on rental application PDFs (Сторони). */
const OFFICE_CONTACTS = {
    phone: '+38 098 188 00 44; +38 095 672 44 00',
    email: 'office@ppbud.info',
    warehouseAddress: 'м. Київ, вул. Холодноярська 2а',
    // Nominatim doesn't reliably resolve this address by name (tried several
    // Cyrillic phrasings, all empty) — fixed once by reverse-geocoding the
    // known "Пан Прокат" listing at this address, so DealRouteMap can skip
    // geocoding the warehouse and go straight to routing.
    warehouseLat: 50.3976618,
    warehouseLon: 30.4818019,
};

/**
 * Frontend seller registry.
 * Keep IDs in sync with server/constants/sellers.js.
 * `rentalLessor` drives PDF/print party block for rental applications.
 */
export const SELLERS = [
    {
        id: 'fop_pankratiev_mo',
        label: 'ФОП Панкрат\'єв М.О.',
        type: 'fop',
        rentalLessor: {
            name: 'Панкрат\'єв Микола Олександрович',
            ipn: '3584307038',
            address: '08130, м. Київ, вул. Садова, буд 139',
            ...OFFICE_CONTACTS,
        },
    },
    {
        id: 'fop_pankratiev_mykhailo',
        label: 'ФОП Панкрат\'єв Михайло О.',
        type: 'fop',
        rentalLessor: {
            name: 'Панкрат\'єв Михайло Олександрович',
            ipn: '3849711711',
            address: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
            ...OFFICE_CONTACTS,
        },
    },
    {
        id: 'fop_pankratiev_om',
        label: 'ФОП Панкрат\'єв О.М.',
        type: 'fop',
        rentalLessor: {
            name: 'Панкрат\'єв Олександр Миколайович',
            ipn: '2490020092',
            address: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
            ...OFFICE_CONTACTS,
        },
    },
    {
        id: 'tov_pan_pivdenbud',
        label: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
        type: 'tov',
        rentalLessor: {
            name: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
            ipn: '35061088',
            address: '03022, м. Київ, вул. Холодноярська, буд. 2А',
            ...OFFICE_CONTACTS,
        },
    },
];

export const SELLER_OPTIONS = SELLERS.map(({ id, label }) => ({ id, label }));

export const FOP_SELLER_OPTIONS = SELLERS
    .filter((s) => s.type === 'fop')
    .map(({ id, label }) => ({ id, label }));

export function resolveSellerId(sellerId) {
    const id = String(sellerId || '').trim();
    if (SELLERS.some((s) => s.id === id)) return id;
    return DEFAULT_SELLER_ID;
}

export function getSeller(sellerId) {
    const id = resolveSellerId(sellerId);
    return SELLERS.find((s) => s.id === id) || SELLERS[0];
}

/** Lessor party block for rental application PDF / print / Сторони tab. */
export function getRentalLessor(sellerId) {
    return getSeller(sellerId).rentalLessor;
}

/** @deprecated Prefer getRentalLessor(sellerId). Kept for older imports. */
export const RENTAL_LESSOR = getRentalLessor(DEFAULT_SELLER_ID);
