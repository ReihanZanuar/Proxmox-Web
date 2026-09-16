import React from 'react';
import { useAuth } from './context/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { Server } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-theme bg-theme-accent/20 text-theme-accent flex items-center justify-center mx-auto animate-bounce">
            <Server className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-theme-text-muted">
            Initializing ProxMobile...
          </p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : <LoginPage />;
};

export default App;
