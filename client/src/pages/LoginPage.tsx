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
  Globe,
  Wifi,
  Check,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, startDemoMode, error, isLoading, clearError } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();

  const savedHost = localStorage.getItem('pve_last_host') || 'https://10.99.99.254:8006';
  const [host, setHost] = useState(savedHost);
  const [username, setUsername] = useState('root');
  const [realm, setRealm] = useState('pam');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isCustomHost, setIsCustomHost] = useState(
    savedHost !== 'https://10.99.99.254:8006' && savedHost !== 'https://tkjskanesa.my.id:8081'
  );

  const selectPresetHost = (url: string) => {
    setHost(url);
    setIsCustomHost(false);
    localStorage.setItem('pve_last_host', url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    localStorage.setItem('pve_last_host', host.trim());
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
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col justify-between p-4 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
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
            <div className="p-3.5 rounded-theme bg-theme-danger-bg border border-theme-danger/30 text-theme-danger text-xs space-y-2 animate-in fade-in duration-150">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">{error}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {error.includes('ECONNREFUSED')
                      ? 'Koneksi ke IP publik ditolak oleh router (masalah NAT loopback). Silakan pilih "Server Lokal (10.99.99.254:8006)" di bawah!'
                      : 'Pastikan alamat IP/Domain Proxmox dapat dijangkau dan port 8006 terbuka.'}
                  </p>
                </div>
              </div>

              {error.includes('ECONNREFUSED') && (
                <button
                  type="button"
                  onClick={() => selectPresetHost('https://10.99.99.254:8006')}
                  className="w-full py-1.5 px-2.5 rounded bg-theme-danger text-white font-bold text-xs flex items-center justify-center space-x-1 hover:opacity-90"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Alihkan ke Server Lokal (10.99.99.254:8006)</span>
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Server Target Preset Selector (Local vs Public Domain) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-theme-text-primary flex items-center justify-between">
                <span>Pilih Alamat Server Proxmox</span>
                <span className="text-[11px] text-theme-text-muted font-normal">1-Klik Pilih</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Option 1: Local Network */}
                <button
                  type="button"
                  onClick={() => selectPresetHost('https://10.99.99.254:8006')}
                  className={`p-2.5 rounded-theme border text-left transition-all flex flex-col justify-between ${
                    host === 'https://10.99.99.254:8006' && !isCustomHost
                      ? 'border-theme-accent bg-theme-card ring-2 ring-theme-accent/30 shadow-theme-sm'
                      : 'border-theme-border bg-theme-bg hover:bg-theme-card opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-theme-text-primary flex items-center">
                      <Wifi className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Server Lokal
                    </span>
                    {host === 'https://10.99.99.254:8006' && !isCustomHost && (
                      <Check className="w-3.5 h-3.5 text-theme-accent" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-theme-text-muted mt-1 truncate">
                    10.99.99.254:8006
                  </span>
                </button>

                {/* Option 2: Public Gateway */}
                <button
                  type="button"
                  onClick={() => selectPresetHost('https://tkjskanesa.my.id:8081')}
                  className={`p-2.5 rounded-theme border text-left transition-all flex flex-col justify-between ${
                    host === 'https://tkjskanesa.my.id:8081' && !isCustomHost
                      ? 'border-theme-accent bg-theme-card ring-2 ring-theme-accent/30 shadow-theme-sm'
                      : 'border-theme-border bg-theme-bg hover:bg-theme-card opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-theme-text-primary flex items-center">
                      <Globe className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Domain Publik
                    </span>
                    {host === 'https://tkjskanesa.my.id:8081' && !isCustomHost && (
                      <Check className="w-3.5 h-3.5 text-theme-accent" />
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-theme-text-muted mt-1 truncate">
                    tkjskanesa.my.id:8081
                  </span>
                </button>
              </div>

              {/* Host Address Input */}
              <div className="pt-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-text-muted">
                    <Server className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => {
                      setHost(e.target.value);
                      setIsCustomHost(true);
                    }}
                    placeholder="https://10.99.99.254:8006"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="url"
                    inputMode="url"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-theme border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                  />
                </div>
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="current-password"
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
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
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
