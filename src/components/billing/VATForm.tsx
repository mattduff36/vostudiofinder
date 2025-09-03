'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/Input';
import { VATService, VATCalculation } from '@/lib/vat';

interface VATFormProps {
  baseAmount: number;
  currency: string;
  onVATCalculation: (calculation: VATCalculation) => void;
  defaultCountry?: string;
}

export function VATForm({
  baseAmount,
  currency,
  onVATCalculation,
  defaultCountry = 'GB',
}: VATFormProps) {
  const [selectedCountry, setSelectedCountry] = useState(defaultCountry);
  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [vatNumber, setVatNumber] = useState('');
  const [isVATNumberValid, setIsVATNumberValid] = useState(false);
  const [calculation, setCalculation] = useState<VATCalculation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const countries = VATService.getSupportedCountries();

  // Calculate VAT whenever inputs change
  useEffect(() => {
    const newCalculation = VATService.calculateVAT(
      baseAmount,
      selectedCountry,
      isBusinessCustomer,
      isVATNumberValid
    );
    
    setCalculation(newCalculation);
    onVATCalculation(newCalculation);
  }, [baseAmount, selectedCountry, isBusinessCustomer, isVATNumberValid, onVATCalculation]);

  // Validate VAT number when it changes
  useEffect(() => {
    if (vatNumber && isBusinessCustomer) {
      setIsValidating(true);
      const isValid = VATService.validateVATNumber(vatNumber, selectedCountry);
      setIsVATNumberValid(isValid);
      setIsValidating(false);
    } else {
      setIsVATNumberValid(false);
    }
  }, [vatNumber, selectedCountry, isBusinessCustomer]);

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-semibold text-gray-900">Billing Information</h3>
      
      {/* Country Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Country
        </label>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {countries.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.countryName} ({country.vatRate}% VAT)
            </option>
          ))}
        </select>
      </div>

      {/* Business Customer Toggle */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="businessCustomer"
          checked={isBusinessCustomer}
          onChange={(e) => setIsBusinessCustomer(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="businessCustomer" className="text-sm text-gray-700">
          I'm purchasing for business use
        </label>
      </div>

      {/* VAT Number Input */}
      {isBusinessCustomer && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            VAT Number (for EU B2B customers)
          </label>
          <div className="relative">
            <Input
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
              placeholder={`e.g., ${selectedCountry}123456789`}
              className={`pr-10 ${
                vatNumber
                  ? isVATNumberValid
                    ? 'border-green-500'
                    : 'border-red-500'
                  : ''
              }`}
            />
            {vatNumber && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {isValidating ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                ) : isVATNumberValid ? (
                  <span className="text-green-500">✓</span>
                ) : (
                  <span className="text-red-500">✗</span>
                )}
              </div>
            )}
          </div>
          {vatNumber && !isVATNumberValid && !isValidating && (
            <p className="text-sm text-red-600 mt-1">
              Invalid VAT number format for {selectedCountry}
            </p>
          )}
          {isVATNumberValid && (
            <p className="text-sm text-green-600 mt-1">
              Valid VAT number - reverse charge applies (no VAT charged)
            </p>
          )}
        </div>
      )}

      {/* VAT Calculation Display */}
      {calculation && (
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{VATService.formatVATAmount(calculation.netAmount, currency)}</span>
          </div>
          
          {calculation.isVATApplicable && calculation.vatAmount > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span>VAT ({calculation.vatRate}%):</span>
                <span>{VATService.formatVATAmount(calculation.vatAmount, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
                <span>Total:</span>
                <span>{VATService.formatVATAmount(calculation.grossAmount, currency)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
              <span>Total:</span>
              <span>{VATService.formatVATAmount(calculation.grossAmount, currency)}</span>
            </div>
          )}

          {/* VAT Information */}
          {!calculation.isVATApplicable && (
            <p className="text-xs text-gray-500">
              {isVATNumberValid
                ? 'VAT reverse charge applies - you will account for VAT in your country'
                : 'No VAT applicable for this country'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
