// Helpers to extract service items from supplier bookings and flatten them
// into per-service rows for the operational dashboard.
//
// Each row carries:
//   - `service_type`: 'hotel' | 'transfer' | 'activity' | 'flight'
//   - `service_key`: stable identifier inside the proposal (e.g. 'Bangkok_0', 'arrival', 'inter:0_1', 'Day 2#0')
//   - `status`: per-service status from proposal (overrides booking.supplier_status)
//   - `confirmation`: per-service confirmation number stamped by the operations team

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
  payment_method: booking.payment_method,
  payment_amount: booking.payment_amount,
  ...extra,
});

// Pick per-service status / confirmation from booking.service_confirmations
// using the unique key "<type>:<key>". Falls back to booking.supplier_status.
const pickConf = (booking, type, key) =>
  (booking.service_confirmations || {})[`${type}:${key}`] || null;

const pickStatus = (booking, type, key) =>
  pickConf(booking, type, key)?.status
  || booking.supplier_status
  || 'pending';

const pickConfirmation = (booking, type, key) =>
  pickConf(booking, type, key)?.confirmation_number || '';

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
      const key = `${cname}_${idx}`;
      const h = (p.selected_hotels || {})[key] || (p.selected_hotels || {})[cname];
      if (h && h.name) {
        const room = h.selectedRoom || h.selected_room || {};
        const numRooms = (p.room_data || []).reduce((s, r) => s + (r.rooms || 1), 0) || 1;
        rows.push(baseRow(b, {
          service_type: 'hotel',
          service_key: key,
          status: pickStatus(b, 'hotel', key),
          name: h.name,
          city: cname,
          check_in: h.checkIn || checkIn,
          check_out: h.checkOut || checkOut,
          nights,
          rooms: numRooms,
          room_type: room.name || 'Standard Room',
          meal_plan: room.meal_plan || room.mealPlan || h.meal_plan || 'Room Only',
          star_rating: h.star_rating || h.rating || 0,
          confirmation: pickConfirmation(b, 'hotel', key) || 'Pending',
          op_note: pickConf(b, 'hotel', key)?.op_note,
          reject_reason: pickConf(b, 'hotel', key)?.reject_reason,
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
    const a = p.arrival_transfer;
    if (a && (a.title || a.name)) {
      rows.push(baseRow(b, {
        service_type: 'transfer',
        service_key: 'arrival',
        status: pickStatus(b, 'transfer', 'arrival'),
        confirmation: pickConfirmation(b, 'transfer', 'arrival') || 'Pending',
        kind: 'Arrival',
        name: a.title || a.name,
        type: a.transfer_type || 'Private',
        date: p.leaving_on,
      }));
    }
    Object.entries(p.inter_city_transfers || {}).forEach(([key, t]) => {
      if (t && (t.title || t.name)) {
        const sk = `inter:${key}`;
        rows.push(baseRow(b, {
          service_type: 'transfer',
          service_key: sk,
          status: pickStatus(b, 'transfer', sk),
          confirmation: pickConfirmation(b, 'transfer', sk) || 'Pending',
          kind: 'Inter-city',
          name: t.title || t.name,
          type: t.transfer_type || 'Private',
          route: key,
        }));
      }
    });
    const dep = p.departure_transfer;
    if (dep && (dep.title || dep.name)) {
      const totalNights = (p.cities || []).reduce((s, c) => s + (c.nights || 1), 0);
      rows.push(baseRow(b, {
        service_type: 'transfer',
        service_key: 'departure',
        status: pickStatus(b, 'transfer', 'departure'),
        confirmation: pickConfirmation(b, 'transfer', 'departure') || 'Pending',
        kind: 'Departure',
        name: dep.title || dep.name,
        type: dep.transfer_type || 'Private',
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
      items.forEach((a, i) => {
        if (!a) return;
        const dayMatch = String(key).match(/(\d+)/);
        const dayNum = dayMatch ? Number(dayMatch[1]) : null;
        const date = dayNum && p.leaving_on ? addDays(p.leaving_on, dayNum - 1) : null;
        const isArray = Array.isArray(val);
        const skey = isArray ? `${key}#${i}` : key;
        rows.push(baseRow(b, {
          service_type: 'activity',
          service_key: skey,
          status: pickStatus(b, 'activity', skey),
          confirmation: pickConfirmation(b, 'activity', skey) || 'Pending',
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
    flights.forEach((f, i) => {
      if (!f) return;
      const skey = String(i);
      rows.push(baseRow(b, {
        service_type: 'flight',
        service_key: skey,
        status: pickStatus(b, 'flight', skey),
        confirmation: pickConfirmation(b, 'flight', skey) || 'Pending',
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
    if (p.arrival_flight_info && (p.arrival_flight_info.flight_no || p.arrival_flight_info.airline)) {
      rows.push(baseRow(b, {
        service_type: 'flight',
        service_key: 'arrival',
        status: pickStatus(b, 'flight', 'arrival'),
        confirmation: pickConfirmation(b, 'flight', 'arrival') || 'Pending',
        airline: p.arrival_flight_info.airline || '—',
        flight_no: p.arrival_flight_info.flight_no || '',
        kind: 'Arrival',
        depart_at: p.arrival_flight_info.depart_at || p.arrival_flight_info.arrival_time,
      }));
    }
    if (p.departure_flight_info && (p.departure_flight_info.flight_no || p.departure_flight_info.airline)) {
      rows.push(baseRow(b, {
        service_type: 'flight',
        service_key: 'departure',
        status: pickStatus(b, 'flight', 'departure'),
        confirmation: pickConfirmation(b, 'flight', 'departure') || 'Pending',
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
      service_type: kind,
      service_key: kind,
      status: b.supplier_status || 'pending',
      detail,
      pax,
      city: (p.cities || []).map(c => c.name || c).join(', '),
    }));
  });
  return rows;
};

export { formatDate };
