import React, { useState } from 'react';
import { ArrowLeft, Info, CreditCard, Wallet, Clock, Shield, Copy, Check } from 'lucide-react';

function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'ORN';
  for (let i = 0; i < 9; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

export default function PaymentPage({ proposal, bookingData, onBack }) {
  const [paymentMethod, setPaymentMethod] = useState('tabby');
  const [copied, setCopied] = useState(false);
  const orderId = useState(() => generateOrderId())[0];

  const totalPrice = proposal?.pricing_breakdown?.total || proposal?.total_price || 0;
  const amountToPay = bookingData?.paymentOption === 'partial'
    ? Math.round(totalPrice * 0.25)
    : totalPrice;

  const handleCopyOrder = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methods = [
    { id: 'credit_card', label: 'Credit Card', icon: <CreditCard size={20} className="text-gray-500" /> },
    { id: 'wallet', label: 'My Wallet', icon: <Wallet size={20} className="text-gray-500" /> },
    { id: 'tabby', label: 'Tabby', icon: <Clock size={20} className="text-gray-500" /> },
  ];

  return (
    <div className="min-h-screen bg-white" data-testid="payment-page">
      {/* Top bar */}
      <div className="border-b border-gray-200 sticky top-0 z-30 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors" data-testid="payment-back-btn">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-light text-gray-900">
            Payment for{' '}
            <button
              onClick={handleCopyOrder}
              className="text-[#0094D4] font-medium hover:underline inline-flex items-center gap-1.5"
              data-testid="order-id-copy"
            >
              {orderId}
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </h1>
          <p className="text-sm text-gray-500 mt-1">All transactions are secure and encrypted.</p>
        </div>

        {/* Warning Banner */}
        <div className="mt-6 border-t-2 border-[#E6B800] bg-[#FFF9E6] rounded-b-lg px-5 py-4 flex items-start gap-3" data-testid="payment-warning">
          <Info size={18} className="text-[#C8A000] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700">
            Your booking is confirmed only when payment is received and updated. Any delay in receiving payment can lead to non-availability or price increase.
          </p>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 bg-[#F0F4F5] rounded-xl overflow-hidden border border-gray-200" data-testid="payment-methods">
          {methods.map((method, idx) => (
            <label
              key={method.id}
              className={`flex items-center justify-between px-6 py-5 cursor-pointer transition-colors ${
                idx < methods.length - 1 ? 'border-b border-gray-200' : ''
              } ${paymentMethod === method.id ? 'bg-white' : 'hover:bg-[#E8EDEF]'}`}
              data-testid={`payment-method-${method.id}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method.id ? 'border-[#0094D4]' : 'border-gray-400'
                }`}>
                  {paymentMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0094D4]" />
                  )}
                </div>
                <span className={`text-base ${paymentMethod === method.id ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                  {method.label}
                </span>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={() => setPaymentMethod(method.id)}
                  className="sr-only"
                />
              </div>
              {method.icon}
            </label>
          ))}

          {/* Expanded content for selected method */}
          <div className="px-6 py-6 border-t border-gray-200 bg-white">
            {paymentMethod === 'credit_card' && (
              <div className="space-y-4" data-testid="credit-card-form">
                <div>
                  <label className="text-sm font-medium text-gray-700">Card Number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="card-number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Expiry Date</label>
                    <input type="text" placeholder="MM / YY" className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="card-expiry" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">CVV</label>
                    <input type="text" placeholder="123" className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="card-cvv" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Name on Card</label>
                  <input type="text" placeholder="Full name as on card" className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm" data-testid="card-name" />
                </div>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="text-center py-4" data-testid="wallet-info">
                <Wallet size={32} className="mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">Your wallet balance: <span className="font-bold text-gray-900">AED 0.00</span></p>
                <p className="text-xs text-gray-500 mt-1">Insufficient balance. Please top up or choose another method.</p>
              </div>
            )}

            {paymentMethod === 'tabby' && (
              <div data-testid="tabby-info">
                <p className="text-sm text-gray-600">Pay in 4 interest-free installments with Tabby.</p>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                      <p className="text-[11px] text-gray-500 uppercase">Payment {i}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">AED {Math.round(amountToPay / 4).toLocaleString()}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{i === 1 ? 'Today' : `Month ${i}`}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amount Summary */}
        <div className="mt-8 flex items-center justify-between bg-gray-50 rounded-xl px-6 py-5 border border-gray-200" data-testid="payment-amount-summary">
          <div>
            <p className="text-sm text-gray-500">Amount to pay</p>
            <p className="text-2xl font-bold text-gray-900">AED {amountToPay.toLocaleString()}.00</p>
          </div>
          <button
            className="px-8 py-3 bg-[#002B5B] hover:bg-[#003d82] text-white font-bold rounded-lg transition-colors text-sm"
            data-testid="pay-now-btn"
            onClick={() => alert(`Payment of AED ${amountToPay.toLocaleString()} via ${paymentMethod} — integration coming soon!`)}
          >
            Pay Now
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400">
          <Shield size={14} />
          <p className="text-xs">Secured by 256-bit SSL encryption</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 bg-gray-900 text-center py-4">
        <p className="text-xs text-gray-500">Powered by Travo DMC</p>
      </div>
    </div>
  );
}
