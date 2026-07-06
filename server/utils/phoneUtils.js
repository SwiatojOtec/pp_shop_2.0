function digitsOnly(s) {
    return String(s || '').replace(/\D/g, '');
}

/** Один номер → 380XXXXXXXXX (12 цифр для UA мобільного). */
function normalizeUaPhone(raw) {
    let d = digitsOnly(raw);
    if (!d) return '';

    if (d.length === 10 && d.startsWith('0')) {
        d = `38${d}`;
    } else if (d.length === 9) {
        d = `380${d}`;
    } else if (d.length === 11 && d.startsWith('80')) {
        d = `3${d}`;
    } else if (d.length > 12) {
        const idx = d.indexOf('380');
        if (idx >= 0) {
            d = d.slice(idx, idx + 12);
        } else {
            d = `380${d.slice(-9)}`;
        }
    }

    return d;
}

/** Розбити поле з кількома номерами (кома / крапка з комою). */
function splitPhoneTokens(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    if (/[,;]/.test(s)) {
        return s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    }
    return [s];
}

/** Поле з одним або кількома номерами → «380…, 380…». */
function normalizePhonesField(raw) {
    const tokens = splitPhoneTokens(raw);
    const list = tokens.map(normalizeUaPhone).filter((p) => p.length >= 12);
    return [...new Set(list)].join(', ');
}

function getNormalizedPhoneList(raw) {
    const tokens = splitPhoneTokens(raw);
    if (!tokens.length) return [];
    return [...new Set(tokens.map(normalizeUaPhone).filter((p) => p.length >= 12))];
}

function phoneTailsMatch(a, b) {
    const la = getNormalizedPhoneList(a);
    const lb = getNormalizedPhoneList(b);
    if (!la.length) {
        const na = normalizeUaPhone(a);
        if (!na) return false;
        if (!lb.length) {
            const nb = normalizeUaPhone(b);
            return !!nb && (na === nb || na.slice(-9) === nb.slice(-9));
        }
        return lb.some((pb) => na === pb || na.slice(-9) === pb.slice(-9));
    }
    if (!lb.length) {
        const nb = normalizeUaPhone(b);
        if (!nb) return false;
        return la.some((pa) => pa === nb || pa.slice(-9) === nb.slice(-9));
    }
    return la.some((pa) => lb.some((pb) => pa === pb));
}

function parsePhones(raw) {
    return getNormalizedPhoneList(raw);
}

module.exports = {
    digitsOnly,
    normalizeUaPhone,
    normalizePhonesField,
    getNormalizedPhoneList,
    phoneTailsMatch,
    parsePhones,
    splitPhoneTokens,
};
