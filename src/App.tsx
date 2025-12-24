import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { LabelsBrowser } from './components/LabelsBrowser';
import { CartridgeDetailPanel } from './components/CartridgeDetailPanel';
import { SyncPage } from './components/SyncPage';
import { HelpPage } from './components/HelpPage';
import { ControlsTestPage } from './components/ControlsTestPage';
import type { SDCard } from './types';
import './App.css';

// SD Card Context to share state across pages
interface SDCardContextType {
  sdCards: SDCard[];
  selectedSDCard: SDCard | null;
  setSelectedSDCard: (card: SDCard | null) => void;
  detectSDCards: (isPolling?: boolean) => Promise<void>;
  loading: boolean;
}

const SDCardContext = createContext<SDCardContextType | null>(null);

export function useSDCard() {
  const context = useContext(SDCardContext);
  if (!context) throw new Error('useSDCard must be used within SDCardProvider');
  return context;
}

function SDCardProvider({ children }: { children: React.ReactNode }) {
  const [sdCards, setSDCards] = useState<SDCard[]>([]);
  const [selectedSDCard, setSelectedSDCard] = useState<SDCard | null>(null);
  const [loading, setLoading] = useState(false);

  const detectSDCards = useCallback(async (isPolling = false) => {
    try {
      // Only show loading indicator for manual refreshes, not polling
      if (!isPolling) {
        setLoading(true);
      }
      const response = await fetch('/api/sync/sd-cards');
      if (!response.ok) throw new Error('Failed to detect SD cards');
      const data: SDCard[] = await response.json();

      setSDCards(prevCards => {
        // Check if the cards have actually changed
        const prevPaths = prevCards.map(c => c.path).sort().join(',');
        const newPaths = data.map(c => c.path).sort().join(',');
        if (prevPaths === newPaths) {
          return prevCards; // No change, don't update state
        }
        return data;
      });

      // Check if selected SD card is still available
      setSelectedSDCard(prev => {
        if (prev) {
          const stillExists = data.some(card => card.path === prev.path);
          if (!stillExists) {
            console.log('SD card disconnected:', prev.path);
            return null;
          }
        }
        // Auto-select first SD card if available and none selected
        if (!prev && data.length > 0) {
          return data[0];
        }
        return prev;
      });
    } catch (err) {
      console.error('Error detecting SD cards:', err);
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, []);

  // Initial detection
  useEffect(() => {
    detectSDCards();
  }, [detectSDCards]);

  // Poll for SD card changes every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(() => {
      detectSDCards(true); // Pass true to indicate this is a polling call
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [detectSDCards]);

  return (
    <SDCardContext.Provider value={{ sdCards, selectedSDCard, setSelectedSDCard, detectSDCards, loading }}>
      {children}
    </SDCardContext.Provider>
  );
}

function Header() {
  const location = useLocation();
  const { selectedSDCard, sdCards, setSelectedSDCard, detectSDCards, loading } = useSDCard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await detectSDCards();
    // Keep the refreshing state for a moment to ensure smooth transition
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
  };

  return (
    <header className="app-header">
      <h1><strong>A3D</strong> Manager</h1>
      <nav className="app-nav">
        <Link
          to="/cartridges"
          className={`nav-tab ${location.pathname === '/cartridges' ? 'active' : ''}`}
        >
          Cartridges
        </Link>
        <Link
          to="/sync"
          className={`nav-tab ${location.pathname === '/sync' ? 'active' : ''}`}
        >
          Sync to SD
        </Link>
        <Link
          to="/help"
          className={`nav-tab ${location.pathname === '/help' ? 'active' : ''}`}
        >
          Help
        </Link>
      </nav>
      <div className="header-actions">
        <div className="sd-card-selector">
          {isRefreshing ? (
            <div className="sd-refreshing-label">Refreshing...</div>
          ) : (
            <select
              value={selectedSDCard?.path || ''}
              onChange={(e) => {
                const card = sdCards.find(c => c.path === e.target.value);
                setSelectedSDCard(card || null);
              }}
              disabled={loading}
              className={isRefreshing ? 'fade-out' : 'fade-in'}
            >
              {sdCards.length === 0 ? (
                <option value="">No SD Card detected</option>
              ) : (
                sdCards.map((card) => (
                  <option key={card.path} value={card.path}>
                    {card.name} ({card.path})
                  </option>
                ))
              )}
            </select>
          )}
          <button
            className="btn-icon"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            title="Refresh SD cards"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 0 1 9-9"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function CartridgesPage() {
  const { selectedSDCard } = useSDCard();
  const [selectedCartridge, setSelectedCartridge] = useState<{ cartId: string; name?: string } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <>
      {notification && <div className="notification">{notification}</div>}
      <LabelsBrowser
        sdCardPath={selectedSDCard?.path}
        onSelectLabel={(cartId, name) => setSelectedCartridge({ cartId, name })}
        refreshKey={refreshKey}
      />
      {selectedCartridge && (
        <CartridgeDetailPanel
          cartId={selectedCartridge.cartId}
          gameName={selectedCartridge.name}
          sdCardPath={selectedSDCard?.path}
          onClose={() => setSelectedCartridge(null)}
          onUpdate={() => {
            showNotification('Updated successfully!');
            setRefreshKey(k => k + 1);
          }}
          onDelete={() => {
            showNotification('Cartridge deleted');
            setRefreshKey(k => k + 1);
            setSelectedCartridge(null);
          }}
        />
      )}
    </>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/cartridges" replace />} />
          <Route path="/cartridges" element={<CartridgesPage />} />
          <Route path="/labels" element={<Navigate to="/cartridges" replace />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/controls-test" element={<ControlsTestPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SDCardProvider>
        <AppContent />
      </SDCardProvider>
    </BrowserRouter>
  );
}

export default App;
