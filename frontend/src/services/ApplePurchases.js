/**
 * Apple In-App Purchases Service
 * Using @capgo/native-purchases for iOS StoreKit 2 integration (iOS 15+)
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
    const { NativePurchases } = await import('@capgo/native-purchases');
    console.log('StoreKit 2 initialized successfully');
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
    const { NativePurchases } = await import('@capgo/native-purchases');
    const productIds = [PRODUCT_IDS.ALL_MONTHLY, PRODUCT_IDS.ALL_YEARLY];
    const result = await NativePurchases.getProducts({ productIds });
    
    if (result.products && result.products.length > 0) {
      return result.products.map(product => ({
        identifier: product.productId,
        title: product.displayName || product.title,
        description: product.description,
        priceString: product.displayPrice || `$${product.price}`,
        price: product.price,
      }));
    }
    
    // Fallback to mock data if no products returned
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
  } catch (error) {
    console.error('Failed to get products:', error);
    return [
      {
        identifier: PRODUCT_IDS.ALL_MONTHLY,
        title: 'جميع المميزات - شهري',
        priceString: '$4.99',
        price: 4.99,
      },
      {
        identifier: PRODUCT_IDS.ALL_YEARLY,
        title: 'جميع المميزات - سنوي',
        priceString: '$49.99',
        price: 49.99,
      },
    ];
  }
};

// Purchase a product
export const purchaseProduct = async (productId) => {
  console.log('purchaseProduct called with productId:', productId);
  
  if (!productId) {
    console.error('Product ID is empty!');
    return {
      success: false,
      error: 'Product ID is required',
      message: 'معرف المنتج مطلوب',
    };
  }

  if (!isNativeIOS()) {
    return {
      success: false,
      error: 'In-App Purchases are only available on iOS devices',
      message: 'يرجى استخدام التطبيق على iPhone للشراء',
    };
  }

  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    
    console.log('Calling NativePurchases.purchaseProduct with:', productId);
    
    // Make the purchase
    const result = await NativePurchases.purchaseProduct({ productId: productId });
    
    if (result.transactionId) {
      // Sync with backend
      await syncPurchaseWithBackend(productId, result.transactionId);
      
      return {
        success: true,
        transactionId: result.transactionId,
        message: 'تم الشراء بنجاح!',
      };
    }
    
    return { success: false, error: 'Purchase failed' };
  } catch (error) {
    if (error.message?.includes('cancelled') || error.code === 'USER_CANCELLED') {
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
    const { NativePurchases } = await import('@capgo/native-purchases');
    const result = await NativePurchases.restorePurchases();
    
    const hasActiveSubscription = result.transactions && result.transactions.length > 0;
    
    if (hasActiveSubscription) {
      // Find the most recent transaction and sync
      const latestTransaction = result.transactions[result.transactions.length - 1];
      if (latestTransaction?.productId) {
        await syncPurchaseWithBackend(
          latestTransaction.productId,
          latestTransaction.transactionId
        );
      }
    }
    
    return {
      success: true,
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
    return { isSubscribed: false, source: 'web' };
  }

  try {
    const { NativePurchases } = await import('@capgo/native-purchases');
    const result = await NativePurchases.getActiveTransactions();
    
    const isSubscribed = result.transactions && result.transactions.length > 0;
    
    return {
      isSubscribed,
      transactions: result.transactions,
      source: 'storekit',
    };
  } catch (error) {
    console.error('Status check error:', error);
    return { isSubscribed: false, error: error.message };
  }
};

// Listen for purchase updates (not available in native-purchases, use polling or backend)
export const addPurchaseListener = (callback) => {
  // Native purchases doesn't have real-time listeners
  // Use backend polling or check on app resume
  return () => {};
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
