// VAT handling for UK/EU customers
export interface VATRate {
  countryCode: string;
  countryName: string;
  vatRate: number;
  isEU: boolean;
}

export interface VATCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  countryCode: string;
  isVATApplicable: boolean;
}

// UK and EU VAT rates (as of 2024)
export const VAT_RATES: Record<string, VATRate> = {
  'GB': { countryCode: 'GB', countryName: 'United Kingdom', vatRate: 20, isEU: false },
  'AT': { countryCode: 'AT', countryName: 'Austria', vatRate: 20, isEU: true },
  'BE': { countryCode: 'BE', countryName: 'Belgium', vatRate: 21, isEU: true },
  'BG': { countryCode: 'BG', countryName: 'Bulgaria', vatRate: 20, isEU: true },
  'HR': { countryCode: 'HR', countryName: 'Croatia', vatRate: 25, isEU: true },
  'CY': { countryCode: 'CY', countryName: 'Cyprus', vatRate: 19, isEU: true },
  'CZ': { countryCode: 'CZ', countryName: 'Czech Republic', vatRate: 21, isEU: true },
  'DK': { countryCode: 'DK', countryName: 'Denmark', vatRate: 25, isEU: true },
  'EE': { countryCode: 'EE', countryName: 'Estonia', vatRate: 20, isEU: true },
  'FI': { countryCode: 'FI', countryName: 'Finland', vatRate: 24, isEU: true },
  'FR': { countryCode: 'FR', countryName: 'France', vatRate: 20, isEU: true },
  'DE': { countryCode: 'DE', countryName: 'Germany', vatRate: 19, isEU: true },
  'GR': { countryCode: 'GR', countryName: 'Greece', vatRate: 24, isEU: true },
  'HU': { countryCode: 'HU', countryName: 'Hungary', vatRate: 27, isEU: true },
  'IE': { countryCode: 'IE', countryName: 'Ireland', vatRate: 23, isEU: true },
  'IT': { countryCode: 'IT', countryName: 'Italy', vatRate: 22, isEU: true },
  'LV': { countryCode: 'LV', countryName: 'Latvia', vatRate: 21, isEU: true },
  'LT': { countryCode: 'LT', countryName: 'Lithuania', vatRate: 21, isEU: true },
  'LU': { countryCode: 'LU', countryName: 'Luxembourg', vatRate: 17, isEU: true },
  'MT': { countryCode: 'MT', countryName: 'Malta', vatRate: 18, isEU: true },
  'NL': { countryCode: 'NL', countryName: 'Netherlands', vatRate: 21, isEU: true },
  'PL': { countryCode: 'PL', countryName: 'Poland', vatRate: 23, isEU: true },
  'PT': { countryCode: 'PT', countryName: 'Portugal', vatRate: 23, isEU: true },
  'RO': { countryCode: 'RO', countryName: 'Romania', vatRate: 19, isEU: true },
  'SK': { countryCode: 'SK', countryName: 'Slovakia', vatRate: 20, isEU: true },
  'SI': { countryCode: 'SI', countryName: 'Slovenia', vatRate: 22, isEU: true },
  'ES': { countryCode: 'ES', countryName: 'Spain', vatRate: 21, isEU: true },
  'SE': { countryCode: 'SE', countryName: 'Sweden', vatRate: 25, isEU: true },
};

export class VATService {
  /**
   * Calculate VAT for a given amount and country
   */
  static calculateVAT(
    netAmount: number,
    countryCode: string,
    isBusinessCustomer: boolean = false,
    hasValidVATNumber: boolean = false
  ): VATCalculation {
    const vatRate = VAT_RATES[countryCode.toUpperCase()];
    
    // No VAT for non-UK/EU countries
    if (!vatRate) {
      return {
        netAmount,
        vatAmount: 0,
        grossAmount: netAmount,
        vatRate: 0,
        countryCode,
        isVATApplicable: false,
      };
    }

    // EU B2B customers with valid VAT number are exempt (reverse charge)
    const isVATExempt = vatRate.isEU && 
                       vatRate.countryCode !== 'GB' && 
                       isBusinessCustomer && 
                       hasValidVATNumber;

    if (isVATExempt) {
      return {
        netAmount,
        vatAmount: 0,
        grossAmount: netAmount,
        vatRate: 0,
        countryCode,
        isVATApplicable: false,
      };
    }

    // Calculate VAT
    const vatAmount = Math.round((netAmount * vatRate.vatRate) / 100);
    const grossAmount = netAmount + vatAmount;

    return {
      netAmount,
      vatAmount,
      grossAmount,
      vatRate: vatRate.vatRate,
      countryCode,
      isVATApplicable: true,
    };
  }

