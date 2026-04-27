// Helpers to extract service items from supplier bookings and flatten them
// into per-service rows for the operational dashboard.

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const addDays = (iso, days) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

const guestNames = (booking) => {
  const t = booking.travelers || [];
  if (!t.length) return booking.proposal?.customer_name || '—';
  return t.slice(0, 3).map(x => `${x.title || ''} ${x.firstName || ''} ${x.lastName || ''}`.trim()).join(', ')
    + (t.length > 3 ? ` +${t.length - 3}` : '');
};

const baseRow = (booking, extra = {}) => ({
  booking_id: booking.id,
  order_id: booking.order_id,
  customer: booking.proposal?.customer_name || booking.customer_name || '—',
  guests: guestNames(booking),
  travel_date: booking.proposal?.leaving_on || booking.leaving_on,
  status: booking.supplier_status || 'pending',
  payment_method: booking.payment_method,
  payment_amount: booking.payment_amount,
  ...extra,
});

export const extractHotels = (bookings) => {
  const rows = [];
  bookings.forEach((b) => {
    const p = b.proposal || {};
    const cities = p.cities || [];
    let dayCursor = 0;
    cities.forEach((c, idx) => {
      const cname = c.name || c;
      const nights = c.nights || 1;
      const checkIn = p.leaving_on ? addDays(p.leaving_on, dayCursor) : null;
      const checkOut = checkIn ? addDays(checkIn, nights) : null;
      const h = (p.selected_hotels || {})[`${cname}_${idx}`] || (p.selected_hotels || {})[cname];
      if (h && h.name) {
        const room = h.selectedRoom || h.selected_room || {};
        const numRooms = (p.room_data || []).reduce((s, r) => s + (r.rooms || 1), 0) || 1;
        rows.push(baseRow(b, {
          name: h.name,
          city: cname,
          check_in: h.checkIn || checkIn,
          check_out: h.checkOut || checkOut,
          nights,
          rooms: numRooms,
          room_type: room.name || 'Standard Room',
          meal_plan: room.meal_plan || room.mealPlan || h.meal_plan || 'Room Only',
          star_rating: h.star_rating || h.rating || 0,
          confirmation: h.confirmation_code || 'Pending',
        }));
      }
      dayCursor += nights;
    });
  });
  return rows;
};

export const extractTransfers = (bookings) => {
  const rows = [];
  bookings.forEach((b) => {
    const p = b.proposal || {};
    if (p.arrival_transfer && (p.arrival_transfer.title || p.arrival_transfer.name)) {
      rows.push(baseRow(b, {
        kind: 'Arrival',
        name: p.arrival_transfer.title || p.arrival_transfer.name,
        type: p.arrival_transfer.transfer_type || 'Private',
        date: p.leaving_on,
      }));
    }
    Object.entries(p.inter_city_transfers || {}).forEach(([key, t]) => {
      if (t && (t.title || t.name)) {
        rows.push(baseRow(b, {
          kind: 'Inter-city',
          name: t.title || t.name,
          type: t.transfer_type || 'Private',
          route: key,
        }));
      }
    });
    if (p.departure_transfer && (p.departure_transfer.title || p.departure_transfer.name)) {
      const totalNights = (p.cities || []).reduce((s, c) => s + (c.nights || 1), 0);
      rows.push(baseRow(b, {
        kind: 'Departure',
        name: p.departure_transfer.title || p.departure_transfer.name,
        type: p.departure_transfer.transfer_type || 'Private',
        date: p.leaving_on ? addDays(p.leaving_on, totalNights) : null,
      }));
    }
  });
  return rows;
};

export const extractActivities = (bookings) => {
  const rows = [];
  bookings.forEach((b) => {
    const p = b.proposal || {};
    Object.entries(p.selected_activities || {}).forEach(([key, val]) => {
      const items = Array.isArray(val) ? val : [val];
      items.forEach((a) => {
        if (!a) return;
        const dayMatch = String(key).match(/(\d+)/);
        const dayNum = dayMatch ? Number(dayMatch[1]) : null;
        const date = dayNum && p.leaving_on ? addDays(p.leaving_on, dayNum - 1) : null;
        rows.push(baseRow(b, {
          name: a.name || a.title || '—',
          city: a.city || a.location || '—',
          date,
          duration: a.duration || a.duration_hours || a.length,
          start_time: a.start_time || a.starts || (Array.isArray(a.start_times) ? a.start_times[0] : null),
          type: a.transfer_type || a.type || 'Private',
        }));
      });
    });
  });
  return rows;
};

export const extractFlights = (bookings) => {
  const rows = [];
  bookings.forEach((b) => {
    const p = b.proposal || {};
    const flights = Array.isArray(p.flights) ? p.flights : [];
    flights.forEach((f) => {
      if (!f) return;
      rows.push(baseRow(b, {
        airline: f.airline || f.carrier || '—',
        flight_no: f.flight_number || f.flight_no || f.number || '',
        from: f.from || f.origin || f.departure_airport,
        to: f.to || f.destination || f.arrival_airport,
        depart_at: f.depart_at || f.departure_time || f.departure,
        arrive_at: f.arrive_at || f.arrival_time || f.arrival,
        cabin: f.cabin || f.class || 'Economy',
        pnr: f.pnr || b.confirmation_pnr,
      }));
    });
    // arrival/departure flight info (single trips)
    if (p.arrival_flight_info && (p.arrival_flight_info.flight_no || p.arrival_flight_info.airline)) {
      rows.push(baseRow(b, {
        airline: p.arrival_flight_info.airline || '—',
        flight_no: p.arrival_flight_info.flight_no || '',
        kind: 'Arrival',
        depart_at: p.arrival_flight_info.depart_at || p.arrival_flight_info.arrival_time,
      }));
    }
    if (p.departure_flight_info && (p.departure_flight_info.flight_no || p.departure_flight_info.airline)) {
      rows.push(baseRow(b, {
        airline: p.departure_flight_info.airline || '—',
        flight_no: p.departure_flight_info.flight_no || '',
        kind: 'Departure',
        depart_at: p.departure_flight_info.depart_at || p.departure_flight_info.departure_time,
      }));
    }
  });
  return rows;
};

export const extractAddons = (bookings, kind /* 'insurance' | 'visa' | 'sim' */) => {
  const rows = [];
  bookings.forEach((b) => {
    const p = b.proposal || {};
    const flag = kind === 'insurance' ? p.travel_insurance
      : kind === 'visa' ? p.visa
      : kind === 'sim' ? p.sim_card
      : false;
    if (!flag) return;
    const detail =
      kind === 'insurance' ? (p.travel_insurance_details || p.insurance_provider || 'Standard travel insurance')
      : kind === 'visa' ? (p.visa_country || p.visa_details || (p.cities?.[0]?.name ? `${p.cities[0].name} visa` : 'Tourist visa'))
      : kind === 'sim' ? (p.sim_provider || p.sim_details || 'Local SIM card')
      : '';
    const pax = (p.room_data || []).reduce((s, r) => s + (Number(r.adults || 0) + (r.children?.length || 0)), 0) || 1;
    rows.push(baseRow(b, {
      detail,
      pax,
      city: (p.cities || []).map(c => c.name || c).join(', '),
    }));
  });
  return rows;
};

export { formatDate };
