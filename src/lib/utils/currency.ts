/**
 * Get currency symbol based on country name
 * @param country - Country name (e.g., "United Kingdom", "United States")
 * @returns Currency symbol (e.g., "£", "$", "€")
 */
export function getCurrencySymbol(country: string | null | undefined): string {
  if (!country) return '£'; // Default to GBP

  const countryLower = country.toLowerCase().trim();

  // GBP - British Pound
  if (
    countryLower.includes('united kingdom') ||
    countryLower.includes('uk') ||
    countryLower.includes('england') ||
    countryLower.includes('scotland') ||
    countryLower.includes('wales') ||
    countryLower.includes('northern ireland') ||
    countryLower.includes('britain')
  ) {
    return '£';
  }

  // USD - US Dollar
  if (
    countryLower.includes('united states') ||
    countryLower.includes('usa') ||
    countryLower.includes('america') ||
    countryLower.includes('us')
  ) {
    return '$';
  }

  // EUR - Euro
  if (
    countryLower.includes('germany') ||
    countryLower.includes('france') ||
    countryLower.includes('italy') ||
    countryLower.includes('spain') ||
    countryLower.includes('portugal') ||
    countryLower.includes('netherlands') ||
    countryLower.includes('belgium') ||
    countryLower.includes('austria') ||
    countryLower.includes('ireland') ||
    countryLower.includes('greece') ||
    countryLower.includes('finland') ||
    countryLower.includes('slovakia') ||
    countryLower.includes('slovenia') ||
    countryLower.includes('estonia') ||
    countryLower.includes('latvia') ||
    countryLower.includes('lithuania') ||
    countryLower.includes('luxembourg') ||
    countryLower.includes('malta') ||
    countryLower.includes('cyprus')
  ) {
    return '€';
  }

  // CAD - Canadian Dollar
  if (countryLower.includes('canada')) {
    return '$';
  }

  // AUD - Australian Dollar
  if (countryLower.includes('australia')) {
    return '$';
  }

  // NZD - New Zealand Dollar
  if (countryLower.includes('new zealand')) {
    return '$';
  }

  // CHF - Swiss Franc
  if (countryLower.includes('switzerland')) {
    return 'CHF';
  }

  // SEK - Swedish Krona
  if (countryLower.includes('sweden')) {
    return 'kr';
  }

  // NOK - Norwegian Krone
  if (countryLower.includes('norway')) {
    return 'kr';
  }

  // DKK - Danish Krone
  if (countryLower.includes('denmark')) {
    return 'kr';
  }

  // JPY - Japanese Yen
  if (countryLower.includes('japan')) {
    return '¥';
  }

  // CNY - Chinese Yuan
  if (countryLower.includes('china')) {
    return '¥';
  }

  // INR - Indian Rupee
  if (countryLower.includes('india')) {
    return '₹';
  }

  // ZAR - South African Rand
  if (countryLower.includes('south africa')) {
    return 'R';
  }

  // BRL - Brazilian Real
  if (countryLower.includes('brazil')) {
    return 'R$';
  }

  // MXN - Mexican Peso
  if (countryLower.includes('mexico')) {
    return '$';
  }

  // PLN - Polish Zloty
  if (countryLower.includes('poland')) {
    return 'zł';
  }

  // CZK - Czech Koruna
  if (countryLower.includes('czech')) {
    return 'Kč';
  }

  // HUF - Hungarian Forint
  if (countryLower.includes('hungary')) {
    return 'Ft';
  }

  // RON - Romanian Leu
  if (countryLower.includes('romania')) {
    return 'lei';
  }

  // BGN - Bulgarian Lev
  if (countryLower.includes('bulgaria')) {
    return 'лв';
  }

  // HRK - Croatian Kuna (now EUR)
  if (countryLower.includes('croatia')) {
    return '€';
  }

  // TRY - Turkish Lira
  if (countryLower.includes('turkey')) {
    return '₺';
  }

  // RUB - Russian Ruble
  if (countryLower.includes('russia')) {
    return '₽';
  }

  // UAH - Ukrainian Hryvnia
  if (countryLower.includes('ukraine')) {
    return '₴';
  }

  // SGD - Singapore Dollar
  if (countryLower.includes('singapore')) {
    return '$';
  }

  // HKD - Hong Kong Dollar
  if (countryLower.includes('hong kong')) {
    return '$';
  }

  // KRW - South Korean Won
  if (countryLower.includes('korea') || countryLower.includes('south korea')) {
    return '₩';
  }

  // THB - Thai Baht
  if (countryLower.includes('thailand')) {
    return '฿';
  }

  // MYR - Malaysian Ringgit
  if (countryLower.includes('malaysia')) {
    return 'RM';
  }

  // IDR - Indonesian Rupiah
  if (countryLower.includes('indonesia')) {
    return 'Rp';
  }

  // PHP - Philippine Peso
  if (countryLower.includes('philippines')) {
    return '₱';
  }

  // AED - UAE Dirham
  if (countryLower.includes('emirates') || countryLower.includes('dubai')) {
    return 'AED';
  }

  // SAR - Saudi Riyal
  if (countryLower.includes('saudi')) {
    return 'SAR';
  }

  // ILS - Israeli Shekel
  if (countryLower.includes('israel')) {
    return '₪';
  }

  // Default to GBP if country not recognized
  return '£';
}

/**
 * Format a rate value with currency symbol
 * @param rate - The rate value (can be string or number)
 * @param country - Country name to determine currency
 * @returns Formatted rate string (e.g., "£80", "$100")
 */
export function formatRateWithCurrency(
  rate: string | number | null | undefined,
  country: string | null | undefined
): string {
  if (!rate) return '';
  
  const currencySymbol = getCurrencySymbol(country);
  const rateValue = typeof rate === 'string' ? rate : rate.toString();
  
  // If the rate already includes a currency symbol, return as-is
  if (/[£$€¥₹₺₽₴₩฿₱₪]/.test(rateValue)) {
    return rateValue;
  }
  
  return `${currencySymbol}${rateValue}`;
}




















