import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import '@/App.css';
import { CurrencyProvider } from '@/CurrencyContext';

// Components
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
import GroupTours from '@/components/GroupTours';
import GroupTourDetail from '@/components/GroupTourDetail';
import Header from '@/components/Header';
import FitPackageForm from '@/components/FitPackageForm';
import TripBuilder from '@/components/TripBuilder';
import AdminDashboard from '@/components/AdminDashboard';
import AdminUserDashboard from '@/components/AdminUserDashboard';
import SupplierDashboard from '@/components/SupplierDashboard';
import AIChatbot from '@/components/AIChatbot';
import PaymentSuccess from '@/components/PaymentSuccess';
import PaymentCancel from '@/components/PaymentCancel';
import ProposalView from '@/components/ProposalView';
import BookingConfirmation from '@/components/BookingConfirmation';
import PaymentPage from '@/components/PaymentPage';
import MyBookings from '@/components/MyBookings';
import BookingDetail from '@/components/BookingDetail';
import TripItineraryView from '@/components/TripItineraryView';
import WalletPage from '@/components/WalletPage';
import StaffDashboard from '@/components/StaffDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Resolve image URLs - handles relative (/api/static/...) and absolute (http://...) paths
export function resolveImageUrl(url) {
  if (!url) return '';
  // Rewrite stale preview-domain URLs that contain /api/static/... to the current backend
  if (typeof url === 'string') {
    const m = url.match(/\/(?:api\/static|uploads)\/[^?#]+/);
    if (m) return `${BACKEND_URL}/api/static/${m[0].replace(/^\/(api\/static|uploads)\//, '')}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
  return url;
}

// Create axios instance
export const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('travo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 response interceptor — when the JWT expires (or is invalid), wipe the
// session and bounce the user back to the login screen instead of letting
// them stare at a cryptic "Token expired" toast while editing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = (error?.response?.data?.detail || '').toString().toLowerCase();
    const isAuthEndpoint = (error?.config?.url || '').includes('/auth/login') ||
      (error?.config?.url || '').includes('/auth/signup');
    if (
      !isAuthEndpoint &&
      (status === 401 || (status === 403 && /token|expired|invalid|authenticated/i.test(detail)))
    ) {
      // Stash a one-time toast so the user understands why they got logged out.
      try {
        sessionStorage.setItem('travo_auth_expired_msg', 'Your session expired — please sign in again.');
      } catch (_) {
        /* ignore */
      }
      // Clear stored auth + UI state and reload to the login screen.
      try {
        localStorage.removeItem('travo_token');
        localStorage.removeItem('travo_user');
      } catch (_) {
        /* ignore */
      }
      // Avoid hard-reloading inside an in-flight render loop — defer.
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/';
        }
      }, 50);
    }
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(() => {
    return sessionStorage.getItem('travo_currentView') || 'dashboard';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('travo_activeTab') || 'Home';
  });
  const [selectedProposalId, setSelectedProposalId] = useState(null);
  const [pendingProposalData, setPendingProposalData] = useState(() => {
    const saved = sessionStorage.getItem('travo_pendingProposal');
    return saved ? JSON.parse(saved) : null;
  });
  const [showChatbot, setShowChatbot] = useState(false);
  const [savedProposal, setSavedProposal] = useState(() => {
    const saved = sessionStorage.getItem('travo_savedProposal');
    return saved ? JSON.parse(saved) : null;
  });
  const [bookingData, setBookingData] = useState(null);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  // For the new Trip Itinerary view (Nexus-style read-only document)
  const [itineraryContext, setItineraryContext] = useState(null);  // {proposalId, bookingRef, customerName}
  // Tracks where the proposal-view was entered from so the Back button can return there.
  // 'edit' → came from TripBuilder edit/save flow; 'list' → came from My Proposals listing.
  const [proposalViewSource, setProposalViewSource] = useState(() => {
    return sessionStorage.getItem('travo_proposalViewSource') || 'list';
  });

  useEffect(() => {
    sessionStorage.setItem('travo_proposalViewSource', proposalViewSource);
  }, [proposalViewSource]);

  // Persist view state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('travo_currentView', currentView);
  }, [currentView]);

  useEffect(() => {
    sessionStorage.setItem('travo_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (pendingProposalData) {
      sessionStorage.setItem('travo_pendingProposal', JSON.stringify(pendingProposalData));
    } else {
      sessionStorage.removeItem('travo_pendingProposal');
    }
  }, [pendingProposalData]);

  useEffect(() => {
    if (savedProposal) {
      sessionStorage.setItem('travo_savedProposal', JSON.stringify(savedProposal));
    } else {
      sessionStorage.removeItem('travo_savedProposal');
    }
  }, [savedProposal]);

  useEffect(() => {
    const savedUser = localStorage.getItem('travo_user');
    const savedToken = localStorage.getItem('travo_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
    // Surface the one-time toast set by the 401 interceptor so users know
    // why they're back on the login screen.
    try {
      const expiredMsg = sessionStorage.getItem('travo_auth_expired_msg');
      if (expiredMsg) {
        sessionStorage.removeItem('travo_auth_expired_msg');
        // Delay so the toast root is mounted.
        setTimeout(() => toast.error(expiredMsg), 200);
      }
    } catch (_) { /* ignore */ }
  }, []);

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem('travo_user', JSON.stringify(userData));
    localStorage.setItem('travo_token', token);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('travo_user');
    localStorage.removeItem('travo_token');
    sessionStorage.removeItem('travo_currentView');
    sessionStorage.removeItem('travo_activeTab');
    sessionStorage.removeItem('travo_pendingProposal');
    sessionStorage.removeItem('travo_savedProposal');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002B5B]">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <CurrencyProvider>
    <BrowserRouter>
      <Routes>
        <Route
          path="/payment/success"
          element={<PaymentSuccess />}
        />
        <Route
          path="/payment/cancel"
          element={<PaymentCancel />}
        />
        <Route
          path="/supplier-dashboard"
          element={
            user ? (
              <SupplierDashboard 
                user={user} 
                onBack={() => window.location.href = '/'} 
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/*"
          element={
            !user ? (
              <AuthPage onLoginSuccess={handleLoginSuccess} />
            ) : (
              <div className="min-h-screen bg-gray-50" data-testid="main-app">
                <Header
                  user={user}
                  onLogout={handleLogout}
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setCurrentView('dashboard');
                  }}
                  currentView={currentView}
                  onGoHome={() => {
                    setCurrentView('dashboard');
                    setActiveTab('Home');
                  }}
                  onNewBooking={() => {
                    setPendingProposalData(null);
                    setCurrentView('form');
                  }}
                  onBack={() => {
                    if (currentView === 'details' || currentView === 'admin' || currentView === 'form') {
                      setCurrentView('dashboard');
                    } else if (currentView === 'customize') {
                      setCurrentView('form');
                    }
                  }}
                  showNewBooking={currentView === 'dashboard'}
                  onNavigate={(view) => setCurrentView(view)}
                  onOpenBookingTask={(bookingId, taskId) => {
                    setSelectedBookingId(bookingId);
                    setOpenTaskId(taskId);
                    setCurrentView('booking-detail');
                  }}
                />

                {currentView === 'dashboard' && (
                  <Dashboard
                    user={user}
                    onLogout={handleLogout}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onNewProposal={(prefill) => {
                      // Defensive: callers like a Quick Link card may pass the
                      // React SyntheticEvent through. Only treat plain prefill
                      // objects (must carry prefillFromLead flag) to avoid
                      // serializing a Window reference into state.
                      const safePrefill = (prefill && typeof prefill === 'object' && prefill.prefillFromLead)
                        ? prefill
                        : null;
                      setPendingProposalData(safePrefill);
                      setCurrentView('form');
                    }}
                    onViewProposal={(proposal) => {
                      // Handle both proposal object and proposal ID
                      if (typeof proposal === 'object') {
                        setSavedProposal(proposal);
                        setProposalViewSource('list');
                        setCurrentView('proposal-view');
                      } else {
                        setSelectedProposalId(proposal);
                        setCurrentView('details');
                      }
                    }}
                    onEditProposal={(proposal) => {
                      // Navigate to Trip Builder with proposal data for editing
                      if (typeof proposal === 'object') {
                        setPendingProposalData({
                          ...proposal,
                          isEditing: true,
                          editProposalId: proposal.id
                        });
                        setCurrentView('customize');
                      }
                    }}
                    onAdminView={() => setCurrentView('admin')}
                    onOpenGroupTours={() => setCurrentView('group-tours')}
                    onViewBooking={(bookingId) => {
                      setSelectedBookingId(bookingId);
                      setCurrentView('booking-detail');
                    }}
                  />
                )}

                {currentView === 'group-tours' && (
                  <GroupTours
                    onBack={() => setCurrentView('dashboard')}
                    onOpenDeal={(deal) => {
                      setSelectedDeal(deal);
                      setCurrentView('group-tour-detail');
                    }}
                  />
                )}

                {currentView === 'group-tour-detail' && (
                  <GroupTourDetail
                    deal={selectedDeal}
                    onBack={() => setCurrentView('group-tours')}
                    onBookFromGroupTour={(proposal) => {
                      setSavedProposal(proposal);
                      setBookingData(null);
                      setCurrentView('booking-confirmation');
                    }}
                    onProposalSaved={(proposal) => {
                      setSavedProposal(proposal);
                      setCurrentView('dashboard');
                      setActiveTab('My Proposals');
                    }}
                  />
                )}

                {currentView === 'form' && (
                  <FitPackageForm
                    onClose={() => setCurrentView('dashboard')}
                    initialData={pendingProposalData}
                    onCreateSuccess={(data) => {
                      setPendingProposalData(data);
                      setCurrentView('customize');
                    }}
                  />
                )}

                {currentView === 'customize' && pendingProposalData && (
                  <TripBuilder
                    data={pendingProposalData}
                    user={user}
                    onBack={() => setCurrentView('form')}
                    onConfirm={async (savedProposalData) => {
                      if (savedProposalData) {
                        // Lead → Proposal conversion: if a lead id was stashed
                        // during MyLeads "Convert" click, call the convert
                        // endpoint to flip its status to `converted` and link
                        // the new proposal id back to the lead.
                        try {
                          const leadId = sessionStorage.getItem('travo_converting_lead_id');
                          if (leadId && savedProposalData?.id) {
                            await api.post(`/leads/${leadId}/convert`, {
                              proposal_id: savedProposalData.id,
                            });
                            sessionStorage.removeItem('travo_converting_lead_id');
                          }
                        } catch (e) {
                          console.error('Lead conversion failed', e);
                        }
                        setSavedProposal(savedProposalData);
                        setProposalViewSource('edit');
                        setCurrentView('proposal-view');
                      } else {
                        setCurrentView('dashboard');
                      }
                      setPendingProposalData(null);
                    }}
                  />
                )}

                {currentView === 'admin' && (
                  <AdminDashboard 
                    onBack={() => setCurrentView('dashboard')} 
                    onUsersView={() => setCurrentView('admin-users')}
                    onViewBooking={(bookingId) => {
                      setSelectedBookingId(bookingId);
                      setCurrentView('booking-detail');
                    }}
                  />
                )}

                {currentView === 'admin-users' && (
                  <AdminUserDashboard onBack={() => setCurrentView('admin')} />
                )}

                {currentView === 'proposal-view' && savedProposal && (
                  <ProposalView 
                    proposal={savedProposal}
                    onBack={() => {
                      if (proposalViewSource === 'edit') {
                        // Came from TripBuilder edit/save flow → return to that edit page
                        setPendingProposalData({
                          ...savedProposal,
                          isEditing: true,
                          editProposalId: savedProposal.id,
                        });
                        setSavedProposal(null);
                        setCurrentView('customize');
                      } else {
                        // Came from My Proposals listing → go back to dashboard list
                        setSavedProposal(null);
                        setCurrentView('dashboard');
                        setActiveTab('My Proposals');
                      }
                    }}
                    onBookNow={() => {
                      setCurrentView('booking-confirmation');
                    }}
                    onEditProposal={(proposal) => {
                      // Navigate to Trip Builder with proposal data for editing
                      setPendingProposalData({
                        ...proposal,
                        isEditing: true,
                        editProposalId: proposal.id
                      });
                      setCurrentView('customize');
                    }}
                    onHoldBooking={() => {
                      setSavedProposal(null);
                      setCurrentView('dashboard');
                      setActiveTab('My Bookings');
                    }}
                    onViewBooking={(bookingId) => {
                      if (!bookingId) return;
                      setSelectedBookingId(bookingId);
                      setSavedProposal(null);
                      setCurrentView('booking-detail');
                    }}
                  />
                )}

                {currentView === 'booking-confirmation' && savedProposal && (
                  <BookingConfirmation
                    proposal={savedProposal}
                    initialBookingData={bookingData}
                    user={user}
                    onBack={() => setCurrentView('proposal-view')}
                    onConfirmBooking={(data) => {
                      setBookingData(data);
                      setCurrentView('payment');
                    }}
                    onHoldBooking={() => {
                      setSavedProposal(null);
                      setBookingData(null);
                      setCurrentView('dashboard');
                      setActiveTab('My Bookings');
                    }}
                  />
                )}

                {currentView === 'payment' && savedProposal && (
                  <PaymentPage
                    proposal={savedProposal}
                    bookingData={bookingData}
                    onBack={() => setCurrentView('booking-confirmation')}
                    onPaymentSuccess={() => {
                      setSavedProposal(null);
                      setBookingData(null);
                      setCurrentView('dashboard');
                      setActiveTab('My Bookings');
                    }}
                  />
                )}

                {currentView === 'booking-detail' && selectedBookingId && (
                  <BookingDetail
                    bookingId={selectedBookingId}
                    initialTaskId={openTaskId}
                    onBack={() => {
                      setSelectedBookingId(null);
                      setOpenTaskId(null);
                      setCurrentView('dashboard');
                      setActiveTab('My Bookings');
                    }}
                    onViewProposal={async (proposalId) => {
                      try {
                        const res = await api.get(`/proposals/${proposalId}`);
                        setSavedProposal(res.data);
                        setCurrentView('proposal-view');
                      } catch (err) {
                        console.error('Failed to load proposal:', err);
                      }
                    }}
                    onViewItinerary={(booking) => {
                      const ref = booking?.booking_ref
                        || (booking?.booking_number != null
                            ? `TBM-${String(booking.booking_number).padStart(6, '0')}`
                            : 'TBM-XXXXXX');
                      setItineraryContext({
                        proposalId: booking?.proposal_id,
                        bookingId: booking?.id,
                        bookingRef: ref,
                        customerName: booking?.customer_name || '',
                      });
                      setCurrentView('trip-itinerary');
                    }}
                    onClickPay={async (booking) => {
                      try {
                        // Load the related proposal so PaymentPage has full context
                        const res = await api.get(`/proposals/${booking.proposal_id}`);
                        setSavedProposal(res.data);
                        setBookingData({
                          travelers: booking.travelers || [],
                          contactInfo: booking.contact_info || {},
                          specialOccasion: booking.special_occasion || 'none',
                          paymentOption: booking.payment_option || 'full',
                          existingBookingId: booking.id,
                        });
                        setCurrentView('payment');
                      } catch (err) {
                        console.error('Failed to start payment flow:', err);
                      }
                    }}
                  />
                )}

                {currentView === 'wallet' && (
                  <WalletPage />
                )}

                {currentView === 'trip-itinerary' && itineraryContext?.proposalId && (
                  <TripItineraryView
                    proposalId={itineraryContext.proposalId}
                    bookingId={itineraryContext.bookingId}
                    bookingRef={itineraryContext.bookingRef}
                    customerName={itineraryContext.customerName}
                    onBack={() => {
                      setItineraryContext(null);
                      setCurrentView('booking-detail');
                    }}
                  />
                )}

                {currentView === 'staff-dashboard' && (
                  <StaffDashboard onBack={() => setCurrentView('dashboard')} />
                )}

                {/* AI Chatbot Button */}
                <button
                  data-testid="ai-chatbot-toggle"
                  onClick={() => setShowChatbot(!showChatbot)}
                  className="fixed bottom-6 right-6 w-14 h-14 bg-[#002B5B] text-white rounded-full shadow-xl hover:bg-[#003d82] transition-all flex items-center justify-center"
                  style={{ zIndex: 9999 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>

                {/* AI Chatbot Modal */}
                {showChatbot && (
                  <AIChatbot onClose={() => setShowChatbot(false)} />
                )}
              </div>
            )
          }
        />
      </Routes>
    </BrowserRouter>
    </CurrencyProvider>
  );
}

export default App;
