'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CreditCard, Sparkles } from 'lucide-react';
import { getPromoConfig } from '@/lib/promo';

interface MembershipPaywallProps {
  title?: string;
  message?: string;
  action?: string;
}

export function MembershipPaywall({
  title = 'Membership Required',
  message = 'You need an active membership to perform this action.',
  action = 'Renew Membership',
}: MembershipPaywallProps) {
  const router = useRouter();
  const promoConfig = getPromoConfig();

  const handleRenew = () => {
    router.push('/auth/membership');
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center space-x-3 mb-4">
        <AlertCircle className="w-8 h-8 text-amber-600" />
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      </div>
      
      <p className="text-gray-700 text-center mb-6 max-w-md">
        {message}
      </p>
      
      {/* Promo badge when active */}
      {promoConfig.isActive && (
        <div className="mb-4 bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {promoConfig.badgeText}: {promoConfig.promoPrice} (normally {promoConfig.normalPrice})
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleRenew}
          className="bg-[#d42027] hover:bg-[#b91c23] text-white"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {promoConfig.isActive ? 'Get Free Membership' : action}
        </Button>
        
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Go Back
        </Button>
      </div>
      
      <div className="mt-6 text-sm text-gray-500 text-center max-w-md">
        <p>
          {promoConfig.isActive ? (
            <>
              Annual membership is <span className="line-through">{promoConfig.normalPrice}</span>{' '}
              <span className="font-semibold text-green-600">{promoConfig.promoPrice} for a limited time</span>.
            </>
          ) : (
            <>
              Annual membership is only <span className="font-semibold">{promoConfig.normalPrice}</span>.
            </>
          )}{' '}
          Get unlimited access to create and manage your studio listing.
        </p>
      </div>
    </div>
  );
}

