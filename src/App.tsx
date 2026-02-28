import React, { useState, useEffect } from 'react';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import FitPackageForm from './FitPackageForm';
import ProposalDetails from './ProposalDetails';
import CustomizeTrip from './CustomizeTrip';
import AdminDashboard from './AdminDashboard';
import HotelDetailsView from './components/HotelDetailsView';
import Header from './components/Header';
import { AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'form' | 'details' | 'customize' | 'admin' | 'hotel-details';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<any>(null);
  const [pendingProposalData, setPendingProposalData] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    localStorage.setItem('nexus_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('nexus_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002B5B]">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          onViewProposal={(id) => {
            setSelectedProposalId(id);
            setCurrentView('details');
          }}
          onAdminView={() => setCurrentView('admin')}
        />
      )}

      <AnimatePresence>
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
      </AnimatePresence>

      {currentView === 'customize' && pendingProposalData && (
        <CustomizeTrip 
          data={pendingProposalData}
          onBack={() => setCurrentView('form')}
          onConfirm={async () => {
            try {
              const response = await fetch('/api/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  ...pendingProposalData
                })
              });
              if (response.ok) {
                setCurrentView('dashboard');
                setPendingProposalData(null);
              }
            } catch (error) {
              console.error('Error saving proposal:', error);
            }
          }}
        />
      )}

      {currentView === 'details' && selectedProposalId && (
        <ProposalDetails 
          proposalId={selectedProposalId} 
          onBack={() => setCurrentView('dashboard')} 
        />
      )}

      {currentView === 'admin' && (
        <AdminDashboard 
          onBack={() => setCurrentView('dashboard')} 
          onViewHotel={(hotel) => {
            setSelectedHotel(hotel);
            setCurrentView('hotel-details');
          }}
        />
      )}

      {currentView === 'hotel-details' && selectedHotel && (
        <HotelDetailsView 
          hotel={selectedHotel} 
          onBack={() => setCurrentView('admin')} 
        />
      )}
    </div>
  );
}
