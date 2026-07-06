export function digitsOnly(s) {
    return String(s || '').replace(/\D/g, '');
}

export function normalizeUaPhone(raw) {
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

export function splitPhoneTokens(raw) {
    const s = String(raw || '').trim();
    if (!s) return [];
    if (/[,;]/.test(s)) {
        return s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    }
    return [s];
}

export function normalizePhonesField(raw) {
    const tokens = splitPhoneTokens(raw);
    const list = tokens.map(normalizeUaPhone).filter((p) => p.length >= 12);
    return [...new Set(list)].join(', ');
}

export function getNormalizedPhoneList(raw) {
    const tokens = splitPhoneTokens(raw);
    if (!tokens.length) return [];
    return [...new Set(tokens.map(normalizeUaPhone).filter((p) => p.length >= 12))];
}

export function parsePhones(raw) {
    return getNormalizedPhoneList(raw);
}

export function isValidUaPhone(raw) {
    const n = normalizeUaPhone(raw);
    return n.length === 12 && n.startsWith('380');
}
