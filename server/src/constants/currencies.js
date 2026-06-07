export const CURRENCIES = [
    { code: 'USD', name: 'US Dollar',           symbol: '$'  },
    { code: 'EUR', name: 'Euro',                symbol: '€'  },
    { code: 'UAH', name: 'Ukrainian Hryvnia',   symbol: '₴'  },
    { code: 'GBP', name: 'British Pound',       symbol: '£'  },
    { code: 'PLN', name: 'Polish Złoty',        symbol: 'zł' },
    { code: 'CAD', name: 'Canadian Dollar',     symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar',   symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc',         symbol: 'Fr' },
    { code: 'JPY', name: 'Japanese Yen',        symbol: '¥'  },
    { code: 'CZK', name: 'Czech Koruna',        symbol: 'Kč' },
    { code: 'SEK', name: 'Swedish Krona',       symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone',     symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone',        symbol: 'kr' },
    { code: 'HUF', name: 'Hungarian Forint',    symbol: 'Ft' },
    { code: 'RON', name: 'Romanian Leu',        symbol: 'lei'},
    { code: 'BGN', name: 'Bulgarian Lev',       symbol: 'лв' },
    { code: 'MXN', name: 'Mexican Peso',        symbol: '$'  },
    { code: 'BRL', name: 'Brazilian Real',      symbol: 'R$' },
    { code: 'INR', name: 'Indian Rupee',        symbol: '₹'  },
    { code: 'KRW', name: 'South Korean Won',    symbol: '₩'  },
];

export const CURRENCY_CODES = CURRENCIES.map(c => c.code);
