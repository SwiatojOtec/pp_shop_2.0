'use strict';

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const SOURCE = process.argv[2] || 'd:/архив/telega/3_Додаток_№1_Протокол_ІНСТРУМЕНТ.docx';
const TARGET = path.join(__dirname, '../templates/rental-protocol-instrument.docx');

const REPLACEMENTS = [
    ['Панкрат’єв Олександр Миколайович', '[[LESSOR_PERSON_NAME]]'],
    ['11.01.2006', '[[LESSOR_EDR_DATE]]'],
    ['2 146 017 0000 004725', '[[LESSOR_EDR_RECORD]]'],
    ['ІНСТРУМЕНТ', '[[EQUIPMENT_CATEGORY]]'],
    ['_________________________________________________________________________________________ ,', '[[CLIENT_NAME]] ,'],
    ['_____________________________________________________________________________________________', '[[PASSPORT_ISSUED]]'],
    ['  __________________________________________________________________________________________', '[[CLIENT_ADDRESS]]'],
    ['_______________________________________________________________________', ''],
    ['___________________________________________________________________________________ ', ''],
    [
        'Договору оренди обладнання № ______ від ____________________(надалі-',
        'Договору оренди обладнання № [[CONTRACT_NUMBER]] від [[CONTRACT_DATE_TEXT]](надалі-',
    ],
    ['серія ________№ ___________  виданий ', 'серія [[PASSPORT_SERIES]]№ [[PASSPORT_NUMBER]]  виданий '],
    ['Паспорт : серія ________ номер ______________', 'Паспорт : серія [[PASSPORT_SERIES]] номер [[PASSPORT_NUMBER]]'],
    ['Паспорт : серія ________ номер _________', 'Паспорт : серія [[PASSPORT_SERIES]] номер [[PASSPORT_NUMBER]]'],
    ['виданий   ____________________________', 'виданий   [[PASSPORT_ISSUED]]'],
    ['П.І.Б _________________________________', 'П.І.Б [[CLIENT_NAME]]'],
    [' _________________________________', ' [[CLIENT_NAME]]'],
    ['Адреса реєстрації : ____________________', 'Адреса реєстрації : [[CLIENT_ADDRESS]]'],
    ['_________________________________________', ''],
    ['__________________________________________', ''],
    ['Тел. ___________________________', 'Тел. [[CLIENT_PHONE]]'],
    ['Ідентифікаційний номер ________________', 'Ідентифікаційний номер [[CLIENT_IPN]]'],
    ['____________________/_________', ''],
    ['_____________', ''],
    ['у розмірі _________', 'у розмірі [[PREPAYMENT_AMOUNT]]'],
    ['(                              .)', '([[PREPAYMENT_AMOUNT_WORDS]])'],
    ['_______________________________', ''],
    ['________________________________', ''],
    ['____________________________', ''],
];

