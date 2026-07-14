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
    // In the future, fetch current active Stripe / RevenueCat status
    return {
      status: 'active',
      provider: 'stripe'
    };
  },

  /**
   * Placeholder for initiating Stripe Checkout / billing portal session.
   */
  async purchase() {
    console.log('Initiating subscription purchase flow...');
  },

  /**
   * Placeholder to restore purchases (e.g. from App Store / Google Play).
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
