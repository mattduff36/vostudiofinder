'use client';

import { useState } from 'react';

export type PaymentMethod = 'stripe' | 'paypal';

interface PaymentMethodSelectorProps {
  onMethodSelect: (method: PaymentMethod) => void;
  selectedMethod?: PaymentMethod;
  isLoading?: boolean;
}

export function PaymentMethodSelector({
  onMethodSelect,
  selectedMethod,
}: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState<PaymentMethod>(selectedMethod || 'stripe');

  const handleSelect = (method: PaymentMethod) => {
    setSelected(method);
    onMethodSelect(method);
  };

  const paymentMethods = [
    {
      id: 'stripe' as PaymentMethod,
      name: 'Credit/Debit Card',
      description: 'Pay securely with your card via Stripe',
      icon: '💳',
      features: ['Instant activation', 'Secure payments', 'All major cards accepted'],
    },
    {
      id: 'paypal' as PaymentMethod,
      name: 'PayPal',
      description: 'Pay with your PayPal account',
      icon: '🅿️',
      features: ['PayPal protection', 'No card required', 'Instant payments'],
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Choose Payment Method</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selected === method.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelect(method.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{method.icon}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">{method.name}</h4>
                  {selected === method.id && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1 text-center">{method.description}</p>
                
                <ul className="mt-2 space-y-1">
                  {method.features.map((feature, index) => (
                    <li key={index} className="text-xs text-gray-500 flex items-center">
                      <span className="text-green-500 mr-1">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {selected === method.id && (
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"></div>
            )}
          </div>
        ))}
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
