import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, LayoutDashboard, Settings, FileText, 
  PieChart, MessageSquare, Bell, LogOut, ArrowLeft, ChevronDown, ChevronUp, Globe,
  Users, Briefcase, Calendar, Download, UserPlus, ClipboardList, Wallet, Upload, UserCog, User, Check,
  Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/App';
import { useCurrency } from '@/CurrencyContext';

export const NAV_ITEMS = [
  { name: 'Home', icon: LayoutDashboard },
  { 
    name: 'Flights', 
    icon: Plane,
    subItems: [
      { name: 'Flight Search' },
      { name: 'Special Flights' },
      { name: 'Passenger Calendar' }
    ]
  },
  { 
    name: 'Holidays', 
    icon: Globe,
    subItems: [
      { name: 'FIT Packages' },
      { name: 'Group Tours' },
      { name: 'Adhoc Group' },
      { name: 'Private Tours' }
    ]
  },
  { name: 'Hotels', icon: Hotel },
  { name: 'Activities', icon: MapPin },
  { 
    name: 'Marketing', 
    icon: PieChart,
    subItems: [
      { name: 'Generate Leads' },
      { name: 'Download Flyers' }
    ]
  },
  { 
    name: 'My Leads', 
    icon: MessageSquare,
    subItems: [
      { name: 'My Leads' },
      { name: 'My Proposals' },
      { name: 'My Bookings' },
      { name: 'Expert Dashboard' },
      { name: 'Pending Followups' }
    ]
  },
  { name: 'Settings', icon: Settings },
  { name: 'Account Statement', icon: FileText },
];

const PROFILE_ITEMS = [
  { name: 'Wallet Statement', icon: Wallet },
  { name: 'Upload Deposit', icon: Upload },
  { name: 'Update Deposit Request', icon: FileText },
  { name: 'Manage Staff', icon: Users },
  { name: 'Profile', icon: User },
];

