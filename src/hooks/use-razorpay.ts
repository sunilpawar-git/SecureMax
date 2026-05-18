/**
 * Razorpay checkout hook — loads the Razorpay script and handles payment flow.
 * Encapsulates the entire create-order → checkout → verify cycle.
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PAYMENT_ERR } from '@/config/strings';

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

type CheckoutState =
  | 'idle'
  | 'creating_order'
  | 'checkout_open'
  | 'verifying'
  | 'success'
  | 'error';

export function useRazorpay({ sessionId, onSuccess, onFailure }: UseRazorpayOptions) {
  const [state, setState] = useState<CheckoutState>('idle');
  const [error, setError] = useState<string | null>(null);
  // Initialise synchronously: if Razorpay is already on the page (e.g. after a
  // client-side navigation), start ready so the button is not briefly disabled.
  const alreadyLoaded = typeof window !== 'undefined' && typeof window.Razorpay !== 'undefined';
  const scriptReadyRef = useRef(alreadyLoaded);
  const [scriptReady, setScriptReady] = useState(alreadyLoaded);
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onFailureRef.current = onFailure;
  }, [onSuccess, onFailure]);

  // If Razorpay was already loaded the initial state is already true (above).
  // Otherwise, unconditionally enable the button after a timeout so that if the
  // script is blocked at the browser level (MIME type check, CSP, network error)
  // and neither onReady nor onError fires, the user still gets a clickable button
  // that surfaces a clear error message rather than being silently disabled.
  useEffect(() => {
    if (scriptReadyRef.current) return;
    const fallback = setTimeout(() => {
      if (!scriptReadyRef.current) {
        scriptReadyRef.current = true;
        setScriptReady(true);
      }
    }, 5000);
    return () => clearTimeout(fallback);
  }, []);

  const onScriptLoad = useCallback(() => {
    // next/script onReady fires after the script executes.
    // Poll briefly in case the JS runtime hasn't registered window.Razorpay yet.
    if (typeof window.Razorpay !== 'undefined') {
      scriptReadyRef.current = true;
      setScriptReady(true);
      return;
    }
    const check = setInterval(() => {
      if (typeof window.Razorpay !== 'undefined') {
        scriptReadyRef.current = true;
        setScriptReady(true);
        clearInterval(check);
      }
    }, 100);
    // Give up after 5 s and enable the button — initiatePayment will show a clear error.
    setTimeout(() => {
      clearInterval(check);
      if (!scriptReadyRef.current) {
        scriptReadyRef.current = true;
        setScriptReady(true);
      }
    }, 5000);
  }, []);

  const onScriptError = useCallback(() => {
    // Script failed to load (network error, CDN block, etc.).
    // Enable the button so the user gets a clear error message on click.
    scriptReadyRef.current = true;
    setScriptReady(true);
  }, []);

  const initiatePayment = useCallback(async () => {
    if (!scriptReadyRef.current || typeof window.Razorpay === 'undefined') {
      setError(PAYMENT_ERR.GATEWAY_LOADING);
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

  return { initiatePayment, state, error, scriptReady, onScriptLoad, onScriptError };
}
