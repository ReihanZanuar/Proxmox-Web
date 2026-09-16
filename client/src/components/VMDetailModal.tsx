import React, { useState, useEffect } from 'react';
import { ClusterResource, VMConfig, SSHConnectionConfig } from '../types/index.js';
import { ProxmoxAPI } from '../services/api.js';
import {
  X,
  Play,
  Square,
  RotateCw,
  PowerOff,
  Terminal,
  Cpu,
  HardDrive,
  Network,
  Clock,
  Layers,
  Box,
  Key,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface VMDetailModalProps {
  resource: ClusterResource;
  onClose: () => void;
  onLaunchSSH: (config: SSHConnectionConfig) => void;
  onPowerAction: (
    resource: ClusterResource,
    action: 'start' | 'stop' | 'reboot' | 'shutdown' | 'reset'
  ) => void;
}

export const VMDetailModal: React.FC<VMDetailModalProps> = ({
  resource,
  onClose,
  onLaunchSSH,
  onPowerAction,
}) => {
  const [config, setConfig] = useState<VMConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ssh'>('overview');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // SSH Form State
  const [sshHost, setSshHost] = useState(resource.name || '192.168.1.100');
  const [sshPort, setSshPort] = useState('22');
  const [sshUser, setSshUser] = useState('root');
  const [sshPassword, setSshPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const data = await ProxmoxAPI.getVMConfig(
          resource.node,
          resource.type as 'qemu' | 'lxc',
          resource.vmid!
        );
        if (isMounted) {
          setConfig(data);
          if (data.ip) {
            setSshHost(data.ip);
          }
        }
      } catch (e) {
        console.error('Failed to load VM details', e);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [resource]);

  const isRunning = resource.status === 'running';
  const isLXC = resource.type === 'lxc';

  const handleStartSSH = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunchSSH({
      host: sshHost,
      port: parseInt(sshPort, 10) || 22,
      username: sshUser,
      password: sshPassword || undefined,
      vmid: resource.vmid,
      vmName: resource.name,
    });
    onClose();
  };

  const executeConfirmedPowerAction = (action: any) => {
    onPowerAction(resource, action);
    setConfirmAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal / Bottom Drawer Container */}
      <div className="relative w-full max-w-2xl bg-theme-surface border-t sm:border-theme border-theme-border rounded-t-2xl sm:rounded-theme shadow-theme-hard p-5 sm:p-6 z-10 max-h-[92vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Mobile Grabber Handle */}
        <div className="sheet-handle sm:hidden" />
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-theme-border">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-theme-sm flex items-center justify-center border ${
                isLXC
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  : 'bg-theme-accent/15 text-theme-accent border-theme-accent/30'
              }`}
            >
              {isLXC ? <Box className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-lg text-theme-text-primary">
                  {resource.name || `VM ${resource.vmid}`}
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-theme-sm bg-theme-bg border border-theme-border text-theme-text-muted">
                  ID {resource.vmid}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted">
                {resource.type.toUpperCase()} on node {resource.node}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-theme-sm text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Overview vs SSH */}
        <div className="flex space-x-2 border-b border-theme-border pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`theme-btn px-4 py-1.5 text-xs font-bold ${
              activeTab === 'overview'
                ? 'bg-theme-accent text-theme-accent-fg'
                : 'bg-theme-card text-theme-text-muted hover:text-theme-text-primary'
            }`}
          >
            <Info className="w-3.5 h-3.5 mr-1.5" />
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('ssh')}
            className={`theme-btn px-4 py-1.5 text-xs font-bold ${
              activeTab === 'ssh'
                ? 'bg-theme-accent text-theme-accent-fg'
                : 'bg-theme-card text-theme-text-muted hover:text-theme-text-primary'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 mr-1.5" />
            SSH Quick Connect
          </button>
        </div>

        {/* Tab 1: Overview & Hardware Specs */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Status & Quick Telemetry Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-theme-card p-3 rounded-theme border border-theme-border">
                <span className="text-xs text-theme-text-muted">Status</span>
                <p className="font-bold text-sm text-theme-text-primary capitalize flex items-center mt-1">
                  <span
                    className={`w-2 h-2 rounded-full mr-1.5 ${
                      isRunning ? 'bg-theme-running' : 'bg-theme-stopped'
                    }`}
                  />
                  {resource.status}
                </p>
              </div>

              <div className="bg-theme-card p-3 rounded-theme border border-theme-border">
                <span className="text-xs text-theme-text-muted flex items-center">
                  <Cpu className="w-3.5 h-3.5 mr-1" /> Cores
                </span>
                <p className="font-bold text-sm text-theme-text-primary mt-1">
                  {config?.cores || resource.maxcpu || 1} vCPU
                </p>
              </div>

              <div className="bg-theme-card p-3 rounded-theme border border-theme-border">
                <span className="text-xs text-theme-text-muted flex items-center">
                  <HardDrive className="w-3.5 h-3.5 mr-1" /> RAM
                </span>
                <p className="font-bold text-sm text-theme-text-primary mt-1">
                  {config?.memory
                    ? `${(config.memory / 1024).toFixed(1)} GB`
                    : resource.maxmem
                    ? `${(resource.maxmem / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : '4.0 GB'}
                </p>
              </div>

              <div className="bg-theme-card p-3 rounded-theme border border-theme-border">
                <span className="text-xs text-theme-text-muted flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Uptime
                </span>
                <p className="font-bold text-sm text-theme-text-primary mt-1 font-mono">
                  {resource.uptime && resource.uptime > 0
                    ? `${Math.floor(resource.uptime / 3600)}h ${Math.floor((resource.uptime % 3600) / 60)}m`
                    : '0m'}
                </p>
              </div>
            </div>

            {/* Hardware & Network Specs */}
            <div className="bg-theme-card p-4 rounded-theme border border-theme-border space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-theme-text-muted">
                System Configuration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-theme-border/40">
                  <span className="text-theme-text-muted">Target Node:</span>
                  <span className="font-semibold text-theme-text-primary">{resource.node}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-theme-border/40">
                  <span className="text-theme-text-muted">OS / Type:</span>
                  <span className="font-semibold text-theme-text-primary">
                    {config?.ostype || (isLXC ? 'Container' : 'Linux Kernel')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-theme-border/40">
                  <span className="text-theme-text-muted">IP Address:</span>
                  <span className="font-semibold font-mono text-theme-accent">
                    {config?.ip || '192.168.1.100'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-theme-border/40">
                  <span className="text-theme-text-muted">Virtual Disk:</span>
                  <span className="font-semibold text-theme-text-primary">
                    {config?.maxdisk
                      ? `${(config.maxdisk / (1024 * 1024 * 1024)).toFixed(0)} GB (scsi0)`
                      : '32 GB'}
                  </span>
                </div>
              </div>
            </div>

            {/* Power Operations Bar */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-theme-text-muted">
                Power Management
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {!isRunning ? (
                  <button
                    onClick={() => onPowerAction(resource, 'start')}
                    className="theme-btn bg-theme-running text-white hover:opacity-90 col-span-2 sm:col-span-4"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start Instance
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onPowerAction(resource, 'shutdown')}
                      className="theme-btn bg-theme-surface text-theme-text-primary hover:border-theme-warning"
                    >
                      <Square className="w-3.5 h-3.5 mr-1.5 text-theme-warning" />
                      ACPI Shutdown
                    </button>
                    <button
                      onClick={() => onPowerAction(resource, 'reboot')}
                      className="theme-btn bg-theme-surface text-theme-text-primary hover:border-theme-warning"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 text-theme-warning" />
                      Reboot
                    </button>
                    <button
                      onClick={() => setConfirmAction('stop')}
                      className="theme-btn bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white"
                    >
                      <PowerOff className="w-3.5 h-3.5 mr-1.5" />
                      Force Stop
                    </button>
                    <button
                      onClick={() => setConfirmAction('reset')}
                      className="theme-btn bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                      Hard Reset
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SSH Quick Connect */}
        {activeTab === 'ssh' && (
          <form onSubmit={handleStartSSH} className="space-y-4">
            <div className="bg-theme-accent/10 border border-theme-accent/30 rounded-theme p-3 text-xs text-theme-text-primary">
              <p className="font-semibold flex items-center">
                <Network className="w-4 h-4 mr-1.5 text-theme-accent" />
                Direct In-Browser SSH Shell
              </p>
              <p className="text-theme-text-muted mt-1">
                Connects directly to the VM terminal over WebSocket. Supports password & private key authentication.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-theme-text-primary">
                  Host / IP Address
                </label>
                <input
                  type="text"
                  value={sshHost}
                  onChange={(e) => setSshHost(e.target.value)}
                  placeholder="192.168.1.100 or domain"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  required
                  className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-theme-text-primary">
                  Port
                </label>
                <input
                  type="number"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  placeholder="22"
                  inputMode="numeric"
                  required
                  className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-theme-text-primary">
                  SSH Username
                </label>
                <input
                  type="text"
                  value={sshUser}
                  onChange={(e) => setSshUser(e.target.value)}
                  placeholder="root"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  required
                  className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-theme-text-primary flex items-center">
                  <Key className="w-3.5 h-3.5 mr-1" /> Password (Optional)
                </label>
                <input
                  type="password"
                  value={sshPassword}
                  onChange={(e) => setSshPassword(e.target.value)}
                  placeholder="Leave empty for prompt or key"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isRunning}
              className={`w-full theme-btn py-2.5 text-sm font-bold flex items-center justify-center ${
                isRunning
                  ? 'bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover'
                  : 'bg-theme-surface text-theme-text-muted opacity-50 cursor-not-allowed'
              }`}
            >
              <Terminal className="w-4 h-4 mr-2" />
              {isRunning ? 'Launch In-Browser SSH Terminal' : 'VM must be running to start SSH'}
            </button>
          </form>
        )}

        {/* Confirmation Modal for destructive actions */}
        {confirmAction && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-theme-surface border border-theme-border rounded-theme shadow-theme-hard p-5 max-w-sm w-full space-y-4">
              <div className="flex items-center space-x-3 text-theme-danger">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="font-bold text-base text-theme-text-primary">
                  Confirm {confirmAction.toUpperCase()}
                </h4>
              </div>
              <p className="text-xs text-theme-text-muted">
                Are you sure you want to {confirmAction} instance{' '}
                <span className="font-bold text-theme-text-primary">
                  {resource.name} ({resource.vmid})
                </span>
                ? Unsaved data inside the guest operating system might be lost.
              </p>
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 theme-btn bg-theme-card text-theme-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeConfirmedPowerAction(confirmAction)}
                  className="flex-1 theme-btn bg-theme-danger text-white hover:opacity-90"
                >
                  Confirm {confirmAction}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