export default function Header({ 
  user, onLogout, activeTab, setActiveTab, onNewBooking,
  currentView, onGoHome, onBack, showNewBooking = true, onNavigate
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(null);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const { currency, setCurrency, currencies, CURRENCY_META } = useCurrency();

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {}
  }, []);

  useEffect(() => { fetchUnread(); const iv = setInterval(fetchUnread, 15000); return () => clearInterval(iv); }, [fetchUnread]);

  const openNotifications = async () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen) {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data || []);
      } catch {}
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const formatNotifTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'Asia/Dubai' });
  };

  return (
    <div className="sticky top-0 z-50 w-full" data-testid="header">
      {/* Top Header */}
      <header className="bg-[#002B5B] text-white py-2 px-3 md:px-6 flex justify-between items-center text-xs">
        <div className="flex gap-2 md:gap-4">
          <span className="cursor-pointer hover:text-blue-200 hidden sm:inline">Feedback/Help</span>
          {/* Currency Selector */}
          <div className="relative" onMouseLeave={() => setCurrencyOpen(false)}>
            <button onClick={() => setCurrencyOpen(!currencyOpen)} className="flex items-center gap-1 cursor-pointer hover:text-blue-200" data-testid="currency-selector">
              <span className="font-medium">{CURRENCY_META[currency]?.symbol || currency}</span>
              <ChevronDown size={12} />
            </button>
            {currencyOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-lg shadow-xl border border-gray-200 z-[100] overflow-hidden" data-testid="currency-dropdown">
                {currencies.map(code => (
                  <button key={code} onClick={() => { setCurrency(code); setCurrencyOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 ${currency === code ? 'bg-blue-50 text-[#002B5B] font-bold' : 'text-gray-700'}`}
                    data-testid={`currency-${code}`}>
                    <span>{CURRENCY_META[code]?.name || code} ({CURRENCY_META[code]?.symbol})</span>
                    {currency === code && <Check size={14} className="text-[#002B5B]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Notifications */}
          <div className="relative" onMouseLeave={() => setNotifOpen(false)}>
            <button onClick={openNotifications} className="flex items-center gap-1 cursor-pointer hover:text-blue-200 relative" data-testid="notification-bell">
              <Bell size={14} />
              <span className="hidden sm:inline">Notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center" data-testid="unread-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] overflow-hidden" data-testid="notification-dropdown">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-bold text-gray-800">Notifications</p>
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-[#0066CC] font-medium hover:underline" data-testid="mark-all-read">Mark all read</button>}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-8">No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`} data-testid={`notif-${n.id}`}>
                      <div className="flex items-start gap-2">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#0066CC] mt-1.5 flex-shrink-0" />}
                        <div className={!n.read ? '' : 'ml-4'}>
                          <p className="text-xs font-bold text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatNotifTime(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Profile */}
          <div className="relative" onMouseEnter={() => setProfileDropdown(true)} onMouseLeave={() => setProfileDropdown(false)}>
            <div className="flex items-center gap-1.5 md:gap-2 border-l border-white/20 pl-2 md:pl-4 cursor-pointer">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <span className="font-medium hidden sm:inline max-w-[100px] truncate" data-testid="user-name">{user?.full_name || 'User'}</span>
              <ChevronDown size={14} className={cn("transition-transform hidden sm:block", profileDropdown && "rotate-180")} />
            </div>
            <AnimatePresence>
              {profileDropdown && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl overflow-hidden z-[100] border border-gray-100">
                  {PROFILE_ITEMS.map(item => (
                    <button key={item.name}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
                      onClick={() => {
                        setProfileDropdown(false);
                        if (item.name === 'Wallet Statement' || item.name === 'Upload Deposit') onNavigate?.('wallet');
                        else if (item.name === 'Manage Staff') onNavigate?.('staff-dashboard');
                      }}>
                      <item.icon size={16} className="text-gray-400" />
                      {item.name}
                    </button>
                  ))}
                  <button onClick={onLogout} data-testid="logout-button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3 border-t border-gray-200">
                    <LogOut size={16} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 md:gap-8">
          {currentView !== 'dashboard' && onBack && (
            <button onClick={onBack} data-testid="back-button" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center cursor-pointer group" onClick={onGoHome} data-testid="logo">
            <img 
              src="https://customer-assets.emergentagent.com/job_9551fded-e336-4914-adea-a4f43af148f3/artifacts/y64ehjld_cropped-91219F02-59CF-4C4C-902E-201DB942ADE9-1-e1693132870286.png" 
              alt="Travo Tours & Travels" 
              className="h-10 md:h-12 object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map(item => (
              <div key={item.name} className="relative"
                onMouseEnter={() => item.subItems && setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}>
                <button
                  onClick={() => {
                    if (item.name === 'Account Statement') onNavigate?.('wallet');
                    else setActiveTab(item.name);
                  }}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  className={cn("text-sm font-medium transition-colors hover:text-[#002B5B] flex items-center gap-1.5 relative py-1",
                    activeTab === item.name ? "text-[#002B5B]" : "text-gray-500")}>
                  <item.icon size={16} />
                  {item.name}
                  {item.subItems && (openDropdown === item.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                  {activeTab === item.name && <div className="absolute -bottom-[15px] left-0 right-0 h-0.5 bg-[#002B5B]" />}
                </button>
                <AnimatePresence>
                  {item.subItems && openDropdown === item.name && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-[#333333] text-white rounded shadow-xl overflow-hidden z-[60]">
                      {item.subItems.map(sub => (
                        <button key={sub.name}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-[#444444] transition-colors border-b border-white/10 last:border-0"
                          onClick={() => { setActiveTab(sub.name); setOpenDropdown(null); }}
                          data-testid={`nav-sub-${sub.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          {sub.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user?.role === 'supplier' && (
            <button onClick={() => window.location.href = '/supplier-dashboard'} data-testid="supplier-portal-btn"
              className="bg-teal-600 text-white px-3 md:px-4 py-2 rounded text-xs md:text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
              Supplier Portal
            </button>
          )}
          {showNewBooking && (
            <button onClick={onNewBooking} data-testid="new-booking-button"
              className="bg-[#002B5B] text-white px-3 md:px-4 py-2 rounded text-xs md:text-sm font-medium hover:bg-[#003d82] transition-colors shadow-sm">
              + New Booking
            </button>
          )}
          {/* Hamburger Menu - Mobile */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600" data-testid="mobile-menu-toggle">
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Slide Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[80] lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-white z-[90] shadow-2xl overflow-y-auto lg:hidden" data-testid="mobile-menu">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#002B5B] text-white">
                <span className="font-bold">Menu</span>
                <button onClick={() => setMobileMenuOpen(false)}><X size={20} /></button>
              </div>
              <div className="py-2">
                {NAV_ITEMS.map(item => (
                  <div key={item.name}>
                    <button
                      onClick={() => {
                        if (item.subItems) {
                          setMobileSubOpen(mobileSubOpen === item.name ? null : item.name);
                        } else {
                          if (item.name === 'Account Statement') onNavigate?.('wallet');
                          else setActiveTab(item.name);
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={cn("w-full text-left px-4 py-3.5 text-sm font-medium flex items-center justify-between",
                        activeTab === item.name ? "text-[#002B5B] bg-blue-50" : "text-gray-700 hover:bg-gray-50")}>
                      <span className="flex items-center gap-3"><item.icon size={18} /> {item.name}</span>
                      {item.subItems && <ChevronDown size={16} className={cn("transition-transform", mobileSubOpen === item.name && "rotate-180")} />}
                    </button>
                    {item.subItems && mobileSubOpen === item.name && (
                      <div className="bg-gray-50 border-y border-gray-100">
                        {item.subItems.map(sub => (
                          <button key={sub.name}
                            onClick={() => { setActiveTab(sub.name); setMobileMenuOpen(false); }}
                            className={cn("w-full text-left pl-12 pr-4 py-3 text-sm",
                              activeTab === sub.name ? "text-[#002B5B] font-bold" : "text-gray-600 hover:text-gray-800")}>
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 p-4">
                <button onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
