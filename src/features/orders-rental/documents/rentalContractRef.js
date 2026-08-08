const UK_MONTHS_GENITIVE = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

export function formatContractDate(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) {
        return { day: '__', month: '________', year: '____' };
    }
    return {
        day: String(dt.getDate()).padStart(2, '0'),
        month: UK_MONTHS_GENITIVE[dt.getMonth()] || '',
        year: String(dt.getFullYear()),
    };
}

export function buildContractNumber(orderRef, date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) {
        return '____';
    }
    const stamp = `${String(dt.getDate()).padStart(2, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getFullYear()).slice(-2)}`;
    const rawSuffix = String(orderRef?.orderNumber || orderRef?.id || '1').trim();
    const firstSlashPart = rawSuffix.split('/').map((p) => p.trim()).find(Boolean);
    const fallbackMatch = rawSuffix.match(/(\d+)/);
    const suffix = firstSlashPart || fallbackMatch?.[1] || String(orderRef?.id || '1');
    return `${stamp}/${suffix}`;
}

export function resolveContractDate(order, application) {
    if (application?.rentFrom) return new Date(application.rentFrom);
    if (order?.createdAt) return new Date(order.createdAt);
    if (application?.createdAt) return new Date(application.createdAt);
    return new Date();
}

export function resolveOrderRef(order, application) {
    return {
        id: order?.id || application?.id,
        orderNumber: order?.orderNumber || application?.applicationNumber || application?.id || '1',
    };
}

export function buildRentalActContractRef(order, application) {
    const orderRef = resolveOrderRef(order, application);
    const contractDate = resolveContractDate(order, application);
    const { day, month, year } = formatContractDate(contractDate);
    const contractNumber = buildContractNumber(orderRef, contractDate);

    return {
        contractNumber,
        contractDay: day,
        contractMonth: month,
        contractYear: year,
        appendixLines: [
            'Додаток № 2',
            `до Договору оренди обладнання № ${contractNumber}`,
            `від ${day} ${month} ${year} року.`,
        ],
    };
}
