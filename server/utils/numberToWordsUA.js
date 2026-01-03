/**
 * Converts a number to Ukrainian words (currency format)
 * Example: 123.45 -> "Сто двадцять три гривні 45 копійок"
 */
function numberToWordsUA(amount) {
    const units = [
        ['', '', ''],
        ['одна', 'дві', 'три', 'чотири', 'п\'ять', 'шість', 'сім', 'вісім', 'дев\'ять'],
        ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', 'п\'ятнадцять', 'шістнадцять', 'сімнадцять', 'вісімнадцять', 'дев\'ятнадцять'],
        ['', '', 'двадцять', 'тридцять', 'сорок', 'п\'ятдесят', 'шістдесят', 'сімдесят', 'вісімдесят', 'дев\'яносто'],
        ['', 'сто', 'двісті', 'триста', 'чотириста', 'п\'ятсот', 'шістсот', 'сімсот', 'вісімсот', 'дев\'ятсот']
    ];

    const thousands = [
        ['тисяча', 'тисячі', 'тисяч'],
        ['мільйон', 'мільйони', 'мільйонів'],
        ['мільярд', 'мільярди', 'мільярдів']
    ];

    const currency = ['гривня', 'гривні', 'гривень'];

    function getDeclension(n, forms) {
        n = Math.abs(n) % 100;
        const n1 = n % 10;
        if (n > 10 && n < 20) return forms[2];
        if (n1 > 1 && n1 < 5) return forms[1];
        if (n1 === 1) return forms[0];
        return forms[2];
    }

    function translateThreeDigits(n, isFeminine = false) {
        if (n === 0) return '';
        let res = [];
        const h = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) res.push(units[4][h]);

        if (d === 1) {
            res.push(units[2][u]);
        } else {
            if (d > 1) res.push(units[3][d]);
            if (u > 0) {
                if (isFeminine) {
                    if (u === 1) res.push('одна');
                    else if (u === 2) res.push('дві');
                    else res.push(units[1][u - 1]);
                } else {
                    res.push(units[1][u - 1]);
                }
            }
        }
        return res.join(' ');
    }

    if (amount === 0) return 'Нуль гривень 00 копійок';

    const parts = amount.toFixed(2).split('.');
    let intPart = parseInt(parts[0]);
    const decPart = parts[1];

    let result = [];
    let power = 0;

    if (intPart === 0) {
        result.push('нуль');
    } else {
        while (intPart > 0) {
            const threeDigits = intPart % 1000;
            if (threeDigits > 0) {
                let str = translateThreeDigits(threeDigits, power === 1);
                if (power > 0) {
                    str += ' ' + getDeclension(threeDigits, thousands[power - 1]);
                }
                result.unshift(str);
            }
            intPart = Math.floor(intPart / 1000);
            power++;
        }
    }

    const finalStr = result.join(' ').trim();
    const capitalized = finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
    const currencyStr = getDeclension(parseInt(parts[0]), currency);

    return `${capitalized} ${currencyStr} ${decPart} копійок`;
}

module.exports = { numberToWordsUA };
