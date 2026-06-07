const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=USD';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cache = { rates: null, fetchedAt: 0 };

async function getRates() {
    const now = Date.now();
    if (cache.rates && now - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.rates;
    }

    const res = await fetch(FRANKFURTER_URL);
    if (!res.ok) throw new Error('Failed to fetch exchange rates');
    const data = await res.json();

    // data.rates is relative to USD base, add USD itself
    cache = { rates: { USD: 1, ...data.rates }, fetchedAt: now };
    return cache.rates;
}

// Convert amount from one currency to another.
// Returns null if either currency is unsupported by the rates provider.
export async function convert(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;

    const rates = await getRates();
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) return null;

    // Convert via USD as base
    const usd = amount / fromRate;
    return usd * toRate;
}

// Normalize any billing cycle amount to a monthly equivalent.
export function toMonthly(amount, billingCycle) {
    switch (billingCycle) {
        case 'DAILY':   return amount * 30;
        case 'WEEKLY':  return amount * 4.33;
        case 'MONTHLY': return amount;
        case 'YEARLY':  return amount / 12;
        default:        return amount;
    }
}
