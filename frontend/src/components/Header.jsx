import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, LayoutDashboard, Settings, FileText, 
  PieChart, MessageSquare, Bell, LogOut, ArrowLeft, ChevronDown, ChevronUp, Globe,
  Users, Briefcase, Calendar, Download, UserPlus, ClipboardList, Wallet, Upload, UserCog, User
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Profile dropdown items
const PROFILE_ITEMS = [
  { name: 'Wallet Statement', icon: Wallet },
  { name: 'Upload Deposit', icon: Upload },
  { name: 'Update Deposit Request', icon: FileText },
  { name: 'Manage Staff', icon: Users },
  { name: 'Profile', icon: User },
];

export default function Header({ 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  onNewBooking,
  currentView,
  onGoHome,
  onBack
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileDropdown, setProfileDropdown] = useState(false);

  return (
    <div className="sticky top-0 z-50 w-full" data-testid="header">
      {/* Top Header */}
      <header className="bg-[#002B5B] text-white py-2 px-6 flex justify-between items-center text-xs">
        <div className="flex gap-4">
          <span className="cursor-pointer hover:text-blue-200">Feedback/Help</span>
          <span className="cursor-pointer hover:text-blue-200">Package (AED/IND)</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 cursor-pointer hover:text-blue-200">
            <Bell size={14} />
            <span>Notifications</span>
          </div>
          
          {/* Profile Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setProfileDropdown(true)}
            onMouseLeave={() => setProfileDropdown(false)}
          >
            <div className="flex items-center gap-2 border-l border-white/20 pl-4 cursor-pointer">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <span className="font-medium" data-testid="user-name">{user?.full_name || 'User'}</span>
              <ChevronDown size={14} className={cn("transition-transform", profileDropdown && "rotate-180")} />
            </div>
            
            <AnimatePresence>
              {profileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl overflow-hidden z-[100] border border-gray-100"
                >
                  {PROFILE_ITEMS.map((item) => (
                    <button
                      key={item.name}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
                      onClick={() => {
                        // Handle navigation based on item
                        setProfileDropdown(false);
                      }}
                    >
                      <item.icon size={16} className="text-gray-400" />
                      {item.name}
                    </button>
                  ))}
                  <button
                    onClick={onLogout}
                    data-testid="logout-button"
                    className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 transition-colors flex items-center gap-3 border-t border-gray-200"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-8">
          {currentView !== 'dashboard' && onBack && (
            <button 
              onClick={onBack}
              data-testid="back-button"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div 
            className="flex items-center cursor-pointer group"
            onClick={onGoHome}
            data-testid="logo"
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_9551fded-e336-4914-adea-a4f43af148f3/artifacts/y64ehjld_cropped-91219F02-59CF-4C4C-902E-201DB942ADE9-1-e1693132870286.png" 
              alt="Travo Tours & Travels" 
              className="h-12 object-contain group-hover:scale-105 transition-transform"
            />
          </div>
          
          <div className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <div 
                key={item.name} 
                className="relative"
                onMouseEnter={() => item.subItems && setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  onClick={() => setActiveTab(item.name)}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-[#002B5B] flex items-center gap-1.5 relative py-1",
                    activeTab === item.name ? "text-[#002B5B]" : "text-gray-500"
                  )}
                >
                  <item.icon size={16} />
                  {item.name}
                  {item.subItems && (
                    openDropdown === item.name ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                  {activeTab === item.name && (
                    <div className="absolute -bottom-[19px] left-0 right-0 h-0.5 bg-[#002B5B]" />
                  )}
                </button>

                <AnimatePresence>
                  {item.subItems && openDropdown === item.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-[#333333] text-white rounded shadow-xl overflow-hidden z-[60]"
                    >
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.name}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-[#444444] transition-colors border-b border-white/10 last:border-0"
                          onClick={() => {
                            setActiveTab(sub.name);
                            setOpenDropdown(null);
                          }}
                          data-testid={`nav-sub-${sub.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
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
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onNewBooking}
            data-testid="new-booking-button"
            className="bg-[#002B5B] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#003d82] transition-colors shadow-sm"
          >
            + New Booking
          </button>
        </div>
      </nav>
    </div>
  );
}
