const DEFAULT_SELLER_ID = 'fop_pankratiev_mo';

const SELLERS = [
    {
        id: 'fop_pankratiev_mo',
        label: 'ФОП Панкрат\'єв М.О.',
        type: 'fop',
        recipientLine: 'Фізична особа-підприємець Панкрат\'єв Микола Олександрович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Микола Олександрович',
        taxIdLabel: 'ІПН',
        taxId: '3584307038',
        legalAddress: '08130, м. Київ, вул. Садова, буд 139',
        bankName: 'АТ «УНІВЕРСАЛ БАНК»',
        bankMfo: '322001',
        iban: 'UA733220010000026002330029958',
        signedBy: 'Панкрат\'єв М.О.',
        rentalContract: {
            contractCity: 'м. Київ',
            personName: 'Панкрат\'єв Микола Олександрович',
            edrRecordDate: '14.03.2012',
            edrRecordNumber: '2 146 017 0000 012345',
        },
    },
    {
        id: 'fop_pankratiev_mykhailo',
        label: 'ФОП Панкрат\'єв Михайло О.',
        type: 'fop',
        recipientLine: 'Фізична особа-підприємець Панкрат\'єв Михайло Олександрович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Михайло Олександрович',
        taxIdLabel: 'ІПН',
        taxId: '3849711711',
        legalAddress: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
        bankName: 'АТ «УНІВЕРСАЛ БАНК»',
        bankMfo: '322001',
        iban: 'UA473220010000026001350113243',
        signedBy: 'Панкрат\'єв М.О.',
        rentalContract: {
            contractCity: 'м. Київ',
            personName: 'Панкрат\'єв Михайло Олександрович',
            edrRecordDate: '22.06.2015',
            edrRecordNumber: '2 146 017 0000 023456',
        },
    },
    {
        id: 'fop_pankratiev_om',
        label: 'ФОП Панкрат\'єв О.М.',
        type: 'fop',
        recipientLine: 'Фізична особа-підприємець Панкрат\'єв Олександр Миколайович',
        fullName: 'Фізична особа-підприємець Панкрат\'єв Олександр Миколайович',
        taxIdLabel: 'ІПН',
        taxId: '2490020092',
        legalAddress: '15300, Чернігівська обл., Корюківський р-н, м. Корюківка, вул. Садова, буд. 139',
        bankName: 'АТ «УКРСИББАНК»',
        bankMfo: '351005',
        iban: 'UA363510050000026008134274800',
        signedBy: 'Панкрат\'єв О.М.',
        rentalContract: {
            contractCity: 'м. Київ',
            personName: 'Панкрат\'єв Олександр Миколайович',
            edrRecordDate: '11.01.2006',
            edrRecordNumber: '2 146 017 0000 004725',
        },
    },
    {
        id: 'tov_pan_pivdenbud',
        label: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
        type: 'tov',
        recipientLine: 'ТОВ «ПАН-ПІВДЕНЬБУД»',
        fullName: 'ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ «ПАН-ПІВДЕНЬБУД»',
        taxIdLabel: 'ЄДРПОУ',
        taxId: '35061088',
        legalAddress: '03022, м. Київ, вул. Холодноярська, буд. 2А',
        bankName: 'АТ «УКРСИББАНК»',
        bankMfo: '351005',
        iban: 'UA243510050000026005122428702',
        signedBy: 'Панкрат\'єв О.М.',
        appliesVat: true,
    },
];

function getSeller(sellerId) {
    const id = resolveSellerId(sellerId);
    return SELLERS.find((s) => s.id === id) || SELLERS[0];
}

function resolveSellerId(sellerId) {
    const id = String(sellerId || '').trim();
    if (SELLERS.some((s) => s.id === id)) return id;
    return DEFAULT_SELLER_ID;
}

function getSellerOptions() {
    return SELLERS.map(({ id, label }) => ({ id, label }));
}

function getFopSellerOptions() {
    return SELLERS.filter((s) => s.type === 'fop').map(({ id, label }) => ({ id, label }));
}

function formatSupplierBlock(seller) {
    if (seller.type === 'tov') {
        return `${seller.fullName}\nЮр. адреса: ${seller.legalAddress}\n${seller.taxIdLabel} ${seller.taxId}`;
    }
    return `${seller.fullName}\nЮр. адреса: ${seller.legalAddress}\n${seller.taxIdLabel} ${seller.taxId}`;
}

module.exports = {
    DEFAULT_SELLER_ID,
    SELLERS,
    getSeller,
    resolveSellerId,
    getSellerOptions,
    getFopSellerOptions,
    formatSupplierBlock,
};
