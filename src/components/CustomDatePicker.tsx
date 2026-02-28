import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomDatePickerProps {
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  className?: string;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  onClose,
  className
}: CustomDatePickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date(value || new Date()));
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Previous month days for padding
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, current: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, current: true, date: new Date(year, month, i) });
    }

    // Next month days to fill grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
    }

    return (
      <div className="w-full">
        <div className="text-center font-bold text-gray-800 mb-2 text-xs">
          {date.toLocaleString('default', { month: 'long' })} {year}
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] text-gray-500 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100">
          {days.map((d, i) => {
            const isToday = d.date.getTime() === today.getTime();
            const isSelected = d.date.toISOString().split('T')[0] === value;
            const isPast = d.date < today;
            const isCurrentMonth = d.current;

            return (
              <button
                key={i}
                type="button"
                disabled={isPast}
                onClick={() => {
                  const year = d.date.getFullYear();
                  const month = String(d.date.getMonth() + 1).padStart(2, '0');
                  const day = String(d.date.getDate()).padStart(2, '0');
                  onChange(`${year}-${month}-${day}`);
                  onClose();
                }}
                className={cn(
                  "h-8 bg-white flex items-center justify-center text-[11px] transition-colors",
                  !isCurrentMonth ? "text-gray-300" : "text-gray-700",
                  isPast && "text-gray-200 cursor-not-allowed",
                  isToday && "text-blue-600 font-bold",
                  isSelected && "bg-[#0081FF] text-white font-bold",
                  !isPast && !isSelected && "hover:bg-gray-50"
                )}
              >
                {d.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("absolute z-[300] top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-2xl p-4 w-[550px]", className)}
    >
      <div className="flex justify-between items-center mb-4 px-2">
        <button 
          type="button"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
        >
          <ChevronLeft size={18} />
        </button>
        <button 
          type="button"
          onClick={() => {
            const now = new Date();
            setCurrentDate(now);
          }}
          className="text-sm font-bold text-gray-800 hover:underline"
        >
          Today
        </button>
        <button 
          type="button"
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex gap-6">
        {renderMonth(currentDate)}
        {renderMonth(nextMonth)}
      </div>

      <div className="mt-4 pt-2 flex justify-end">
        <button 
          type="button" 
          onClick={onClose}
          className="text-sm font-bold text-gray-800 hover:underline"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}
