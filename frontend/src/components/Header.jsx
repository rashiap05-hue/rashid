import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plane, Hotel, MapPin, LayoutDashboard, Settings, FileText, 
  PieChart, MessageSquare, Bell, LogOut, ArrowLeft, ChevronDown, ChevronUp, Globe
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
  { name: 'Holidays', icon: Globe },
  { name: 'Hotels', icon: Hotel },
  { name: 'Activities', icon: MapPin },
  { name: 'Marketing', icon: PieChart },
  { name: 'My Leads', icon: MessageSquare },
  { name: 'Settings', icon: Settings },
  { name: 'Account Statement', icon: FileText },
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
          <div className="flex items-center gap-2 border-l border-white/20 pl-4">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">
              {user?.full_name?.[0] || 'U'}
            </div>
            <span className="font-medium" data-testid="user-name">{user?.full_name || 'User'}</span>
            <button onClick={onLogout} data-testid="logout-button" className="hover:text-red-300 transition-colors ml-2">
              <LogOut size={14} />
            </button>
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
            className="flex items-center gap-2 cursor-pointer group"
            onClick={onGoHome}
            data-testid="logo"
          >
            <div className="w-10 h-10 bg-[#002B5B] rounded flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">T</div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-xl tracking-tight text-[#002B5B]">TRAVO DMC</span>
              <span className="text-[10px] text-gray-400 font-medium">B2B TRAVEL PLATFORM</span>
            </div>
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
                            setActiveTab(item.name);
                            setOpenDropdown(null);
                          }}
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
