// Notification system for messages, reviews, and other events

export type NotificationType = 
  | 'MESSAGE_RECEIVED'
  | 'REVIEW_RECEIVED' 
  | 'REVIEW_RESPONSE'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'STUDIO_VERIFIED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_EXPIRING';

export interface NotificationData {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  reviewNotifications: boolean;
  connectionNotifications: boolean;
  marketingEmails: boolean;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string
  ): Promise<NotificationData> {
    const notification: NotificationData = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: new Date(),
      ...(actionUrl && { actionUrl }),
    };

    // Store in database (would be implemented with actual DB calls)
    // await db.notification.create({ data: notification });

    // Send real-time notification if user is online
    await this.sendRealTimeNotification(notification);

    // Send email notification if enabled
    await this.sendEmailNotification(notification);

    return notification;
  }

  /**
   * Send real-time notification (WebSocket/Server-Sent Events)
   */
  static async sendRealTimeNotification(notification: NotificationData): Promise<void> {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll use a simple in-memory approach
    
    if (typeof window !== 'undefined') {
      // Client-side: dispatch custom event
      window.dispatchEvent(new CustomEvent('notification', {
        detail: notification,
      }));
    }
  }

  /**
   * Send email notification based on user preferences
   */
  static async sendEmailNotification(notification: NotificationData): Promise<void> {
    try {
      // Get user preferences (would be from database)
      const preferences = await this.getUserPreferences(notification.userId);
      
      if (!preferences.emailNotifications) {
        return;
      }

      // Check if this notification type is enabled
      if (!this.isNotificationTypeEnabled(notification.type, preferences)) {
        return;
      }

      // Send email via email service
      // This would integrate with the actual email service
      console.log(`Email notification sent for ${notification.type} to user ${notification.userId}`);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  static async getUserPreferences(_userId: string): Promise<NotificationPreferences> {
    // This would fetch from database
    // For now, return default preferences
    return {
      userId: _userId,
      emailNotifications: true,
      pushNotifications: true,
      messageNotifications: true,
      reviewNotifications: true,
      connectionNotifications: true,
      marketingEmails: false,
    };
  }

  /**
   * Check if notification type is enabled for user
   */
  static isNotificationTypeEnabled(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    switch (type) {
      case 'MESSAGE_RECEIVED':
        return preferences.messageNotifications;
      case 'REVIEW_RECEIVED':
      case 'REVIEW_RESPONSE':
        return preferences.reviewNotifications;
      case 'CONNECTION_REQUEST':
      case 'CONNECTION_ACCEPTED':
        return preferences.connectionNotifications;
      case 'STUDIO_VERIFIED':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
      case 'SUBSCRIPTION_EXPIRING':
        return preferences.emailNotifications;
      default:
        return preferences.emailNotifications;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(_notificationId: string): Promise<void> {
    // Update in database
    // await db.notification.update({
    //   where: { id: notificationId },
    //   data: { read: true, readAt: new Date() }
    // });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(_userId: string): Promise<void> {
    // Update in database
    // await db.notification.updateMany({
    //   where: { userId, read: false },
    //   data: { read: true, readAt: new Date() }
    // });
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    _userId: string,
    _limit: number = 20,
    _offset: number = 0,
    _unreadOnly: boolean = false
  ): Promise<NotificationData[]> {
    // This would fetch from database
    // For now, return empty array
    return [];
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(_userId: string): Promise<number> {
    // This would fetch from database
    return 0;
  }

  /**
   * Delete notification
   */
  static async deleteNotification(_notificationId: string): Promise<void> {
    // Delete from database
    // await db.notification.delete({ where: { id: notificationId } });
  }

  /**
   * Helper methods for specific notification types
   */
  static async notifyNewMessage(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    await this.createNotification(
      recipientId,
      'MESSAGE_RECEIVED',
      'New Message',
      `${senderName}: ${messagePreview}`,
      { conversationId },
      `/messages/${conversationId}`
    );
  }

  static async notifyNewReview(
    studioOwnerId: string,
    reviewerName: string,
    rating: number,
    studioId: string
  ): Promise<void> {
    await this.createNotification(
      studioOwnerId,
      'REVIEW_RECEIVED',
      'New Review Received',
      `${reviewerName} left a ${rating}-star review for your studio`,
      { studioId, rating },
      `/studio/${studioId}#reviews`
    );
  }

  static async notifyConnectionRequest(
    recipientId: string,
    requesterName: string,
    requesterId: string
  ): Promise<void> {
    await this.createNotification(
      recipientId,
      'CONNECTION_REQUEST',
      'New Connection Request',
      `${requesterName} wants to connect with you`,
      { requesterId },
      '/dashboard/connections'
    );
  }

  static async notifyConnectionAccepted(
    requesterId: string,
    accepterName: string,
    accepterId: string
  ): Promise<void> {
    await this.createNotification(
      requesterId,
      'CONNECTION_ACCEPTED',
      'Connection Accepted',
      `${accepterName} accepted your connection request`,
      { accepterId },
      '/dashboard/connections'
    );
  }

  static async notifyStudioVerified(
    studioOwnerId: string,
    studioName: string,
    studioId: string
  ): Promise<void> {
    await this.createNotification(
      studioOwnerId,
      'STUDIO_VERIFIED',
      'Studio Verified',
      `Your studio "${studioName}" has been verified`,
      { studioId },
      `/studio/${studioId}`
    );
  }

  static async notifyPaymentSuccess(
    userId: string,
    amount: string,
    currency: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'PAYMENT_SUCCESS',
      'Payment Successful',
      `Your payment of ${amount} ${currency} has been processed successfully`,
      { amount, currency },
      '/billing'
    );
  }

  static async notifyPaymentFailed(
    userId: string,
    amount: string,
    currency: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'PAYMENT_FAILED',
      'Payment Failed',
      `Your payment of ${amount} ${currency} could not be processed`,
      { amount, currency },
      '/billing'
    );
  }
}
