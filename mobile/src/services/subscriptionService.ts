import api from './api';

export const SubscriptionService = {
  /**
   * Mocks upgrading or downgrading the current user's subscription.
   */
  async upgradeMock(targetTier: 'pro' | 'team' = 'pro') {
    const response = await api.post('/api/auth/upgrade-mock', { target_tier: targetTier });
    return response.data; // returns { message: string, user: User }
  },

  /**
   * Placeholder for fetching real subscription states.
   */
  async getSubscription() {
    // In the future, fetch current active RevenueCat / App Store status
    return {
      status: 'active',
      provider: 'app_store'
    };
  },

  /**
   * Placeholder for initiating purchase flow.
   */
  async purchase() {
    console.log('Initiating subscription purchase flow on mobile...');
  },

  /**
   * Placeholder to restore purchases.
   */
  async restorePurchase() {
    console.log('Restoring previous purchases...');
    return true;
  },

  /**
   * Placeholder to cancel subscription.
   */
  async cancel() {
    console.log('Canceling subscription...');
    return true;
  }
};
