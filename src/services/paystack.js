import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_2dadb2b8db30a8daea80f250342924e39e58b975';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_861bbd435447fc955eb1826e43a7808e61eea268';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize transaction
export async function initializePaystackTransaction({ 
  amount, 
  email, 
  reference, 
  metadata = {},
  currency = 'ZAR',
  callback_url = null 
}) {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        amount: Math.round(amount * 100), // Convert to cents (smallest currency unit)
        email,
        reference,
        currency,
        metadata,
        callback_url
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Paystack initialization error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Verify transaction
export async function verifyPaystackTransaction(reference) {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Paystack verification error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Get transaction details
export async function getPaystackTransaction(transactionId) {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Paystack get transaction error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// List transactions
export async function listPaystackTransactions({ 
  perPage = 50, 
  page = 1, 
  status = null,
  from = null,
  to = null 
}) {
  try {
    const params = new URLSearchParams({
      perPage: perPage.toString(),
      page: page.toString()
    });

    if (status) params.append('status', status);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Paystack list transactions error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Refund transaction
export async function refundPaystackTransaction(transactionId, amount = null, reason = null) {
  try {
    const body = {};
    if (amount) body.amount = Math.round(amount * 100);
    if (reason) body.reason = reason;

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/refund`,
      body,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
  } catch (error) {
    console.error('Paystack refund error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Generate reference
export function generatePaystackReference() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `PAYSTACK_${timestamp}_${random}`.toUpperCase();
}

// Get public key for frontend
export function getPaystackPublicKey() {
  return PAYSTACK_PUBLIC_KEY;
}

// Check if Paystack is configured
export function isPaystackConfigured() {
  return !!(PAYSTACK_SECRET_KEY && PAYSTACK_PUBLIC_KEY);
}
