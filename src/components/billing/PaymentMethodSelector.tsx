'use client';

// Note: Simplified to Stripe only - PayPal removed per cleanup
export type PaymentMethod = 'stripe';

interface PaymentMethodSelectorProps {
  onMethodSelect: (method: PaymentMethod) => void;
  selectedMethod?: PaymentMethod;
  isLoading?: boolean;
}

export function PaymentMethodSelector() {
  // Stripe only - no selection needed anymore
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
      
      <div className="border-2 border-blue-500 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💳</div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">Credit/Debit Card</h4>
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Pay securely with your card via Stripe</p>
            
            <ul className="mt-2 space-y-1">
              <li className="text-xs text-gray-500 flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                Instant activation
              </li>
              <li className="text-xs text-gray-500 flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                Secure payments
              </li>
              <li className="text-xs text-gray-500 flex items-center">
                <span className="text-green-500 mr-1">✓</span>
                All major cards accepted
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="text-green-500">🔒</span>
          <span>
            Your payment information is secure and encrypted. We never store your payment details.
          </span>
        </div>
      </div>
    </div>
  );
}
