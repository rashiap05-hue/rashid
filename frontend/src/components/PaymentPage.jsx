import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, CreditCard, Wallet, Clock, Shield, Copy, Check, Landmark, Loader2 } from 'lucide-react';
import { api } from '@/App';

function generateOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'TBM-P';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

export default function PaymentPage({ proposal, bookingData, onBack, onPaymentSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState('tabby');
  const [copied, setCopied] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const orderId = useState(() => generateOrderId())[0];

  const totalPrice = proposal?.pricing_breakdown?.total || proposal?.total_price || 0;
  const markupLand = proposal?.markup_land || 0;
  const discountAmount = proposal?.discount_amount || 0;
  const priceAfterMarkup = totalPrice + markupLand - discountAmount;
  // Honour the customPartialAmount the admin/staff entered on the booking
  // confirmation page (falls back to 25 % default for non-privileged users).
  const amountToPay = bookingData?.paymentOption === 'partial'
    ? (Number(bookingData?.customPartialAmount) > 0
        ? Number(bookingData.customPartialAmount)
        : Math.round(priceAfterMarkup * 0.25))
    : priceAfterMarkup;

  // Fetch wallet balance when wallet method is selected
  useEffect(() => {
    if (paymentMethod === 'wallet' && walletBalance === null) {
      setWalletLoading(true);
      api.get('/wallets/my').then(res => {
        setWalletBalance(res.data?.balance || 0);
      }).catch(() => setWalletBalance(0)).finally(() => setWalletLoading(false));
    }
  }, [paymentMethod, walletBalance]);

  const handlePayFromWallet = async () => {
    if (walletBalance < amountToPay) return;
    setPaying(true);
    try {
      // 1. Debit wallet
      await api.post('/wallets/debit', {
        amount: amountToPay,
        note: `Payment for ${proposal?.proposal_name || 'Trip'} - Order ${orderId}`,
        type: 'booking_payment'
      });

      // 2. Create booking record
      await api.post('/bookings', {
        proposal_id: proposal.id,
        travelers: bookingData?.travelers || [],
        contactInfo: bookingData?.contactInfo || {},
        specialOccasion: bookingData?.specialOccasion || 'none',
        paymentOption: bookingData?.paymentOption || 'full',
        confirmationTime: new Date().toISOString(),
        payment_method: 'wallet',
        payment_amount: amountToPay,
        order_id: orderId,
      });

      setPaymentSuccess(true);
      setWalletBalance(prev => prev - amountToPay);

      // Redirect to My Bookings dashboard after a brief success state
      setTimeout(() => {
        onPaymentSuccess?.();
      }, 1500);
    } catch (e) {
      alert(e.response?.data?.detail || 'Payment failed. Please try again.');
    }
    setPaying(false);
  };

  const handleCopyOrder = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const methods = [
    { id: 'credit_card', label: 'Credit Card', icon: <CreditCard size={20} className="text-gray-500" /> },
    { id: 'bank_emi', label: 'Bank EMI', icon: <Landmark size={20} className="text-gray-500" /> },
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

            {paymentMethod === 'bank_emi' && (
              <div data-testid="bank-emi-info">
                <p className="text-sm text-gray-600 mb-4">Convert your payment into easy monthly installments with your bank.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Select Bank</label>
                    <select className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm bg-white" data-testid="emi-bank-select">
                      <option value="">Choose your bank</option>
                      <option value="emirates_nbd">Emirates NBD</option>
                      <option value="adcb">ADCB</option>
                      <option value="mashreq">Mashreq Bank</option>
                      <option value="fab">First Abu Dhabi Bank</option>
                      <option value="dib">Dubai Islamic Bank</option>
                      <option value="rakbank">RAKBANK</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">EMI Tenure</label>
                    <div className="mt-2 grid grid-cols-4 gap-3">
                      {[3, 6, 9, 12].map(months => (
                        <button
                          key={months}
                          className="bg-gray-50 hover:bg-[#E8F4FD] hover:border-[#0094D4] rounded-lg p-3 text-center border border-gray-200 transition-colors focus:bg-[#E8F4FD] focus:border-[#0094D4]"
                          data-testid={`emi-tenure-${months}`}
                        >
                          <p className="text-sm font-bold text-gray-900">{months} Months</p>
                          <p className="text-[11px] text-gray-500 mt-1">AED {Math.round(amountToPay / months).toLocaleString()}/mo</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">EMI availability and interest rates depend on your bank and card type. Processing fee may apply.</p>
                </div>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div data-testid="wallet-info">
                {walletLoading ? (
                  <div className="text-center py-4">
                    <Loader2 size={24} className="mx-auto animate-spin text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Loading wallet...</p>
                  </div>
                ) : paymentSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Check size={32} className="text-green-600" />
                    </div>
                    <p className="text-lg font-bold text-green-700">Payment Successful!</p>
                    <p className="text-sm text-gray-500 mt-1">AED {amountToPay.toLocaleString()} debited from your wallet</p>
                    <p className="text-xs text-gray-400 mt-2">Remaining balance: AED {Number(walletBalance).toLocaleString()}</p>
                  </div>
                ) : walletBalance >= amountToPay ? (
                  <div className="py-4">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-700">Wallet Balance</p>
                        <p className="text-xl font-bold text-green-700">AED {Number(walletBalance).toLocaleString()}</p>
                      </div>
                      <Check size={20} className="text-green-600" />
                    </div>
                    <p className="text-sm text-gray-500">AED {amountToPay.toLocaleString()} will be debited from your wallet.</p>
                    <p className="text-xs text-gray-400 mt-1">Remaining after payment: AED {(walletBalance - amountToPay).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-700">Wallet Balance</p>
                        <p className="text-xl font-bold text-red-600">AED {Number(walletBalance || 0).toLocaleString()}</p>
                      </div>
                      <Info size={20} className="text-red-400" />
                    </div>
                    <p className="text-sm text-red-600">Insufficient balance. You need AED {(amountToPay - (walletBalance || 0)).toLocaleString()} more.</p>
                    <p className="text-xs text-gray-500 mt-1">Please top up your wallet or choose another payment method.</p>
                  </div>
                )}
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
            className={`px-8 py-3 font-bold rounded-lg transition-colors text-sm flex items-center gap-2 ${
              paymentSuccess 
                ? 'bg-green-600 text-white cursor-default' 
                : (paymentMethod === 'wallet' && (walletBalance === null || walletBalance < amountToPay))
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#002B5B] hover:bg-[#003d82] text-white'
            }`}
            data-testid="pay-now-btn"
            disabled={paying || paymentSuccess || (paymentMethod === 'wallet' && (walletBalance === null || walletBalance < amountToPay))}
            onClick={() => {
              if (paymentMethod === 'wallet') {
                handlePayFromWallet();
              } else {
                alert(`Payment of AED ${amountToPay.toLocaleString()} via ${paymentMethod} — integration coming soon!`);
              }
            }}
          >
            {paying && <Loader2 size={16} className="animate-spin" />}
            {paymentSuccess ? 'Paid' : paying ? 'Processing...' : 'Pay Now'}
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
