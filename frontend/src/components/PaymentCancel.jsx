import React from 'react';
import { motion } from 'framer-motion';
import { XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6" data-testid="payment-cancel">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          <XCircle className="w-24 h-24 text-red-500 mx-auto mb-6" />
        </motion.div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
        <p className="text-gray-500 mb-6">
          Your payment was cancelled. Your booking has not been processed.
          Don't worry, no charges were made to your account.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold hover:bg-[#003d82] transition-all"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
