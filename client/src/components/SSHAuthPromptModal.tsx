import React, { useState } from 'react';
import { ClusterResource, SSHConnectionConfig } from '../types/index.js';
import {
  Terminal,
  User,
  Server,
  Lock,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface SSHAuthPromptModalProps {
  resource: ClusterResource;
  detectedIp: string;
  suggestedIp?: string;
  serverHost: string;
  onClose: () => void;
  onConnect: (config: SSHConnectionConfig) => void;
}

export const SSHAuthPromptModal: React.FC<SSHAuthPromptModalProps> = ({
  resource,
  detectedIp,
  suggestedIp,
  serverHost,
  onClose,
  onConnect,
}) => {
  const cacheKey = `pve_ssh_vm_${resource.vmid}`;
  const cached = localStorage.getItem(cacheKey);
  const parsedCache = cached ? JSON.parse(cached) : null;

  // Determine starting host: cached > detected guest agent IP > suggested subnet prefix > empty
  const defaultHost = parsedCache?.host || detectedIp || suggestedIp || '';
  const defaultUser = parsedCache?.username || 'root';
  const defaultPort = parsedCache?.port || 22;
  const defaultMode = parsedCache?.mode || 'direct';

  const [host, setHost] = useState(defaultHost);
  const [port, setPort] = useState(defaultPort);
  const [username, setUsername] = useState(defaultUser);
  const [password, setPassword] = useState(parsedCache?.password || '');
  const [savePassword, setSavePassword] = useState(true);
  const [connectMode, setConnectMode] = useState<'direct' | 'console'>(defaultMode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetHost = connectMode === 'console' ? serverHost : (host.trim() || serverHost);

    if (savePassword) {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          host: targetHost,
          port,
          username: username.trim(),
          password,
          mode: connectMode,
        })
      );
    }

    onConnect({
      host: targetHost,
      port,
      username: username.trim(),
      password,
      vmid: resource.vmid,
      vmName: resource.name,
      node: resource.node,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-theme-surface border-t sm:border-theme border-theme-border rounded-t-2xl sm:rounded-theme shadow-theme-hard p-5 sm:p-6 z-10 space-y-4 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Mobile Grabber Handle */}
        <div className="sheet-handle sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-theme-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-theme bg-theme-accent text-theme-accent-fg flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-theme-text-primary">
                SSH Terminal Login
              </h3>
              <p className="text-xs text-theme-text-muted">
                {resource.name} (ID: {resource.vmid})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-theme-sm text-theme-text-muted hover:text-theme-text-primary"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Connection Mode Selector (Direct VM IP vs Proxmox Node Console) */}
          <div className="grid grid-cols-2 gap-2 bg-theme-bg p-1 rounded-theme-sm border border-theme-border text-xs">
            <button
              type="button"
              onClick={() => setConnectMode('direct')}
              className={`py-1.5 px-2 rounded-theme-sm font-semibold transition-all ${
                connectMode === 'direct'
                  ? 'bg-theme-card text-theme-text-primary shadow-sm border border-theme-border'
                  : 'text-theme-text-muted hover:text-theme-text-primary'
              }`}
            >
              Direct VM IP
            </button>
            <button
              type="button"
              onClick={() => setConnectMode('console')}
              className={`py-1.5 px-2 rounded-theme-sm font-semibold transition-all ${
                connectMode === 'console'
                  ? 'bg-theme-card text-theme-text-primary shadow-sm border border-theme-border'
                  : 'text-theme-text-muted hover:text-theme-text-primary'
              }`}
            >
              Proxmox Host Console
            </button>
          </div>

          {connectMode === 'direct' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-theme-text-primary flex items-center justify-between">
                    <span>IP Address VM</span>
                    {detectedIp ? (
                      <span className="text-[10px] text-theme-running font-semibold flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" /> Auto-detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-theme-warning font-semibold">
                        Ketik IP VM Anda
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-theme-text-muted">
                      <Server className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="e.g. 10.99.99.247"
                      required
                      className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-theme-text-primary">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 22)}
                    placeholder="22"
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
                  />
                </div>
              </div>

              {!detectedIp && (
                <p className="text-[11px] text-theme-text-muted flex items-start space-x-1 bg-theme-card p-2 rounded-theme-sm border border-theme-border/60">
                  <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-theme-accent" />
                  <span>
                    Tips: Jika QEMU Guest Agent tidak aktif di dalam VM, masukkan IP VM sekali saja, dan sistem akan mengingatnya untuk seterusnya!
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-theme-sm bg-theme-card border border-theme-border text-xs text-theme-text-muted space-y-1">
              <p className="font-semibold text-theme-text-primary flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-theme-accent" />
                Mode Konsol Proxmox Host (qm terminal)
              </p>
              <p className="text-[11px]">
                Terhubung langsung melalui server Proxmox ({serverHost}) tanpa perlu mengetahui IP VM. Masukkan password akun Proxmox Anda di bawah.
              </p>
            </div>
          )}

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-theme-text-primary">
              SSH Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-theme-text-muted">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="root"
                required
                className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
              />
            </div>
          </div>

          {/* Password (auto-focused) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-theme-text-primary">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-theme-text-muted">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password SSH / VM..."
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent"
              />
            </div>
          </div>

          {/* Remember Checkbox */}
          <label className="flex items-center space-x-2 text-xs text-theme-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => setSavePassword(e.target.checked)}
              className="rounded border-theme-border text-theme-accent focus:ring-0"
            />
            <span>Simpan kredensial untuk VM ini</span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full theme-btn py-2.5 text-xs font-bold bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover flex items-center justify-center space-x-1.5"
          >
            <span>Buka Terminal SSH</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
