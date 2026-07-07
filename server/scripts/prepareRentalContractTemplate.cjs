'use strict';

const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const SOURCE = path.join(__dirname, '../../scripts/_contract_template.docx');
const TARGET = path.join(__dirname, '../templates/rental-contract-fop-individual.docx');

const REPLACEMENTS = [
    ['07.07.2026_1', '[[CONTRACT_NUMBER]]'],
    ['Иванов Иван Иванович', '[[CLIENT_NAME]]'],
    ['009108906', '[[PASSPORT_NUMBER]]'],
    ['05.05.2023', '[[PASSPORT_ISSUED]]'],
    ['Україна, Луганська область, Первомайський район, смт. Нижнє, вул. Куйбишева, буд. 2', '[[CLIENT_ADDRESS]]'],
    ['П.І.Б Ткаченко Олександр Степанович', 'П.І.Б [[CLIENT_NAME]]'],
    ['3087514012', '[[CLIENT_IPN]]'],
    ['+380505561307', '[[CLIENT_PHONE]]'],
    ['Панкрат’єв Олександр Миколайович', '[[LESSOR_PERSON_NAME]]'],
    ['11.01.2006', '[[LESSOR_EDR_DATE]]'],
    ['2 146 017 0000 004725', '[[LESSOR_EDR_RECORD]]'],
    ['>07</w:t>', '>[[CONTRACT_DAY]]</w:t>'],
    ['липня', '[[CONTRACT_MONTH]]'],
    ['>2026</w:t>', '>[[CONTRACT_YEAR]]</w:t>'],
];

const REMOVE_FRAGMENTS = [
    '_______________',
    'тут',
    'зазвичай',
    'пишу я: «До',
    'виконання',
    'умов договору», но можно и дату конца',
    'оренды',
    'подвязать, просто иногда',
    'оренду',
    'могут продлить, а договор закон',
    'Адреса реєстрації: Україна, Луганська область,',
    'Первомайський район, смт. Нижнє,',
    'вул. Куйбишева, буд. 2',
    'Паспорт: серія - номер 009108906',
    'Виданий:   05.05.2023',
    'Тел',
    '.: +380505561307',
    'Ідентифікаційний номер: 3087514012',
];

function main() {
    if (!fs.existsSync(SOURCE)) {
        console.error('Source template missing:', SOURCE);
        process.exit(1);
    }

    const zip = new PizZip(fs.readFileSync(SOURCE));
    let xml = zip.file('word/document.xml').asText();

    for (const [from, to] of REPLACEMENTS) {
        xml = xml.split(from).join(to);
    }

    for (const fragment of REMOVE_FRAGMENTS) {
        xml = xml.split(fragment).join('');
    }

    zip.file('word/document.xml', xml);
    fs.mkdirSync(path.dirname(TARGET), { recursive: true });
    fs.writeFileSync(TARGET, zip.generate({ type: 'nodebuffer' }));
    console.log('Template written to', TARGET);
}

main();
