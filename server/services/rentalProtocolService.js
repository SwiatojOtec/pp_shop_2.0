const path = require('path');
const { getSeller } = require('../constants/sellers');
const { numberToWordsUA } = require('../utils/numberToWordsUA');
const { generatePdfFromTemplate } = require('../utils/rentalDocxPdf');
const {
    checkRentalContractReadiness,
    buildContractNumber,
    buildClientPatchFromForm,
    resolveLesseeData,
} = require('../services/rentalContractService');

const TEMPLATE_PATH = path.join(__dirname, '../templates/rental-protocol-instrument.docx');

const UK_MONTHS_GENITIVE = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];

const DEFAULT_EQUIPMENT_CATEGORY = 'ІНСТРУМЕНТ';

function formatContractDate(date = new Date()) {
    const dt = date instanceof Date ? date : new Date(date);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = UK_MONTHS_GENITIVE[dt.getMonth()] || '';
    const year = String(dt.getFullYear());
    return { day, month, year };
}

function formatContractDateText(date = new Date()) {
    const { day, month, year } = formatContractDate(date);
    return `${day} ${month} ${year} року`;
}

function formatMoney(value) {
    const amount = Number(value) || 0;
    return amount.toFixed(2).replace('.', ',');
}

function splitPassport(passport) {
    const clean = String(passport || '').replace(/\s+/g, ' ').trim();
    const match = clean.match(/^([A-Za-zА-ЯІЇЄҐа-яіїєґ]{2})\s*(\d{6})$/u);
    if (match) {
        return { series: match[1].toUpperCase(), number: match[2] };
    }

    const compact = clean.replace(/\s/g, '');
    const compactMatch = compact.match(/^([A-Za-zА-ЯІЇЄҐ]{2})(\d{6})$/u);
    if (compactMatch) {
        return { series: compactMatch[1].toUpperCase(), number: compactMatch[2] };
    }

    return { series: '', number: clean };
}

function resolvePrepaymentAmount(rentalApplication) {
    const amount = parseFloat(rentalApplication?.totalAmount);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function buildTemplateTokens(order, seller, lessee, rentalApplication, protocolDate = new Date()) {
    const dateParts = formatContractDate(protocolDate);
    const rc = seller.rentalContract || {};
    const passport = splitPassport(lessee.passport);
    const prepayment = resolvePrepaymentAmount(rentalApplication);

    return {
        '[[CONTRACT_NUMBER]]': buildContractNumber(order, protocolDate),
        '[[CONTRACT_DAY]]': dateParts.day,
        '[[CONTRACT_MONTH]]': dateParts.month,
        '[[CONTRACT_YEAR]]': dateParts.year,
        '[[CONTRACT_DATE_TEXT]]': formatContractDateText(protocolDate),
        '[[PROTOCOL_DAY]]': dateParts.day,
        '[[PROTOCOL_MONTH]]': dateParts.month,
        '[[PROTOCOL_YEAR]]': dateParts.year,
        '[[LESSOR_PERSON_NAME]]': rc.personName || '',
        '[[LESSOR_EDR_DATE]]': rc.edrRecordDate || '',
        '[[LESSOR_EDR_RECORD]]': rc.edrRecordNumber || '',
        '[[CLIENT_NAME]]': lessee.fullName,
        '[[PASSPORT_SERIES]]': passport.series,
        '[[PASSPORT_NUMBER]]': passport.number,
        '[[PASSPORT_ISSUED]]': lessee.passportIssued,
        '[[CLIENT_ADDRESS]]': lessee.address,
        '[[CLIENT_PHONE]]': lessee.phone,
        '[[CLIENT_IPN]]': lessee.ipn,
        '[[EQUIPMENT_CATEGORY]]': DEFAULT_EQUIPMENT_CATEGORY,
        '[[PREPAYMENT_AMOUNT]]': formatMoney(prepayment),
        '[[PREPAYMENT_AMOUNT_WORDS]]': numberToWordsUA(prepayment),
    };
}

function checkRentalProtocolReadiness(params) {
    return checkRentalContractReadiness(params);
}

async function generateRentalProtocolPdf({
    order,
    sellerId,
    client,
    rentalApplication,
    patch = {},
}) {
    const check = checkRentalProtocolReadiness({
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

    const protocolDate = new Date();
    const tokens = buildTemplateTokens(
        order,
        check.seller,
        check.lessee,
        rentalApplication,
        protocolDate
    );
    const { pdfBuffer } = await generatePdfFromTemplate(TEMPLATE_PATH, tokens);

    return {
        pdfBuffer,
        fileName: `protokol_${buildContractNumber(order, protocolDate).replace(/\./g, '-')}.pdf`,
        lessee: check.lessee,
    };
}

module.exports = {
    TEMPLATE_PATH,
    DEFAULT_EQUIPMENT_CATEGORY,
    checkRentalProtocolReadiness,
    generateRentalProtocolPdf,
    buildTemplateTokens,
    buildClientPatchFromForm,
    resolveLesseeData,
    buildContractNumber,
};