  /**
   * Validate VAT number format (basic validation)
   */
  static validateVATNumber(vatNumber: string, countryCode: string): boolean {
    if (!vatNumber || !countryCode) return false;

    const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
    const country = countryCode.toUpperCase();

    // Basic format validation by country
    const patterns: Record<string, RegExp> = {
      'GB': /^GB\d{9}$|^GB\d{12}$|^GBGD\d{3}$|^GBHA\d{3}$/,
      'AT': /^ATU\d{8}$/,
      'BE': /^BE0\d{9}$/,
      'BG': /^BG\d{9,10}$/,
      'HR': /^HR\d{11}$/,
      'CY': /^CY\d{8}[A-Z]$/,
      'CZ': /^CZ\d{8,10}$/,
      'DK': /^DK\d{8}$/,
      'EE': /^EE\d{9}$/,
      'FI': /^FI\d{8}$/,
      'FR': /^FR[A-Z0-9]{2}\d{9}$/,
      'DE': /^DE\d{9}$/,
      'GR': /^GR\d{9}$/,
      'HU': /^HU\d{8}$/,
      'IE': /^IE\d[A-Z0-9]\d{5}[A-Z]$|^IE\d{7}[A-Z]{2}$/,
      'IT': /^IT\d{11}$/,
      'LV': /^LV\d{11}$/,
      'LT': /^LT\d{9}$|^LT\d{12}$/,
      'LU': /^LU\d{8}$/,
      'MT': /^MT\d{8}$/,
      'NL': /^NL\d{9}B\d{2}$/,
      'PL': /^PL\d{10}$/,
      'PT': /^PT\d{9}$/,
      'RO': /^RO\d{2,10}$/,
      'SK': /^SK\d{10}$/,
      'SI': /^SI\d{8}$/,
      'ES': /^ES[A-Z]\d{7}[A-Z0-9]$|^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
      'SE': /^SE\d{12}$/,
    };

    const pattern = patterns[country];
    return pattern ? pattern.test(cleanVAT) : false;
  }

  /**
   * Get VAT rate for a country
   */
  static getVATRate(countryCode: string): VATRate | null {
    return VAT_RATES[countryCode.toUpperCase()] || null;
  }

  /**
   * Check if country requires VAT
   */
  static isVATCountry(countryCode: string): boolean {
    return !!VAT_RATES[countryCode.toUpperCase()];
  }

  /**
   * Get all supported VAT countries
   */
  static getSupportedCountries(): VATRate[] {
    return Object.values(VAT_RATES);
  }

  /**
   * Format VAT amount for display
   */
  static formatVATAmount(amount: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount / 100); // Assuming amount is in pence/cents
  }

  /**
   * Generate VAT invoice line items
   */
  static generateInvoiceLines(calculation: VATCalculation, description: string) {
    const lines = [
      {
        description,
        quantity: 1,
        unitPrice: calculation.netAmount,
        totalPrice: calculation.netAmount,
        vatRate: 0,
        vatAmount: 0,
      }
    ];

    if (calculation.isVATApplicable && calculation.vatAmount > 0) {
      lines.push({
        description: `VAT (${calculation.vatRate}%) - ${calculation.countryCode}`,
        quantity: 1,
        unitPrice: calculation.vatAmount,
        totalPrice: calculation.vatAmount,
        vatRate: calculation.vatRate,
        vatAmount: calculation.vatAmount,
      });
    }

    return lines;
  }
}
