import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  Server,
  Palette,
  LogOut,
  ShieldCheck,
  Check,
  Smartphone,
  ChevronDown,
  X,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { session, logout } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-theme-surface/95 backdrop-blur-sm border-b border-theme-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-theme bg-theme-accent text-theme-accent-fg flex items-center justify-center font-bold text-lg shadow-theme-sm border border-theme-border">
            <Server className="w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-theme-text-primary">
                ProxMobile
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-theme bg-theme-running-bg text-theme-running border border-theme-running/20 flex items-center">
                <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" /> PVE 8
              </span>
            </div>
            <p className="text-xs font-mono text-theme-text-muted hidden sm:block">
              {session?.isMock ? 'Demo Cluster (Offline)' : session?.host}
            </p>
          </div>
        </div>

        {/* Right Action Icons: Theme Selector & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Theme Switcher Button */}
          <button
            onClick={() => setShowThemeModal(!showThemeModal)}
            className="theme-btn bg-theme-card text-theme-text-primary hover:bg-theme-bg"
            title="Switch Theme"
            aria-label="Theme selector"
          >
            <Palette className="w-4 h-4 sm:mr-2" strokeWidth={2} />
            <span className="hidden sm:inline capitalize text-xs">
              {theme.replace('-', ' ')}
            </span>
          </button>

          {/* User Account / Session Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="theme-btn bg-theme-card text-theme-text-primary hover:bg-theme-bg flex items-center space-x-2"
              aria-label="User profile"
            >
              <div className="w-6 h-6 rounded-full bg-theme-accent/20 text-theme-accent flex items-center justify-center font-bold text-xs">
                {session?.username ? session.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold max-w-[100px] truncate hidden md:inline">
                {session?.username || 'Admin'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-theme-text-muted" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-theme-surface border border-theme-border rounded-theme shadow-theme-md p-3 z-30 space-y-3">
                  <div className="pb-2 border-b border-theme-border">
                    <p className="text-xs text-theme-text-muted">Authenticated User</p>
                    <p className="text-sm font-bold text-theme-text-primary truncate">
                      {session?.username}
                    </p>
                    <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-theme-text-muted">
                      <ShieldCheck className="w-3.5 h-3.5 text-theme-accent" />
                      <span>Realm: {session?.realm?.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-theme-text-muted space-y-1 font-mono">
                    <p className="truncate">Host: {session?.host}</p>
                    <p>Status: {session?.isMock ? 'Offline Sandbox' : 'Connected'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full theme-btn bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white justify-center text-xs"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect & Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={() => setShowThemeModal(false)}
          />
          <div className="relative w-full max-w-md bg-theme-surface border-theme border-theme-border rounded-theme shadow-theme-hard p-5 z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-theme-accent" />
                <h3 className="font-bold text-base text-theme-text-primary">
                  Select Visual Theme
                </h3>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1 rounded-theme-sm text-theme-text-muted hover:text-theme-text-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {availableThemes.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemeModal(false);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-theme border text-left transition-all ${
                      isActive
                        ? 'border-theme-accent bg-theme-card font-semibold ring-2 ring-theme-accent/30'
                        : 'border-theme-border bg-theme-bg hover:bg-theme-card'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-theme-text-primary">
                          {t.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-accent text-theme-accent-fg">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-theme-text-muted">
                        {t.description}
                      </p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-theme-accent" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-theme-text-muted flex items-center justify-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Optimized for mobile touchscreens & desktop browsers</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
