import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProxmoxAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { ClusterResource, SSHConnectionConfig } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
import { BottomNav, TabId } from '../components/BottomNav.js';
import { VMCard } from '../components/VMCard.js';
import { VMDetailModal } from '../components/VMDetailModal.js';
import { SSHTerminalModal } from '../components/SSHTerminalModal.js';
import { SSHAuthPromptModal } from '../components/SSHAuthPromptModal.js';
import {
  Search,
  RefreshCw,
  Layers,
  Box,
  CheckCircle2,
  AlertCircle,
  Activity,
  SlidersHorizontal,
  X,
  Terminal,
  Server,
  Cpu,
  HardDrive,
  ShieldCheck,
  LogOut,
  Check,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, logout } = useAuth();
  const { theme, setTheme, availableThemes } = useTheme();

  // Active Bottom Tab Navigation
  const [activeTab, setActiveTab] = useState<TabId>('instances');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'running' | 'stopped' | 'qemu' | 'lxc'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'cpu' | 'mem' | 'status'>('id');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5s default

  // Custom Quick SSH Form State
  const [quickSshHost, setQuickSshHost] = useState('');
  const [quickSshPort, setQuickSshPort] = useState(22);
  const [quickSshUser, setQuickSshUser] = useState('root');
  const [quickSshPass, setQuickSshPass] = useState('');

  // Modals State
  const [selectedResource, setSelectedResource] = useState<ClusterResource | null>(null);
  const [activeSSHConfig, setActiveSSHConfig] = useState<SSHConnectionConfig | null>(null);
  const [sshAuthPrompt, setSshAuthPrompt] = useState<{
    resource: ClusterResource;
    detectedIp: string;
    suggestedIp?: string;
    serverHost: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Query: Cluster Resources (VMs, LXCs, Nodes)
  const {
    data: resources = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['clusterResources'],
    queryFn: () => ProxmoxAPI.getClusterResources(),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  // Query: Node metrics
  const { data: nodes = [] } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => ProxmoxAPI.getNodes(),
    refetchInterval: 10000,
  });

  // Power Action Mutation
  const powerMutation = useMutation({
    mutationFn: async ({
      resource,
      action,
    }: {
      resource: ClusterResource;
      action: 'start' | 'stop' | 'reboot' | 'shutdown' | 'reset';
    }) => {
      return ProxmoxAPI.executePowerAction(
        resource.node,
        resource.type as 'qemu' | 'lxc',
        resource.vmid!,
        action
      );
    },
    onSuccess: (_data, variables) => {
      showToast(`Action '${variables.action}' dispatched for ${variables.resource.name || variables.resource.vmid}`);
      queryClient.invalidateQueries({ queryKey: ['clusterResources'] });
    },
    onError: (err: any, variables) => {
      showToast(
        `Failed to execute ${variables.action}: ${err.message || 'Proxmox API Error'}`,
        'error'
      );
    },
  });

  // Filter VMs and LXCs (exclude node/storage entries)
  const vmsAndContainers = useMemo(() => {
    return resources.filter((r) => r.type === 'qemu' || r.type === 'lxc');
  }, [resources]);

  // Apply User Filters & Sorting with memoization
  const filteredResources = useMemo(() => {
    const list = vmsAndContainers.filter((r) => {
      // Type/Status filter
      if (filterType === 'running' && r.status !== 'running') return false;
      if (filterType === 'stopped' && r.status !== 'stopped') return false;
      if (filterType === 'qemu' && r.type !== 'qemu') return false;
      if (filterType === 'lxc' && r.type !== 'lxc') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchId = r.vmid?.toString().includes(q);
        const matchTags = r.tags?.toLowerCase().includes(q);
        const matchNode = r.node?.toLowerCase().includes(q);
        return matchName || matchId || matchTags || matchNode;
      }

      return true;
    });

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'cpu':
          return (b.cpu || 0) - (a.cpu || 0);
        case 'mem':
          return (b.mem || 0) - (a.mem || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'id':
        default:
          return (a.vmid || 0) - (b.vmid || 0);
      }
    });
  }, [vmsAndContainers, filterType, searchQuery, sortBy]);

  // Cluster aggregate stats
  const { totalVMs, runningVMs, totalQemu, totalLxc } = useMemo(() => {
    return {
      totalVMs: vmsAndContainers.length,
      runningVMs: vmsAndContainers.filter((r) => r.status === 'running').length,
      totalQemu: vmsAndContainers.filter((r) => r.type === 'qemu').length,
      totalLxc: vmsAndContainers.filter((r) => r.type === 'lxc').length,
    };
  }, [vmsAndContainers]);

  const handleOpenSSH = async (resource: ClusterResource) => {
    // 1. Check local cache first for saved credentials
    const cacheKey = resource.vmid ? `pve_ssh_vm_${resource.vmid}` : null;
    const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
    let cachedConfig: any = null;
    if (cached) {
      try {
        cachedConfig = JSON.parse(cached);
        if (cachedConfig.host && cachedConfig.password) {
          // Both host and password are saved, connect directly without prompt!
          setActiveSSHConfig({
            host: cachedConfig.host,
            port: cachedConfig.port || 22,
            username: cachedConfig.username || 'root',
            password: cachedConfig.password,
            vmid: resource.vmid,
            vmName: resource.name,
            node: resource.node,
          });
          setActiveTab('ssh');
          return;
        }
      } catch {
        // Cache read error
      }
    }

    // 2. Extract host from Proxmox server URL
    let serverHost = '';
    if (session?.host) {
      try {
        if (session.host.startsWith('http://') || session.host.startsWith('https://')) {
          const u = new URL(session.host);
          serverHost = u.hostname;
        } else {
          serverHost = session.host.split(':')[0];
        }
      } catch {
        serverHost = session.host;
      }
    }

    // 3. Try to fetch VM IP from Proxmox API
    let detectedIp = '';
    let isFromGuestAgent = false;
    try {
      const cfg = await ProxmoxAPI.getVMConfig(
        resource.node,
        resource.type as 'qemu' | 'lxc',
        resource.vmid!
      );
      if (cfg.ip && cfg.ip !== 'mock' && cfg.ip !== 'demo' && cfg.ip !== serverHost) {
        detectedIp = cfg.ip;
        isFromGuestAgent = true;
      }
    } catch {
      // Ignored if not fetched immediately
    }

    // If cached IP exists and no guest agent, use cache
    if (cachedConfig?.host && !detectedIp) {
      detectedIp = cachedConfig.host;
    }

    // Calculate suggested IP prefix based on serverHost if detectedIp is not found
    let suggestedIp = '';
    if (!detectedIp && serverHost) {
      const parts = serverHost.split('.');
      if (parts.length === 4) {
        suggestedIp = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      }
    }

    // Open clean authentication prompt
    setSshAuthPrompt({
      resource,
      detectedIp: isFromGuestAgent ? detectedIp : (cachedConfig?.host || ''),
      suggestedIp,
      serverHost,
    });
  };

  const handleCustomSSHSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSshHost.trim()) return;

    setActiveSSHConfig({
      host: quickSshHost.trim(),
      port: quickSshPort || 22,
      username: quickSshUser.trim() || 'root',
      password: quickSshPass || undefined,
    });
    setActiveTab('ssh');
  };

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col pb-20">
      <Navbar />

      <main className="max-w-4xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-4">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-16 right-3 left-3 sm:left-auto sm:right-4 z-50 p-3 rounded-theme shadow-theme-hard border flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-theme-running-bg text-theme-running border-theme-running/30'
                : 'bg-theme-danger-bg text-theme-danger border-theme-danger/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 text-current opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: INSTANCES (VM & LXC) */}
        {activeTab === 'instances' && (
          <div className="space-y-4">
            {/* Mobile Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="theme-card bg-theme-surface p-3 rounded-theme border border-theme-border flex items-center space-x-3">
                <div className="w-9 h-9 rounded-theme-sm bg-theme-accent/15 text-theme-accent flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-theme-text-muted font-medium">Instances</span>
                  <p className="font-bold text-lg text-theme-text-primary leading-tight">{totalVMs}</p>
                </div>
              </div>

              <div className="theme-card bg-theme-surface p-3 rounded-theme border border-theme-border flex items-center space-x-3">
                <div className="w-9 h-9 rounded-theme-sm bg-theme-running-bg text-theme-running flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-theme-text-muted font-medium">Running</span>
                  <p className="font-bold text-lg text-theme-running leading-tight">{runningVMs}</p>
                </div>
              </div>

              <div className="theme-card bg-theme-surface p-3 rounded-theme border border-theme-border flex items-center space-x-3">
                <div className="w-9 h-9 rounded-theme-sm bg-theme-accent/15 text-theme-accent flex items-center justify-center font-bold">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-theme-text-muted font-medium">QEMU VM</span>
                  <p className="font-bold text-lg text-theme-text-primary leading-tight">{totalQemu}</p>
                </div>
              </div>

              <div className="theme-card bg-theme-surface p-3 rounded-theme border border-theme-border flex items-center space-x-3">
                <div className="w-9 h-9 rounded-theme-sm bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-theme-text-muted font-medium">LXC</span>
                  <p className="font-bold text-lg text-theme-text-primary leading-tight">{totalLxc}</p>
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2.5">
              {/* Search Bar */}
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-theme-text-muted">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search VM / Container by name, ID..."
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  inputMode="search"
                  className="w-full pl-10 pr-9 py-2.5 text-sm rounded-theme border border-theme-border bg-theme-surface text-theme-text-primary focus:outline-none focus:border-theme-accent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-theme-text-muted hover:text-theme-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
                <div className="flex items-center space-x-1.5 shrink-0">
                  {[
                    { id: 'all', label: `All (${totalVMs})` },
                    { id: 'running', label: `Running (${runningVMs})` },
                    { id: 'stopped', label: `Stopped (${totalVMs - runningVMs})` },
                    { id: 'qemu', label: `QEMU (${totalQemu})`, icon: Layers },
                    { id: 'lxc', label: `LXC (${totalLxc})`, icon: Box },
                  ].map((tab) => {
                    const isActive = filterType === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setFilterType(tab.id as any)}
                        className={`theme-btn py-2 px-3 text-xs whitespace-nowrap flex items-center ${
                          isActive
                            ? 'bg-theme-accent text-theme-accent-fg font-bold'
                            : 'bg-theme-surface text-theme-text-muted hover:text-theme-text-primary'
                        }`}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sort & Refresh Controls */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-theme-surface px-2.5 py-2 rounded-theme-sm border border-theme-border text-xs text-theme-text-primary focus:outline-none cursor-pointer"
                    title="Sort instances"
                  >
                    <option value="id" className="bg-theme-surface">Sort: ID</option>
                    <option value="name" className="bg-theme-surface">Sort: Name</option>
                    <option value="cpu" className="bg-theme-surface">Sort: CPU</option>
                    <option value="mem" className="bg-theme-surface">Sort: RAM</option>
                    <option value="status" className="bg-theme-surface">Sort: Status</option>
                  </select>

                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="bg-theme-surface px-2 py-2 rounded-theme-sm border border-theme-border text-xs text-theme-text-primary focus:outline-none cursor-pointer hidden sm:inline-block"
                    title="Auto Refresh Rate"
                  >
                    <option value={5000} className="bg-theme-surface">5s</option>
                    <option value={10000} className="bg-theme-surface">10s</option>
                    <option value={0} className="bg-theme-surface">Off</option>
                  </select>

                  {/* Refresh Trigger */}
                  <button
                    onClick={() => refetch()}
                    disabled={isRefetching}
                    className="theme-btn py-2 px-2.5 text-xs bg-theme-surface text-theme-text-primary hover:bg-theme-card"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* VM List Cards */}
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-theme-surface border border-theme-border rounded-theme p-4 space-y-3 animate-pulse"
                  >
                    <div className="flex justify-between items-center">
                      <div className="w-32 h-5 bg-theme-border/60 rounded" />
                      <div className="w-16 h-5 bg-theme-border/60 rounded-full" />
                    </div>
                    <div className="w-full h-3 bg-theme-border/40 rounded" />
                    <div className="w-full h-10 bg-theme-border/50 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center bg-theme-surface border border-theme-danger/30 rounded-theme space-y-3">
                <AlertCircle className="w-8 h-8 text-theme-danger mx-auto" />
                <h3 className="font-bold text-base text-theme-text-primary">
                  Failed to load cluster instances
                </h3>
                <p className="text-xs text-theme-text-muted">
                  {(error as any)?.message || 'Check your network connection to the Proxmox host.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="theme-btn px-4 py-2 text-xs bg-theme-accent text-theme-accent-fg"
                >
                  Retry Connection
                </button>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="p-8 text-center bg-theme-surface border border-theme-border rounded-theme space-y-3">
                <Layers className="w-10 h-10 text-theme-text-muted mx-auto opacity-40" />
                <h3 className="font-bold text-base text-theme-text-primary">
                  No matching instances found
                </h3>
                <p className="text-xs text-theme-text-muted">
                  Try adjusting your search or filter options.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredResources.map((resource) => (
                  <VMCard
                    key={resource.id}
                    resource={resource}
                    onSelect={(res) => setSelectedResource(res)}
                    onOpenSSH={(res) => handleOpenSSH(res)}
                    onPowerAction={(res, action) =>
                      powerMutation.mutate({ resource: res, action })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEDICATED SSH TERMINAL TAB */}
        {activeTab === 'ssh' && (
          <div className="space-y-4">
            {activeSSHConfig ? (
              <SSHTerminalModal
                config={activeSSHConfig}
                onClose={() => setActiveSSHConfig(null)}
              />
            ) : (
              <>
                {/* Quick Connect Card */}
                <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme p-4 sm:p-5 space-y-4">
                  <div className="flex items-center space-x-2.5 pb-3 border-b border-theme-border">
                    <div className="w-9 h-9 rounded-theme bg-theme-accent text-theme-accent-fg flex items-center justify-center font-bold">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base text-theme-text-primary">Quick SSH Terminal</h2>
                      <p className="text-xs text-theme-text-muted">Connect directly to any VM, LXC, or Host</p>
                    </div>
                  </div>

                  <form onSubmit={handleCustomSSHSubmit} className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-theme-text-primary">Target IP / Host</label>
                        <input
                          type="text"
                          value={quickSshHost}
                          onChange={(e) => setQuickSshHost(e.target.value)}
                          placeholder="e.g. 192.168.1.50"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          autoComplete="off"
                          required
                          className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-theme-text-primary">Port</label>
                        <input
                          type="number"
                          value={quickSshPort}
                          onChange={(e) => setQuickSshPort(parseInt(e.target.value, 10) || 22)}
                          inputMode="numeric"
                          className="w-full px-3 py-2 text-sm rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-theme-text-primary">SSH User</label>
                        <input
                          type="text"
                          value={quickSshUser}
                          onChange={(e) => setQuickSshUser(e.target.value)}
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
                        <label className="text-xs font-semibold text-theme-text-primary">Password (Optional)</label>
                        <input
                          type="password"
                          value={quickSshPass}
                          onChange={(e) => setQuickSshPass(e.target.value)}
                          placeholder="••••••••"
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
                      className="w-full theme-btn py-3 text-sm font-bold bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover flex items-center justify-center space-x-2"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>Launch In-Browser SSH</span>
                    </button>
                  </form>
                </div>

                {/* Quick 1-Tap Connect to Running VMs */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-theme-text-muted px-1">
                    Running Instances Ready for SSH ({runningVMs})
                  </h3>
                  <div className="space-y-2">
                    {vmsAndContainers
                      .filter((r) => r.status === 'running')
                      .map((r) => (
                        <div
                          key={r.id}
                          className="bg-theme-surface border border-theme-border rounded-theme p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-theme-sm bg-theme-accent/15 text-theme-accent flex items-center justify-center font-bold">
                              {r.type === 'lxc' ? <Box className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-theme-text-primary">{r.name}</p>
                              <p className="text-xs text-theme-text-muted font-mono">
                                ID {r.vmid} • Node: {r.node}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenSSH(r)}
                            className="theme-btn py-1.5 px-3 text-xs font-bold bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover flex items-center space-x-1"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>SSH</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: NODES & CLUSTER HEALTH */}
        {activeTab === 'cluster' && (
          <div className="space-y-4">
            <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme p-4 sm:p-5 space-y-3">
              <div className="flex items-center space-x-2.5 pb-2 border-b border-theme-border">
                <Activity className="w-5 h-5 text-theme-accent" />
                <h2 className="font-bold text-base text-theme-text-primary">Cluster Hypervisor Nodes</h2>
              </div>

              {nodes.map((node) => (
                <div
                  key={node.node}
                  className="bg-theme-bg p-4 rounded-theme border border-theme-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <Server className="w-5 h-5 text-theme-accent" />
                      <div>
                        <span className="font-bold text-base text-theme-text-primary">{node.node}</span>
                        <p className="text-xs text-theme-text-muted font-mono">
                          {node.pveversion || 'Proxmox VE 8.x'}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-theme-running-bg text-theme-running border border-theme-running/30">
                      Online
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-theme-text-muted flex items-center">
                        <Cpu className="w-3.5 h-3.5 mr-1" /> CPU Cores
                      </span>
                      <p className="font-bold text-theme-text-primary">{node.maxcpu || 'N/A'} vCPUs</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-theme-text-muted flex items-center">
                        <HardDrive className="w-3.5 h-3.5 mr-1" /> Memory
                      </span>
                      <p className="font-bold text-theme-text-primary">
                        {node.maxmem ? `${(node.maxmem / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & THEMES */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Visual Theme Selector */}
            <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme p-4 sm:p-5 space-y-3">
              <h2 className="font-bold text-base text-theme-text-primary flex items-center">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-theme-accent" />
                Visual UI Themes
              </h2>
              <p className="text-xs text-theme-text-muted">
                Choose the design theme optimized for high readability on OLED mobile screens
              </p>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                {availableThemes.map((t) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center justify-between p-3.5 rounded-theme border text-left transition-all ${
                        isActive
                          ? 'border-theme-accent bg-theme-card font-bold ring-2 ring-theme-accent/30'
                          : 'border-theme-border bg-theme-bg hover:bg-theme-card'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-theme-text-primary">{t.label}</span>
                          {isActive && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-accent text-theme-accent-fg">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-theme-text-muted">{t.description}</p>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-theme-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authenticated Session Card */}
            <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme p-4 sm:p-5 space-y-3">
              <h2 className="font-bold text-base text-theme-text-primary flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-theme-accent" />
                Active Session
              </h2>

              <div className="bg-theme-bg p-3 rounded-theme border border-theme-border text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-theme-text-muted">Username:</span>
                  <span className="font-bold text-theme-text-primary">{session?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-muted">Realm:</span>
                  <span className="text-theme-text-primary uppercase">{session?.realm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-text-muted">Proxmox Host:</span>
                  <span className="text-theme-accent truncate max-w-[200px]">{session?.host}</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full theme-btn py-3 text-xs font-bold bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect & Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
        runningCount={runningVMs}
        hasActiveSSH={!!activeSSHConfig}
      />

      {/* VM Detail Modal / Bottom Drawer */}
      {selectedResource && (
        <VMDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onLaunchSSH={(config) => {
            setActiveSSHConfig(config);
            setSelectedResource(null);
            setActiveTab('ssh');
          }}
          onPowerAction={(res, action) =>
            powerMutation.mutate({ resource: res, action })
          }
        />
      )}

      {/* SSH Auth & Credential Prompt Modal */}
      {sshAuthPrompt && (
        <SSHAuthPromptModal
          resource={sshAuthPrompt.resource}
          detectedIp={sshAuthPrompt.detectedIp}
          suggestedIp={sshAuthPrompt.suggestedIp}
          serverHost={sshAuthPrompt.serverHost}
          onClose={() => setSshAuthPrompt(null)}
          onConnect={(config) => {
            setSshAuthPrompt(null);
            setActiveSSHConfig(config);
            setActiveTab('ssh');
          }}
        />
      )}
    </div>
  );
};
