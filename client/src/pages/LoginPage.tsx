import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  Server,
  Lock,
  User,
  Shield,
  Palette,
  ArrowRight,
  Sparkles,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, startDemoMode, error, isLoading, clearError } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();

  const [host, setHost] = useState('https://192.168.1.100:8006');
  const [username, setUsername] = useState('root');
  const [realm, setRealm] = useState('pam');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({
        host: host.trim(),
        username: username.trim(),
        realm,
        password,
        otp: otp.trim() || undefined,
      });
    } catch {
      // Error handled in AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col justify-between p-4 sm:p-6 transition-colors">
      {/* Top Bar with Brand & Theme Switcher */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-theme-sm bg-theme-accent text-theme-accent-fg flex items-center justify-center font-bold">
            <Server className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight">ProxMobile</span>
        </div>

        <button
          onClick={() => setShowThemeModal(true)}
          className="theme-btn px-3 py-1.5 text-xs bg-theme-surface text-theme-text-primary hover:bg-theme-card"
        >
          <Palette className="w-3.5 h-3.5 mr-1.5" />
          <span className="capitalize">{theme.replace('-', ' ')}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme shadow-theme-hard p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-theme-accent/15 text-theme-accent border border-theme-accent/30 mb-1">
              <Smartphone className="w-3.5 h-3.5 mr-1" />
              Mobile Proxmox VE Client
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-theme-text-primary">
              Connect to Proxmox
            </h1>
            <p className="text-xs text-theme-text-muted">
              Authenticate using your Proxmox VE server credentials
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-theme bg-theme-danger-bg border border-theme-danger/30 text-theme-danger text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Check if Proxmox IP is reachable and SSL port is 8006.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Host Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-text-primary flex items-center justify-between">
                <span>Proxmox Server URL</span>
                <span className="text-[11px] text-theme-text-muted font-normal">Port 8006</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-text-muted">
                  <Server className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="https://192.168.1.100:8006"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>
            </div>

            {/* Username & Realm in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-text-primary">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-text-muted">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="root"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
                  />
                </div>
              </div>

              {/* Realm Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-theme-text-primary flex items-center">
                  <Shield className="w-3 h-3 mr-1 text-theme-accent" /> Realm
                </label>
                <select
                  value={realm}
                  onChange={(e) => setRealm(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
                >
                  <option value="pam">Linux PAM (pam)</option>
                  <option value="pve">Proxmox VE (pve)</option>
                  <option value="ldap">LDAP / AD</option>
                  <option value="openid">OpenID Connect</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-text-primary">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-text-muted">
                  <Lock className="w-4 h-4" />
                </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
                  />
              </div>
            </div>

            {/* Optional 2FA OTP */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-theme-text-primary flex items-center justify-between">
                <span>TFA / OTP Token</span>
                <span className="text-[11px] text-theme-text-muted font-normal">Optional</span>
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit authentication code"
                maxLength={6}
                className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono tracking-widest text-center"
              />
            </div>

            {/* Connect Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full theme-btn py-3 text-sm font-bold bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <span>Authenticating with Proxmox...</span>
              ) : (
                <>
                  <span>Sign In to Proxmox</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-theme-surface px-2 text-theme-text-muted">Or Explore</span>
            </div>
          </div>

          {/* Quick Demo Sandbox Button */}
          <button
            type="button"
            onClick={startDemoMode}
            className="w-full theme-btn py-2.5 text-xs font-bold bg-theme-card text-theme-text-primary hover:bg-theme-bg border border-theme-border flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 text-theme-warning" />
            <span>Launch Interactive Demo Cluster</span>
          </button>
        </div>
      </div>

      {/* Footer info */}
      <footer className="max-w-md w-full mx-auto text-center text-xs text-theme-text-muted pt-4 space-y-1">
        <p className="flex items-center justify-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-theme-running" />
          <span>Mobile-first PVE client with in-browser SSH</span>
        </p>
        <p className="text-[11px] opacity-70">
          Compatible with Proxmox VE 7.x, 8.x, and Linux PAM authentication
        </p>
      </footer>

      {/* Theme Selector Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setShowThemeModal(false)} />
          <div className="relative w-full max-w-sm bg-theme-surface border-theme border-theme-border rounded-theme shadow-theme-hard p-5 z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-theme-accent" />
                <h3 className="font-bold text-base text-theme-text-primary">
                  Choose Theme
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

            <div className="space-y-2">
              {availableThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-theme border text-left ${
                    theme === t.id
                      ? 'border-theme-accent bg-theme-card font-bold'
                      : 'border-theme-border bg-theme-bg hover:bg-theme-card'
                  }`}
                >
                  <div>
                    <p className="text-sm text-theme-text-primary">{t.label}</p>
                    <p className="text-xs text-theme-text-muted">{t.description}</p>
                  </div>
                  {theme === t.id && <CheckCircle2 className="w-4 h-4 text-theme-accent" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
