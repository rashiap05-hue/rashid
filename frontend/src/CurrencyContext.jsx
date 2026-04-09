import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/App';

const CurrencyContext = createContext();

const DEFAULT_RATES = { AED: 1, USD: 0.2723, EUR: 0.2512, GBP: 0.2149, INR: 22.83 };
const CURRENCY_META = {
  AED: { symbol: 'AED', name: 'UAE Dirham' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('travo_currency') || 'AED');
  const [rates, setRates] = useState(DEFAULT_RATES);

  const fetchRates = useCallback(async () => {
    try {
      const res = await api.get('/currency/rates');
      if (res.data?.rates) setRates(res.data.rates);
    } catch {}
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const setCurrency = (code) => {
    setCurrencyState(code);
    localStorage.setItem('travo_currency', code);
  };

  const convert = useCallback((amountInAED) => {
    if (!amountInAED || isNaN(amountInAED)) return 0;
    const rate = rates[currency] || 1;
    return Math.round(amountInAED * rate * 100) / 100;
  }, [currency, rates]);

  const format = useCallback((amountInAED) => {
    const converted = convert(amountInAED);
    const meta = CURRENCY_META[currency] || CURRENCY_META.AED;
    return `${meta.symbol} ${converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }, [convert, currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format, rates, currencies: Object.keys(CURRENCY_META), CURRENCY_META }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
