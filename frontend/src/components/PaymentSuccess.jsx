import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/App';

const MAX_POLL_ATTEMPTS = 8; // ~16s total at 2s intervals
const POLL_INTERVAL_MS = 2000;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [bookingRef, setBookingRef] = useState(null);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef(null);

  const pollStatus = useCallback(async (sessionId) => {
    try {
      const response = await api.get(`/payments/stripe/status/${sessionId}`);
      const data = response.data || {};
      setPaymentDetails(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
        if (data.booking_ref) setBookingRef(data.booking_ref);
        // Tell other tabs / dashboard to refresh on next load
        try { sessionStorage.removeItem('travo_pending_stripe_session'); } catch (_) { /* noop */ }
        return;
      }
      if (data.status === 'expired') {
        setStatus('error');
        return;
      }
      // Still pending — keep polling up to max attempts
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setStatus('pending');
        return;
      }
      timeoutRef.current = setTimeout(() => pollStatus(sessionId), POLL_INTERVAL_MS);
    } catch (err) {
      console.error('Error checking payment status:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollStatus(sessionId);
    } else {
      setStatus('error');
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchParams, pollStatus]);

  const goToBookings = () => {
    try {
      sessionStorage.setItem('travo_currentView', 'dashboard');
      sessionStorage.setItem('travo_activeTab', 'My Bookings');
    } catch (_) { /* ignore */ }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-6" data-testid="payment-success">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-20 h-20 text-[#002B5B] mx-auto animate-spin mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Verifying Payment</h1>
            <p className="text-gray-500">Please wait while we confirm your payment with Stripe...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-6">
              Your booking has been confirmed. Thank you for choosing Travo DMC!
            </p>

            {paymentDetails && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left" data-testid="payment-receipt-summary">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Amount Paid</span>
                  <span className="font-bold text-gray-800">
                    {paymentDetails.currency?.toUpperCase()} {(paymentDetails.amount_total / 100).toLocaleString()}
                  </span>
                </div>
                {bookingRef && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Booking Reference</span>
                    <span className="font-bold text-gray-800" data-testid="success-booking-ref">{bookingRef}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="font-bold text-green-600 capitalize">{paymentDetails.payment_status}</span>
                </div>
              </div>
            )}

            <button
              onClick={goToBookings}
              data-testid="success-view-bookings-btn"
              className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold hover:bg-[#003d82] transition-all"
            >
              View My Bookings
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Processing</h1>
            <p className="text-gray-500 mb-6">
              Your payment is taking a little longer than usual. You'll receive a confirmation email shortly.
            </p>
            <button
              onClick={goToBookings}
              className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold hover:bg-[#003d82] transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">!</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h1>
            <p className="text-gray-500 mb-6">We couldn't verify your payment. Please contact support if you were charged.</p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Return Home
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
