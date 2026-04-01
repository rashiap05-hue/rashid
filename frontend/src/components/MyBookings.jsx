import React, { useState, useEffect } from 'react';
import { api } from '@/App';
import { Calendar, MapPin, Users, Clock, Eye, ChevronRight } from 'lucide-react';

export default function MyBookings({ onViewProposal }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/held-bookings');
        setBookings(res.data || []);
      } catch (e) {
        console.error('Failed to fetch bookings:', e);
      }
      setLoading(false);
    };
    fetchBookings();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'held': return 'bg-amber-100 text-amber-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai'
      });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#002B5B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8" data-testid="my-bookings-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No bookings yet</p>
          <p className="text-sm text-gray-400 mt-1">Held proposals will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              data-testid={`booking-card-${booking.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-gray-900">{booking.proposal_name || 'Untitled Trip'}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    {booking.customer_name && (
                      <span className="flex items-center gap-1">
                        <Users size={14} /> {booking.customer_name}
                      </span>
                    )}
                    {booking.cities?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {booking.cities.map(c => c.name || c).join(', ')}
                      </span>
                    )}
                    {booking.leaving_on && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> {formatDate(booking.leaving_on)}
                      </span>
                    )}
                    {booking.rooms && (
                      <span>{booking.rooms} room, {booking.adults} adults</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {booking.hold_until_date && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                        <Clock size={14} /> Hold until {formatDate(booking.hold_until_date)}
                      </span>
                    )}
                    {booking.total_price > 0 && (
                      <span className="font-bold text-gray-900">AED {Number(booking.total_price).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onViewProposal?.(booking.proposal_id)}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#002B5B] border border-[#002B5B] rounded-lg hover:bg-[#002B5B] hover:text-white transition-colors"
                  data-testid={`view-booking-${booking.id}`}
                >
                  <Eye size={14} /> View <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
