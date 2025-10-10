// PayPal SDK integration
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
}

export interface PayPalSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface PayPalCreateSubscriptionRequest {
  planId: string;
  customId?: string;
  user_id: string;
  studio_id: string;
}

export class PayPalService {
  private config: PayPalConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      clientId: process.env.PAYPAL_CLIENT_ID!,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
    };
    
    this.baseUrl = this.config.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async createProduct(name: string, description: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        type: 'SERVICE',
        category: 'SOFTWARE',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create PayPal product');
    }

    const product = await response.json();
    return product.id;
  }

  async createSubscriptionPlan(
    productId: string,
    planDetails: PayPalSubscriptionPlan
  ): Promise<string> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        name: planDetails.name,
        description: planDetails.description,
        billing_cycles: [
          {
            frequency: {
              interval_unit: planDetails.interval.toUpperCase(),
              interval_count: 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0, // Infinite cycles
            pricing_scheme: {
              fixed_price: {
                value: planDetails.amount.toString(),
                currency_code: planDetails.currency,
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
        taxes: {
          percentage: '0',
          inclusive: false,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create PayPal plan: ${JSON.stringify(error)}`);
    }

    const plan = await response.json();
    return plan.id;
  }

  async createSubscription(request: PayPalCreateSubscriptionRequest): Promise<any> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: request.planId,
        custom_id: request.customId || `${request.userId}-${request.studioId}`,
        application_context: {
          brand_name: 'VoiceoverStudioFinder',
          locale: 'en-GB',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${process.env.NEXTAUTH_URL}/api/paypal/success`,
          cancel_url: `${process.env.NEXTAUTH_URL}/api/paypal/cancel`,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create PayPal subscription: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get PayPal subscription');
    }

    return response.json();
  }

  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to cancel PayPal subscription');
    }
  }
}

export const paypal = new PayPalService();

