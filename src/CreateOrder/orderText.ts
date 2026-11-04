/** Placeholders from the order template, in document order. */
export const TEMPLATE_PLACEHOLDERS = [
    'NAZEV_OBJEDNAVKY',
    'NAZEV_ZAKAZNIKA',
    'SIDLO_ZAKAZNIKA',
    'ICO_ZAKAZNIKA',
    'EMAIL_ZAKAZNIKA',
    'PREDMET_OBJEDNAVKY',
    'TECHNICKA_SPECIFIKACE',
    'ROZSAH_PLNENI',
    'SOUCINNOST_ZAKAZNIKA_A_PODMINKY',
    'TERMIN_DODANI',
    'CENA_PLNENI',
    'MENA',
    'PLATEBNI_HARMONOGRAM',
    'DOPLNUJICI_PLATEBNI_UJEDNANI',
    'DATUM_PODPISU_ZAKAZNIK',
    'PODPIS_ZAKAZNIK',
    'DATUM_PODPISU_POSKYTOVATEL',
    'PODPIS_POSKYTOVATEL',
] as const;

export type PlaceholderName = typeof TEMPLATE_PLACEHOLDERS[number];

const LEGAL_FORM = /\b(?:s\.?\s*r\.?\s*o\.?|spol\.?\s*s\.?\s*r\.?\s*o\.?|a\.?\s*s\.?|v\.?\s*o\.?\s*s\.?|z\.?\s*s\.?|k\.?\s*s\.?)\b/g;

export function placeholder(name: string): string {
    return `{{${name}}}`;
}

export function normalizeName(value: string): string {
    const plain = value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    return plain
        .replace(LEGAL_FORM, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

/** First significant word, so a long ARES name still finds a shorter client folder. */
export function folderSearchToken(name: string): string {
    const normalized = normalizeName(name);
    const first = normalized.split(' ').find((part) => part.length >= 3);
    return first ?? normalized;
}

export function formatAmount(value: number): string {
    const [whole, fraction] = String(value).split('.');
    const grouped = whole.replace(/\B(?=(?:\d{3})+(?!\d))/g, ' ');
    return fraction ? `${grouped},${fraction}` : grouped;
}

/** Hourly rate plus the estimate. Not a made-up fixed total. */
export function formatPrice(hourlyRate: number, effortMd: number): string {
    return `${formatAmount(hourlyRate)} / hod, odhad ${formatAmount(effortMd)} MD`;
}

export function formatScope(effortMd: number): string {
    return `${formatAmount(effortMd)} MD (${formatAmount(effortMd * 8)} h)`;
}

export function formatCurrency(currency: string | undefined): string {
    if (!currency || currency.toUpperCase() === 'CZK') {
        return 'Kč';
    }
    return currency;
}

export function formatOrderDate(now = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
}

export function unfilledPlaceholders(replacements: Record<string, string>): string[] {
    return TEMPLATE_PLACEHOLDERS
        .map((name) => placeholder(name))
        .filter((token) => !replacements[token]?.trim());
}
