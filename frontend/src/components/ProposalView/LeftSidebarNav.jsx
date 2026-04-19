import React from 'react';
import { Plane, Hotel, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeftSidebarNav({ proposal, activeSection, onSectionChange }) {
  const nightsCount = proposal?.cities?.reduce((acc, c) => acc + (c.nights || 0), 0) || 1;
  const daysCount = nightsCount + 1;
  
  const timelineItems = [
    { id: 'flights', type: 'section', icon: Plane, label: 'Flights' },
  ];
  
  proposal?.cities?.forEach((city, idx) => {
    timelineItems.push({
      id: `city-${idx}`, type: 'city', icon: Hotel,
      label: `${city.nights} Nights ${city.name}`, city: city.name, nights: city.nights
    });
  });
  
  for (let i = 1; i <= daysCount; i++) {
    const isFirst = i === 1;
    const isLast = i === daysCount;
    timelineItems.push({
      id: `day-${i}`, type: 'day', day: i,
      label: isFirst ? 'Arrival' : isLast ? 'Departure' : `Day ${i}`,
      subLabel: isFirst ? `Day${i}` : isLast ? `Day${i}` : ''
    });
  }
  
  if (proposal?.travel_insurance) {
    timelineItems.push({ id: 'insurance', type: 'section', icon: Shield, label: 'Travel Insurance' });
  }
  
  return (
    <div className="group/sidebar fixed left-0 top-20 bg-white border-r border-gray-200 shadow-lg z-30 hidden lg:flex flex-col py-2 rounded-r-lg max-h-[80vh] overflow-y-auto overflow-x-hidden w-10 hover:w-44 transition-all duration-200 ease-in-out">
      <div className="px-2.5 py-2 border-b border-gray-100 min-h-[28px]">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">Trip Overview</span>
      </div>
      {timelineItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSectionChange(item.id)}
          title={item.label}
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 text-left transition-colors text-sm whitespace-nowrap",
            activeSection === item.id 
              ? "bg-teal-50 text-teal-700 border-l-2 border-teal-500" 
              : "text-gray-600 hover:bg-gray-50 border-l-2 border-transparent"
          )}
        >
          {item.type === 'section' && item.icon && <item.icon size={14} className="flex-shrink-0" />}
          {item.type === 'city' && (
            <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-teal-600">{item.city?.charAt(0)}</span>
            </div>
          )}
          {item.type === 'day' && (
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-gray-500">{item.day}</span>
            </div>
          )}
          <span className="truncate text-xs opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
