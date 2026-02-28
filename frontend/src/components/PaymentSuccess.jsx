import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/App';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    } else {
      setStatus('error');
    }
  }, [searchParams]);

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await api.get(`/payments/stripe/status/${sessionId}`);
      setPaymentDetails(response.data);
      setStatus(response.data.payment_status === 'paid' ? 'success' : 'pending');
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
    }
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
            <p className="text-gray-500">Please wait while we confirm your payment...</p>
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
            <p className="text-gray-500 mb-6">Your booking has been confirmed. Thank you for choosing Travo DMC!</p>
            
            {paymentDetails && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Amount Paid</span>
                  <span className="font-bold text-gray-800">
                    {paymentDetails.currency?.toUpperCase()} {(paymentDetails.amount_total / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="font-bold text-green-600 capitalize">{paymentDetails.payment_status}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold hover:bg-[#003d82] transition-all"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Processing</h1>
            <p className="text-gray-500 mb-6">Your payment is being processed. You'll receive a confirmation email shortly.</p>
            <button
              onClick={() => navigate('/')}
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
