/**
 * Apple In-App Purchases Service
 * Using @capgo/capacitor-purchases for iOS StoreKit integration
 * Product IDs: com.kooravoice.all.monthly ($4.99), com.kooravoice.all.yearly ($49.99)
 */

import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import { API } from '../config/api';

// Product IDs from App Store Connect
export const PRODUCT_IDS = {
  ALL_MONTHLY: 'com.kooravoice.all.monthly',
  ALL_YEARLY: 'com.kooravoice.all.yearly',
};

// Check if running on native iOS
export const isNativeIOS = () => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

// Sync purchase with backend
export const syncPurchaseWithBackend = async (productId, transactionId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { success: false, error: 'Not authenticated' };

    const response = await axios.post(
      `${API}/api/payments/sync-apple-purchase`,
      { productId, transactionId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Backend sync error:', error);
    return { success: false, error: error.message };
  }
};

// Initialize purchases (call on app start)
export const initializePurchases = async () => {
  if (!isNativeIOS()) {
    console.log('Not on native iOS, skipping StoreKit initialization');
    return false;
  }

  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
    
    // Note: For StoreKit 2 / Capacitor Purchases, setup may vary
    // If using direct StoreKit integration, API key might not be needed
    await CapacitorPurchases.setup({
      apiKey: '', // Empty for direct StoreKit integration
    });
    
    console.log('StoreKit initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize StoreKit:', error);
    return false;
  }
};

// Get available products
export const getProducts = async () => {
  if (!isNativeIOS()) {
    // Return mock products for web/testing
    return [
      {
        identifier: PRODUCT_IDS.ALL_MONTHLY,
        title: 'جميع المميزات - شهري',
        description: 'احصل على جميع مميزات التطبيق',
        priceString: '$4.99',
        price: 4.99,
      },
      {
        identifier: PRODUCT_IDS.ALL_YEARLY,
        title: 'جميع المميزات - سنوي',
        description: 'احصل على جميع المميزات لمدة سنة كاملة',
        priceString: '$49.99',
        price: 49.99,
      },
    ];
  }

  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
    const offerings = await CapacitorPurchases.getOfferings();
    
    if (offerings.current) {
      return offerings.current.availablePackages.map(pkg => ({
        identifier: pkg.product.identifier,
        title: pkg.product.title,
        description: pkg.product.description,
        priceString: pkg.product.priceString,
        price: pkg.product.price,
        packageType: pkg.packageType,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get products:', error);
    return [];
  }
};

// Purchase a product
export const purchaseProduct = async (productId) => {
  if (!isNativeIOS()) {
    // For web/testing, redirect to a message
    return {
      success: false,
      error: 'In-App Purchases are only available on iOS devices',
      message: 'يرجى استخدام التطبيق على iPhone للشراء',
    };
  }

  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
    
    // Get the package
    const offerings = await CapacitorPurchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      p => p.product.identifier === productId
    );
    
    if (!pkg) {
      return { success: false, error: 'Product not found' };
    }

    // Make the purchase
    const result = await CapacitorPurchases.purchasePackage({ aPackage: pkg });
    
    if (result.customerInfo) {
      // Check if the entitlement is active
      const isActive = result.customerInfo.entitlements.active['premium'] !== undefined ||
                       result.customerInfo.entitlements.active['all'] !== undefined;
      
      // Sync with backend
      const transactionId = result.customerInfo.originalAppUserId || 
                           result.customerInfo.originalPurchaseDate;
      await syncPurchaseWithBackend(productId, transactionId);
      
      return {
        success: true,
        customerInfo: result.customerInfo,
        isActive,
        message: 'تم الشراء بنجاح!',
      };
    }
    
    return { success: false, error: 'Purchase failed' };
  } catch (error) {
    if (error.code === '1' || error.code === 1 || error.message?.includes('cancelled')) {
      // User cancelled
      return { success: false, cancelled: true, message: 'تم إلغاء الشراء' };
    }
    console.error('Purchase error:', error);
    return { success: false, error: error.message };
  }
};

// Restore purchases
export const restorePurchases = async () => {
  if (!isNativeIOS()) {
    return { success: false, error: 'Not available on web' };
  }

  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
    const result = await CapacitorPurchases.restorePurchases();
    
    // Check for active subscriptions after restore
    const customerInfo = result.customerInfo;
    const hasActiveSubscription = customerInfo?.entitlements?.active && 
      Object.keys(customerInfo.entitlements.active).length > 0;
    
    if (hasActiveSubscription) {
      // Find the product ID and sync with backend
      const activeEntitlement = Object.values(customerInfo.entitlements.active)[0];
      if (activeEntitlement?.productIdentifier) {
        await syncPurchaseWithBackend(
          activeEntitlement.productIdentifier,
          customerInfo.originalAppUserId
        );
      }
    }
    
    return {
      success: true,
      customerInfo: result.customerInfo,
      hasActiveSubscription,
      message: hasActiveSubscription ? 'تم استعادة المشتريات' : 'لا توجد مشتريات سابقة',
    };
  } catch (error) {
    console.error('Restore error:', error);
    return { success: false, error: error.message };
  }
};

// Check subscription status
export const checkSubscriptionStatus = async () => {
  if (!isNativeIOS()) {
    // Return from API for web
    return { isSubscribed: false, source: 'web' };
  }

  try {
    const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
    const customerInfo = await CapacitorPurchases.getCustomerInfo();
    
    const isSubscribed = customerInfo.customerInfo.entitlements.active['premium'] !== undefined;
    
    return {
      isSubscribed,
      customerInfo: customerInfo.customerInfo,
      source: 'storekit',
    };
  } catch (error) {
    console.error('Status check error:', error);
    return { isSubscribed: false, error: error.message };
  }
};

// Listen for purchase updates
export const addPurchaseListener = (callback) => {
  if (!isNativeIOS()) return () => {};

  let listener = null;
  
  (async () => {
    try {
      const { CapacitorPurchases } = await import('@capgo/capacitor-purchases');
      listener = await CapacitorPurchases.addListener('purchasesUpdate', (data) => {
        callback(data);
      });
    } catch (error) {
      console.error('Failed to add listener:', error);
    }
  })();

  return () => {
    if (listener) {
      listener.remove();
    }
  };
};

export default {
  PRODUCT_IDS,
  isNativeIOS,
  initializePurchases,
  getProducts,
  purchaseProduct,
  restorePurchases,
  checkSubscriptionStatus,
  addPurchaseListener,
  syncPurchaseWithBackend,
};