function patchTemplateDatesAndAmount(xml) {
    let out = xml;

    const contractDayIdx = out.indexOf('від _____');
    if (contractDayIdx !== -1) {
        out = `${out.slice(0, contractDayIdx)}від [[CONTRACT_DAY]]${out.slice(contractDayIdx + 'від _____'.length)}`;
    }

    out = out.replace(
        /(від \[\[CONTRACT_DAY\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)\/(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)______________/,
        '$1/$2[[CONTRACT_MONTH]]'
    );
    out = out.replace(
        /(\[\[CONTRACT_MONTH\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)2026/,
        '$1[[CONTRACT_YEAR]]'
    );

    const protocolDayIdx = out.indexOf('д ____');
    if (protocolDayIdx !== -1) {
        out = `${out.slice(0, protocolDayIdx)}д [[PROTOCOL_DAY]]${out.slice(protocolDayIdx + 'д ____'.length)}`;
    }

    out = out.replace(
        /(д \[\[PROTOCOL_DAY\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)____(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>\/)/,
        '$1$2'
    );
    out = out.replace(
        /(д \[\[PROTOCOL_DAY\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>\/)(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)_______________/,
        '$1[[PROTOCOL_MONTH]]$2'
    );
    out = out.replace(
        /(\[\[PROTOCOL_MONTH\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)20(<\/w:t><\/w:r>[\s\S]{0,120}<w:t>)26/,
        '$1[[PROTOCOL_YEAR]]$2'
    );

    return out;
}

function finalizeTemplate(xml) {
    let out = xml;

    out = out.replace(
        /(у розмірі <\/w:t><\/w:r>[\s\S]{0,200}<w:t>)_________(<\/w:t>)/,
        '$1[[PREPAYMENT_AMOUNT]]$2'
    );
    out = out.replace(
        /(у розмірі \[\[PREPAYMENT_AMOUNT\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t[^>]*>)\s*\(\[\[PREPAYMENT_AMOUNT_WORDS\]\]\)/,
        '$1([[PREPAYMENT_AMOUNT_WORDS]])'
    );

    if (!out.includes('[[CONTRACT_YEAR]]')) {
        out = out.replace(
            /(<w:t>\[\[CONTRACT_MONTH\]\]<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)202(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)6(<\/w:t>)/,
            '<w:t>[[CONTRACT_MONTH]] [[CONTRACT_YEAR]]</w:t>'
        );
    }

    if (!out.includes('[[PROTOCOL_MONTH]]')) {
        out = out.replace(
            /(<w:t>\/<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)__20(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)2(<\/w:t><\/w:r>[\s\S]{0,200}<w:t>)6(<\/w:t>)/,
            '<w:t>[[PROTOCOL_MONTH]] [[PROTOCOL_YEAR]]</w:t>'
        );
    }

    return out;
}

function replaceContractNumberInHeader(xml) {
    const marker = 'обладнання №</w:t></w:r>';
    const markerIdx = xml.indexOf(marker);
    if (markerIdx === -1) {
        console.warn('Contract number marker not found');
        return xml;
    }
    const before = xml.slice(0, markerIdx + marker.length);
    const after = xml.slice(markerIdx + marker.length);
    const updatedAfter = after.replace('<w:t>____</w:t>', '<w:t>[[CONTRACT_NUMBER]]</w:t>');
    return before + updatedAfter;
}

function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source template missing:', SOURCE);
        process.exit(1);
    }

    const zip = new PizZip(fs.readFileSync(SOURCE));
    let xml = zip.file('word/document.xml').asText();

    xml = patchTemplateDatesAndAmount(xml);

    const sorted = [...REPLACEMENTS].sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of sorted) {
        xml = xml.split(from).join(to);
    }

    xml = replaceContractNumberInHeader(xml);

    xml = xml.replace(
        /Договору оренди обладнання № ______ від[\s\S]{0,40}?(?:__+|\[\[CONTRACT_DAY\]\]__*)(\(надалі-)/,
        'Договору оренди обладнання № [[CONTRACT_NUMBER]] від [[CONTRACT_DATE_TEXT]]$1'
    );

    xml = xml.replace(
        /(у розмірі <\/w:t><\/w:r>[\s\S]{0,300}<w:t[^>]*>)\s*\(\[\[PREPAYMENT_AMOUNT_WORDS\]\]\)/,
        '$1[[PREPAYMENT_AMOUNT]] ([[PREPAYMENT_AMOUNT_WORDS]])'
    );

    xml = finalizeTemplate(xml);

    xml = xml.replace(/<w:t>, паспорт:<\/w:t>/g, '<w:t>[[CLIENT_NAME]], паспорт:</w:t>');
    xml = xml.replace(
        /<w:t>та<\/w:t>[\s\S]{0,1200}?<w:t[^>]*>:<\/w:t>[\s\S]{0,1200}?<w:t[^>]*> , <\/w:t>[\s\S]{0,800}?<w:t[^>]*>паспорт<\/w:t>/,
        '<w:t>та: [[CLIENT_NAME]], паспорт</w:t>'
    );
    xml = xml.replace(/<w:t>__<\/w:t>/g, '');
    xml = xml.replace(/виданий __\[\[PASSPORT_ISSUED\]\]/g, 'виданий [[PASSPORT_ISSUED]]');
    xml = xml.replace(/<w:t>___________<\/w:t>/g, '');
    xml = xml.replace(/<w:t>_____<\/w:t>/g, '');

    zip.file('word/document.xml', xml);
    fs.mkdirSync(path.dirname(TARGET), { recursive: true });
    fs.writeFileSync(TARGET, zip.generate({ type: 'nodebuffer' }));

    const tokens = [...xml.matchAll(/\[\[[A-Z_]+\]\]/g)].map((m) => m[0]);
    const unders = [...xml.matchAll(/<w:t[^>]*>([_]{3,}[^<]*)<\/w:t>/g)].map((m) => m[1].slice(0, 40));
    console.log('Template written to', TARGET);
    console.log('Tokens:', [...new Set(tokens)].sort().join(', '));
    if (unders.length) console.warn('Remaining underscores:', unders);
}

main();
