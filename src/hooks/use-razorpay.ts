/**
 * RazorPay checkout hook — loads the Razorpay script and handles payment flow.
 * Encapsulates the entire create-order → checkout → verify cycle.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

interface UseRazorpayOptions {
  sessionId: string;
  onSuccess: () => void;
  onFailure?: (error: string) => void;
}

type CheckoutState = 'idle' | 'creating_order' | 'checkout_open' | 'verifying' | 'success' | 'error';

export function useRazorpay({ sessionId, onSuccess, onFailure }: UseRazorpayOptions) {
  const [state, setState] = useState<CheckoutState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);

  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.Razorpay !== 'undefined') {
      setScriptReady(true);
      return;
    }
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const check = setInterval(() => {
        if (typeof window.Razorpay !== 'undefined') {
          setScriptReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { setScriptReady(true); };
    document.body.appendChild(script);
  }, []);

  const initiatePayment = useCallback(async () => {
    if (typeof window.Razorpay === 'undefined') {
      setError('Payment gateway is loading. Please try again in a moment.');
      setState('error');
      return;
    }

    setState('creating_order');
    setError(null);

    try {
      const orderRes = await fetch('/api/payment?action=create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: sessionId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      setState('checkout_open');
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: 'Raivan Global',
        description: 'Security Audit Report',
        handler: async (response: Record<string, string>) => {
          setState('verifying');
          try {
            const verifyRes = await fetch('/api/payment?action=verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
            setState('success');
            onSuccessRef.current();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Verification failed';
            setState('error');
            setError(msg);
            onFailureRef.current?.(msg);
          }
        },
        modal: {
          ondismiss: () => {
            setState('idle');
          },
        },
        theme: { color: '#047857' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment initiation failed';
      setState('error');
      setError(msg);
      onFailureRef.current?.(msg);
    }
  }, [sessionId]);

  return { initiatePayment, state, error, scriptReady };
}
