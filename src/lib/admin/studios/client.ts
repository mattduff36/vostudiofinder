/**
 * Admin Studios API Client
 * Typed fetch wrappers for admin studio operations
 */

export interface UpdateStatusParams {
  studioId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateVisibilityParams {
  studioId: string;
  isVisible: boolean;
}

export interface UpdateVerifiedParams {
  studioId: string;
  isVerified: boolean;
}

export interface UpdateFeaturedParams {
  studioId: string;
  isFeatured: boolean;
  featuredUntil?: string;
}

export interface BulkActionParams {
  action: string;
  studioIds: string[];
}

export class AdminStudiosClient {
  /**
   * Update studio status (ACTIVE/INACTIVE)
   */
  static async updateStatus({ studioId, status }: UpdateStatusParams): Promise<void> {
    const response = await fetch(`/api/admin/studios/${studioId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update status');
    }
  }

  /**
   * Update studio profile visibility
   */
  static async updateVisibility({ studioId, isVisible }: UpdateVisibilityParams): Promise<void> {
    const response = await fetch(`/api/admin/studios/${studioId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible }),
    });

    if (!response.ok) {
      throw new Error('Failed to update visibility');
    }
  }

  /**
   * Update studio verified status
   */
  static async updateVerified({ studioId, isVerified }: UpdateVerifiedParams): Promise<void> {
    const response = await fetch(`/api/admin/studios/${studioId}/verified`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVerified }),
    });

    if (!response.ok) {
      throw new Error('Failed to update verified status');
    }
  }

  /**
   * Update studio featured status
   */
  static async updateFeatured({ studioId, isFeatured, featuredUntil }: UpdateFeaturedParams): Promise<void> {
    const response = await fetch(`/api/admin/studios/${studioId}/featured`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured, featuredUntil }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update featured status');
    }
  }

  /**
   * Perform bulk action on multiple studios
   */
  static async bulkAction({ action, studioIds }: BulkActionParams): Promise<Response> {
    const response = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, studioIds }),
    });

    if (!response.ok && action !== 'export') {
      throw new Error('Bulk operation failed');
    }

    return response;
  }
}
