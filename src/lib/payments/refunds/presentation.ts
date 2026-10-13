import type { refund_operations } from '@prisma/client';
import type { RefundOperationSummary } from './contracts';

export function operationSummary(operation: refund_operations): RefundOperationSummary {
  return { id: operation.id, paymentId: operation.payment_id, amount: operation.amount, currency: operation.currency,
    moneyStatus: operation.money_status, providerStatus: operation.provider_status,
    benefitStatus: operation.benefit_status, billingStatus: operation.billing_status,
    notificationStatus: operation.notification_status, accessReviewRequired: operation.access_review_required,
    errorCode: operation.last_error_code };
}
