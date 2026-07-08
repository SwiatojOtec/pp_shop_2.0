const path = require('path');
const { getSeller, resolveSellerId } = require('../constants/sellers');
const { normalizeUaPhone } = require('../utils/phoneUtils');
const { generatePdfFromTemplate } = require('../utils/rentalDocxPdf');

const TEMPLATE_PATH = path.join(__dirname, '../templates/rental-contract-fop-individual.docx');

const UK_MONTHS_GENITIVE = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

const LESSEE_FIELD_DEFS = [
    { key: 'fullName', label: 'ПІБ' },
    { key: 'address', label: 'Адреса реєстрації' },
    { key: 'phone', label: 'Телефон' },
    { key: 'passport', label: 'Паспорт (серія та номер)' },
    { key: 'passportIssued', label: 'Дата видачі паспорта' },
    { key: 'ipn', label: 'ІПН' },
];

function pickString(...values) {
    for (const value of values) {
        const trimmed = String(value ?? '').trim();
        if (trimmed) return trimmed;
    }
    return '';
}

function formatContractDate(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = UK_MONTHS_GENITIVE[dt.getMonth()] || '';
    const year = String(dt.getFullYear());
    return { day, month, year };
}

function buildContractNumber(order, date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    const stamp = `${String(dt.getDate()).padStart(2, '0')}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getFullYear()).slice(-2)}`;
    const rawSuffix = String(order?.orderNumber || order?.id || '1').trim();
    const firstSlashPart = rawSuffix.split('/').map((p) => p.trim()).find(Boolean);
    const fallbackMatch = rawSuffix.match(/(\d+)/);
    const suffix = firstSlashPart || fallbackMatch?.[1] || String(order?.id || '1');
    return `${stamp}/${suffix}`;
}

function resolveLesseeData(order, client, rentalApplication, patch = {}) {
    const phone = normalizeUaPhone(
        pickString(patch.phone, client?.phone, rentalApplication?.clientPhone, order?.customerPhone)
    );

    return {
        fullName: pickString(patch.fullName, client?.fullName, rentalApplication?.clientName, order?.customerName),
        address: pickString(patch.address, client?.address, rentalApplication?.clientAddress, order?.address),
        phone: phone || pickString(patch.phone, client?.phone, rentalApplication?.clientPhone, order?.customerPhone),
        passport: pickString(patch.passport, client?.passport, rentalApplication?.clientPassport),
        passportIssued: pickString(patch.passportIssued, client?.passportIssuedAt),
        ipn: pickString(patch.ipn, client?.ipn),
    };
}

function listMissingLesseeFields(lessee) {
    return LESSEE_FIELD_DEFS
        .filter(({ key }) => !String(lessee[key] || '').trim())
        .map(({ key, label }) => ({
            key,
            label,
            value: '',
        }));
}

function validateSellerForContract(sellerId) {
    const seller = getSeller(sellerId);
    if (seller.type !== 'fop') {
        return {
            ok: false,
            missing: [{
                key: 'sellerId',
                label: 'Орендодавець (оберіть ФОП у полі «Орендодавець / Продавець»)',
                value: sellerId || '',
            }],
        };
    }

    const rc = seller.rentalContract || {};
    const missing = [];
    if (!rc.personName) missing.push({ key: 'sellerId', label: 'Дані орендодавця (ПІБ)', value: '' });
    if (!rc.edrRecordDate) missing.push({ key: 'sellerId', label: 'Дані орендодавця (дата запису ЄДР)', value: '' });
    if (!rc.edrRecordNumber) missing.push({ key: 'sellerId', label: 'Дані орендодавця (номер запису ЄДР)', value: '' });

    if (missing.length) {
        return { ok: false, missing };
    }

    return { ok: true, seller };
}

function buildTemplateTokens(order, seller, lessee, contractDate = new Date(), contractNumber = null) {
    const dateParts = formatContractDate(contractDate);
    const rc = seller.rentalContract || {};
    const resolvedContractNumber = String(contractNumber || '').trim() || buildContractNumber(order, contractDate);

    return {
        '[[CONTRACT_NUMBER]]': resolvedContractNumber,
        '[[CONTRACT_DAY]]': dateParts.day,
        '[[CONTRACT_MONTH]]': dateParts.month,
        '[[CONTRACT_YEAR]]': dateParts.year,
        '[[LESSOR_PERSON_NAME]]': rc.personName || '',
        '[[LESSOR_EDR_DATE]]': rc.edrRecordDate || '',
        '[[LESSOR_EDR_RECORD]]': rc.edrRecordNumber || '',
        '[[CLIENT_NAME]]': lessee.fullName,
        '[[PASSPORT_NUMBER]]': lessee.passport,
        '[[PASSPORT_ISSUED]]': lessee.passportIssued,
        '[[CLIENT_ADDRESS]]': lessee.address,
        '[[CLIENT_PHONE]]': lessee.phone,
        '[[CLIENT_IPN]]': lessee.ipn,
    };
}

function checkRentalContractReadiness({ order, client, rentalApplication, sellerId, patch = {} }) {
    const sellerCheck = validateSellerForContract(sellerId);
    if (!sellerCheck.ok) {
        return { ready: false, missing: sellerCheck.missing };
    }

    const lessee = resolveLesseeData(order, client, rentalApplication, patch);
    const missing = listMissingLesseeFields(lessee);

    if (missing.length) {
        return { ready: false, missing, lessee };
    }

    return { ready: true, lessee, seller: sellerCheck.seller };
}

async function generateRentalContractPdf({ order, sellerId, client, rentalApplication, patch = {} }) {
    const check = checkRentalContractReadiness({
        order,
        client,
        rentalApplication,
        sellerId,
        patch,
    });

    if (!check.ready) {
        const err = new Error('Даних для створення не вистачає');
        err.status = 400;
        err.missing = check.missing;
        throw err;
    }

    const contractDate = new Date(order?.createdAt || Date.now());
    const resolvedContractNumber = String(patch?.contractNumber || '').trim() || buildContractNumber(order, contractDate);
    const tokens = buildTemplateTokens(order, check.seller, check.lessee, contractDate, resolvedContractNumber);
    const { pdfBuffer } = await generatePdfFromTemplate(TEMPLATE_PATH, tokens);

    return {
        pdfBuffer,
        fileName: `dogovir_${resolvedContractNumber.replace(/\//g, '-')}.pdf`,
        lessee: check.lessee,
    };
}

function buildClientPatchFromForm(patch = {}) {
    const out = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'fullName')) out.fullName = patch.fullName;
    if (Object.prototype.hasOwnProperty.call(patch, 'address')) out.address = patch.address;
    if (Object.prototype.hasOwnProperty.call(patch, 'phone')) out.phone = patch.phone;
    if (Object.prototype.hasOwnProperty.call(patch, 'passport')) out.passport = patch.passport;
    if (Object.prototype.hasOwnProperty.call(patch, 'passportIssued')) {
        out.passportIssuedAt = patch.passportIssued;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'ipn')) out.ipn = patch.ipn;
    return out;
}

module.exports = {
    LESSEE_FIELD_DEFS,
    resolveLesseeData,
    checkRentalContractReadiness,
    generateRentalContractPdf,
    buildClientPatchFromForm,
    buildContractNumber,
    resolveSellerId,
};
