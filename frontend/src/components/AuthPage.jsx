import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Building2, User, ArrowRight, Globe, ShieldCheck, Zap, Loader2 } from 'lucide-react';
import { api } from '@/App';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    
    try {
      const response = await api.post(endpoint, formData);
      onLoginSuccess(response.data.user, response.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans" data-testid="auth-page">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#002B5B] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full -ml-48 -mb-48 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#002B5B] font-black text-2xl shadow-xl">T</div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-2xl tracking-tight">TRAVO DMC</span>
              <span className="text-blue-200 text-xs font-medium tracking-widest uppercase">B2B Travel Platform</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-8">
            The Future of <br />
            <span className="text-blue-300">B2B Travel Booking</span>
          </h1>

          <div className="space-y-8">
            {[
              { icon: Globe, title: 'Global Inventory', desc: 'Access direct contracts with 1,400+ hotels and local suppliers.' },
              { icon: ShieldCheck, title: 'Verified Suppliers', desc: 'Every partner on our platform undergoes rigorous quality checks.' },
              { icon: Zap, title: 'AI-Powered Planning', desc: 'Get instant itinerary recommendations powered by Gemini AI.' }
            ].map((feature, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <feature.icon className="text-blue-300" size={24} />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{feature.title}</h3>
                  <p className="text-blue-100/60 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-200/40 text-sm">
          © 2026 Travo DMC. Empowering travel agents worldwide.
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#002B5B] mb-2" data-testid="auth-title">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-500">
              {isLogin 
                ? 'Enter your credentials to access your dashboard' 
                : 'Join our network of 7,200+ active travel agents'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="auth-form">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="John Doe"
                        data-testid="fullname-input"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none transition-all"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        required
                        type="text" 
                        placeholder="Travel Agency Ltd"
                        data-testid="company-input"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none transition-all"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="email" 
                  placeholder="agent@example.com"
                  data-testid="email-input"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold text-[#002B5B] hover:underline">Forgot Password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="password" 
                  placeholder="••••••••"
                  data-testid="password-input"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#002B5B] focus:border-transparent outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg font-medium" data-testid="error-message">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              type="submit" 
              data-testid="submit-button"
              className="w-full bg-[#002B5B] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#003d82] transition-all shadow-xl shadow-[#002B5B]/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                data-testid="toggle-auth-mode"
                className="text-[#002B5B] font-bold hover:underline"
              >
                {isLogin ? 'Sign Up Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
