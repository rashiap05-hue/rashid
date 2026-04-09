import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';

// Components
import AuthPage from '@/components/AuthPage';
import Dashboard from '@/components/Dashboard';
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
import WalletPage from '@/components/WalletPage';
import StaffDashboard from '@/components/StaffDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Resolve image URLs - handles relative (/api/static/...) and absolute (http://...) paths
export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/static/')) return `${BACKEND_URL}${url}`;
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
                />

                {currentView === 'dashboard' && (
                  <Dashboard
                    user={user}
                    onLogout={handleLogout}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onNewProposal={() => {
                      setPendingProposalData(null);
                      setCurrentView('form');
                    }}
                    onViewProposal={(proposal) => {
                      // Handle both proposal object and proposal ID
                      if (typeof proposal === 'object') {
                        setSavedProposal(proposal);
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
                    onViewBooking={(bookingId) => {
                      setSelectedBookingId(bookingId);
                      setCurrentView('booking-detail');
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
                        setSavedProposal(savedProposalData);
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
                  />
                )}

                {currentView === 'admin-users' && (
                  <AdminUserDashboard onBack={() => setCurrentView('admin')} />
                )}

                {currentView === 'proposal-view' && savedProposal && (
                  <ProposalView 
                    proposal={savedProposal}
                    onBack={() => {
                      setSavedProposal(null);
                      setCurrentView('dashboard');
                      setActiveTab('My Proposals');
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
                  />
                )}

                {currentView === 'booking-confirmation' && savedProposal && (
                  <BookingConfirmation
                    proposal={savedProposal}
                    onBack={() => setCurrentView('proposal-view')}
                    onConfirmBooking={(data) => {
                      setBookingData(data);
                      setCurrentView('payment');
                    }}
                  />
                )}

                {currentView === 'payment' && savedProposal && (
                  <PaymentPage
                    proposal={savedProposal}
                    bookingData={bookingData}
                    onBack={() => setCurrentView('booking-confirmation')}
                  />
                )}

                {currentView === 'booking-detail' && selectedBookingId && (
                  <BookingDetail
                    bookingId={selectedBookingId}
                    onBack={() => {
                      setSelectedBookingId(null);
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
                  />
                )}

                {currentView === 'wallet' && (
                  <WalletPage />
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
  );
}

export default App;
