# Implementing Amplitude Analytics for E-Commerce: Step-by-Step Guide

This guide will help you implement Amplitude Analytics for an e-commerce website. It includes detailed instructions, code examples, and best practices based on our successful implementation.

## Table of Contents

1. [Setting Up Amplitude](#setting-up-amplitude)
2. [Tracking Key E-Commerce Events](#tracking-key-e-commerce-events)
3. [Optimizing User Properties](#optimizing-user-properties)
4. [Example Implementation for Checkout Flow](#example-implementation-for-checkout-flow)
5. [Debugging and Testing](#debugging-and-testing)
6. [Advanced Tracking Techniques](#advanced-tracking-techniques)

## Setting Up Amplitude

### Step 1: Install Amplitude SDK

First, install the Amplitude SDK via npm or yarn:

```bash
# Using npm
npm install @amplitude/analytics-browser

# Using yarn
yarn add @amplitude/analytics-browser
```

### Step 2: Create an Amplitude Service File

Create a dedicated file for Amplitude configuration. This centralizes your analytics code and makes it easy to maintain.

```javascript
// src/services/amplitude.js

import * as amplitude from '@amplitude/analytics-browser';

// Initialize Amplitude with your API key
export function initializeAmplitude() {
  // Get your API key from your environment variables
  const API_KEY = process.env.REACT_APP_AMPLITUDE_API_KEY;
  
  amplitude.init(API_KEY, {
    // Optional configuration
    logLevel: process.env.NODE_ENV === 'development' ? 'Debug' : 'Error',
    defaultTracking: {
      sessions: true,       // Track session events
      pageViews: true,      // Automatic page view tracking
      formInteractions: true, // Track form submissions
      fileDownloads: true   // Track file downloads
    }
  });
  
  console.log('Amplitude initialized');
}

// Create a centralized tracking function with consistent properties
export function trackEvent(eventName, eventProperties = {}) {
  // Add common properties that are useful for every event
  const commonProps = {
    // Add application/page info
    page: window.location.pathname,
    referrer: document.referrer,
    // Add device info
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    // Add timing info
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    isWeekend: [0, 6].includes(new Date().getDay()),
  };
  
  // Log in development for easier debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Amplitude] ${eventName}`, {
      ...commonProps,
      ...eventProperties
    });
  }
  
  // Track the event with Amplitude
  amplitude.track(eventName, {
    ...commonProps,
    ...eventProperties
  });
}

// Set user ID when user logs in
export function setUserId(userId) {
  amplitude.setUserId(userId);
}

// Update user properties
export function setUserProperties(properties) {
  amplitude.identify(new amplitude.Identify().setOnce(properties));
}

export default {
  initializeAmplitude,
  trackEvent,
  setUserId,
  setUserProperties
};
```

### Step 3: Initialize Amplitude in Your App

Initialize Amplitude when your app loads:

```javascript
// src/index.js or src/App.js
import { initializeAmplitude } from './services/amplitude';

function App() {
  useEffect(() => {
    // Initialize Amplitude when the app loads
    initializeAmplitude();
  }, []);
  
  return (
    // Your app component
  );
}
```

## Tracking Key E-Commerce Events

For an e-commerce site, you'll want to track specific events that matter for your business. Here's a standardized set of events to implement:

### Define E-Commerce Events

Create an events catalog to ensure consistent naming:

```javascript
// src/services/amplitude.js (continued)

// E-commerce event names
export const EcommerceEvents = {
  // Product browsing
  ProductView: 'Product.View',
  ProductList: 'Product.List',
  ProductSearch: 'Product.Search',
  ProductFilter: 'Product.Filter',
  
  // Shopping cart
  CartAdd: 'Cart.Add',
  CartRemove: 'Cart.Remove',
  CartView: 'Cart.View',
  CartUpdate: 'Cart.Update',
  
  // Checkout process
  CheckoutStart: 'Checkout.Start',
  CheckoutStep: 'Checkout.Step',
  CheckoutAddress: 'Checkout.Address',
  CheckoutShipping: 'Checkout.Shipping',
  CheckoutPayment: 'Checkout.Payment',
  
  // Order
  OrderConfirm: 'Order.Confirm',
  OrderCancel: 'Order.Cancel',
  
  // Promotions
  PromoView: 'Promo.View',
  PromoClick: 'Promo.Click',
  CouponApply: 'Coupon.Apply',
  CouponRemove: 'Coupon.Remove',
  
  // User account
  AccountCreate: 'Account.Create',
  AccountLogin: 'Account.Login',
  AccountUpdate: 'Account.Update',
  
  // Wishlist
  WishlistAdd: 'Wishlist.Add',
  WishlistRemove: 'Wishlist.Remove',
  WishlistView: 'Wishlist.View'
};
```

## Optimizing User Properties

User properties help segment your analytics data. Here are some key user properties to track for e-commerce:

```javascript
// When a user creates an account or logs in
function handleLogin(user) {
  // First, set the user ID
  setUserId(user.id);
  
  // Then set important user properties
  setUserProperties({
    // Account info
    account_created_at: user.createdAt,
    account_type: user.accountType,
    
    // Demographics (if available)
    country: user.country,
    city: user.city,
    
    // Customer segments
    customer_segment: user.segment,
    is_returning_customer: user.orderCount > 0,
    
    // Marketing
    referral_source: user.referralSource,
    utm_campaign: getUtmParameter('utm_campaign')
  });
}
```

## Example Implementation for Checkout Flow

Here's a detailed example of how to implement tracking for the checkout process, including the crucial "Order Confirmed" event:

### Tracking Checkout Steps

```javascript
// In your checkout component or page
import { trackEvent, EcommerceEvents } from '../services/amplitude';

// Step 1: Track when user starts checkout
function handleStartCheckout(cart) {
  trackEvent(EcommerceEvents.CheckoutStart, {
    cart_value: calculateCartTotal(cart),
    item_count: cart.items.length,
    items: cart.items.map(item => ({
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category
    }))
  });
}

// Step 2: Track when user completes a checkout step
function trackCheckoutStep(stepName, stepNumber) {
  trackEvent(EcommerceEvents.CheckoutStep, {
    step_name: stepName,
    step_number: stepNumber
  });
}

// Example: Track shipping method selection
function handleShippingSelection(shippingMethod) {
  trackEvent(EcommerceEvents.CheckoutShipping, {
    shipping_method: shippingMethod.name,
    shipping_cost: shippingMethod.cost,
    shipping_speed: shippingMethod.estimatedDays
  });
}

// Example: Track payment method selection
function handlePaymentSelection(paymentMethod) {
  trackEvent(EcommerceEvents.CheckoutPayment, {
    payment_method: paymentMethod.type, // e.g., "credit_card", "paypal"
    payment_provider: paymentMethod.provider // e.g., "visa", "mastercard"
  });
}
```

### Tracking Order Confirmation

This is one of the most important events to track accurately:

```javascript
// In your order confirmation component or page
import { trackEvent, EcommerceEvents } from '../services/amplitude';

// Track when an order is successfully placed
function trackOrderConfirmed(order) {
  trackEvent(EcommerceEvents.OrderConfirm, {
    // Order details
    order_id: order.id,
    order_value: order.total,
    
    // Items purchased
    items: order.items.map(item => ({
      product_id: item.id,
      product_name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category
    })),
    
    // Revenue details
    revenue: order.subtotal, // Pre-tax, pre-shipping value
    tax: order.tax,
    shipping: order.shipping,
    discount: order.discount,
    
    // Payment info
    payment_method: order.paymentMethod.type,
    
    // Shipping info (non-PII)
    shipping_method: order.shippingMethod.name,
    shipping_country: order.shippingAddress.country,
    
    // Marketing attribution
    coupon_code: order.couponCode,
    campaign: getCampaignInfo(),
    
    // Checkout experience
    checkout_duration_seconds: calculateCheckoutDuration(),
    steps_completed: getCompletedSteps()
  });
}

// Use this function in your order confirmation component
function OrderConfirmation({ order }) {
  useEffect(() => {
    // Track the order confirmation when the component mounts
    trackOrderConfirmed(order);
  }, [order]);
  
  return (
    <div>
      <h1>Order Confirmed!</h1>
      {/* Order details */}
    </div>
  );
}
```

### Where to Add the Order Confirmation Tracking

The order confirmation tracking should be placed in the following locations:

1. **On the order confirmation page** inside a `useEffect` hook that runs when the page loads with order data.
2. **In the checkout completion handler** that runs when the payment is successfully processed.

```javascript
// Example 1: In your order confirmation page component
function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  
  useEffect(() => {
    // Fetch order details
    async function fetchOrder() {
      const orderData = await orderService.getOrder(orderId);
      setOrder(orderData);
      
      // Track the order confirmation
      trackOrderConfirmed(orderData);
    }
    
    fetchOrder();
  }, [orderId]);
  
  // Rest of component...
}

// Example 2: In your checkout submission handler
async function handleCheckoutSubmit(paymentDetails) {
  try {
    // Show loading state
    setIsProcessing(true);
    
    // Process payment and create order
    const newOrder = await orderService.createOrder({
      cart: currentCart,
      payment: paymentDetails,
      shipping: selectedShipping,
      // other order details...
    });
    
    // Track the order confirmation immediately when we know it succeeded
    trackOrderConfirmed(newOrder);
    
    // Navigate to success page
    navigate(`/order/confirmation/${newOrder.id}`);
  } catch (error) {
    // Handle error and show message to user
    setError('Payment failed. Please try again.');
    
    // Track the failure
    trackEvent(EcommerceEvents.CheckoutError, {
      error: error.message,
      step: 'payment_submission'
    });
  } finally {
    setIsProcessing(false);
  }
}
```

## Debugging and Testing

### Enable Debug Mode

During development, enable Amplitude's debug mode to see events in the console:

```javascript
// In your amplitude service
function initializeAmplitude() {
  amplitude.init(API_KEY, {
    // Set debug mode in development
    logLevel: process.env.NODE_ENV === 'development' ? 'Debug' : 'Error'
  });
}
```

### Verify Events in the Browser

To make sure events are firing correctly:

1. Open your browser's developer console
2. Look for logs with the `[Amplitude]` prefix
3. Check that event properties contain the expected values

### Test in Amplitude Dashboard

To verify events are being received by Amplitude:

1. Log in to your Amplitude dashboard
2. Go to "User Lookup" 
3. Search for your test user ID
4. Check that events appear with expected properties

## Advanced Tracking Techniques

### Tracking User Segments

Set user segments to better analyze different user groups:

```javascript
// Update user segment when it changes
function updateUserSegment(user) {
  // Calculate customer value
  let customerSegment = 'new';
  if (user.totalSpent > 500) {
    customerSegment = 'vip';
  } else if (user.orderCount > 2) {
    customerSegment = 'returning';
  }
  
  // Set the user segment
  setUserProperties({
    customer_segment: customerSegment,
    order_count: user.orderCount,
    total_spent: user.totalSpent
  });
}
```

### Tracking Funnel Conversions

For your checkout flow, set up proper tracking at each step to measure conversion:

```javascript
// Track progress through the checkout funnel with step numbers for consistency
function trackCheckoutProgress(step) {
  const stepMap = {
    'cart': 1,
    'information': 2,
    'shipping': 3,
    'payment': 4,
    'review': 5
  };
  
  trackEvent(EcommerceEvents.CheckoutStep, {
    step_name: step,
    step_number: stepMap[step],
    checkout_id: currentCheckoutId // Keep track of specific checkout session
  });
}

// In your checkout component
useEffect(() => {
  // Track whenever the step changes
  if (currentStep) {
    trackCheckoutProgress(currentStep);
  }
}, [currentStep]);
```

### Creating Cohorts in Amplitude

Once you have events flowing, you can create user cohorts in Amplitude based on:

1. **Purchase behavior**: Users who have purchased in the last 30 days
2. **Cart abandoners**: Users who started checkout but didn't complete
3. **VIP customers**: Users with high lifetime value
4. **Product category affinities**: Users who browse or purchase specific categories

## Common E-Commerce Metrics to Track

Make sure your implementation enables measuring these key metrics:

1. **Conversion Rate**: Users who complete purchases divided by total visitors
2. **Average Order Value (AOV)**: Average value of completed orders  
3. **Cart Abandonment Rate**: Users who add items to cart but don't purchase
4. **Product Performance**: Which products are viewed, added to cart, and purchased
5. **Coupon Usage**: How coupon usage affects purchase behavior
6. **Checkout Funnel**: Conversion through each step of the checkout process

## Testing Your Implementation

Before deploying to production, test your tracking with this checklist:

- [ ] Browse products and verify Product.View events
- [ ] Add items to cart and verify Cart.Add events
- [ ] Begin checkout and verify Checkout.Start events
- [ ] Complete checkout steps and verify step tracking
- [ ] Complete a test order and verify Order.Confirm event
- [ ] Check that user properties are correctly set
- [ ] Verify revenue and product data in the Order.Confirm event