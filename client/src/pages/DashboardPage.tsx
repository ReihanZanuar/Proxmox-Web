import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProxmoxAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ClusterResource, SSHConnectionConfig } from '../types/index.js';
import { Navbar } from '../components/Navbar.js';
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
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'running' | 'stopped' | 'qemu' | 'lxc'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'cpu' | 'mem' | 'status'>('id');
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5s default

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
  const vmsAndContainers = resources.filter(
    (r) => r.type === 'qemu' || r.type === 'lxc'
  );

  // Apply User Filters
  const filteredResources = vmsAndContainers.filter((r) => {
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

  // Apply Sorting
  filteredResources.sort((a, b) => {
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

  // Cluster aggregate stats
  const totalVMs = vmsAndContainers.length;
  const runningVMs = vmsAndContainers.filter((r) => r.status === 'running').length;
  const totalQemu = vmsAndContainers.filter((r) => r.type === 'qemu').length;
  const totalLxc = vmsAndContainers.filter((r) => r.type === 'lxc').length;

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

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary flex flex-col transition-colors pb-12">
      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-5">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-20 right-4 z-50 p-3 rounded-theme shadow-theme-md border flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-theme-running-bg text-theme-running border-theme-running/30'
                : 'bg-theme-danger-bg text-theme-danger border-theme-danger/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 text-current opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cluster Summary Metrics Banner */}
        <section className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme shadow-theme-sm p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-theme-accent" />
                <h1 className="font-bold text-lg text-theme-text-primary">
                  Proxmox Cluster Overview
                </h1>
              </div>
              <p className="text-xs text-theme-text-muted mt-0.5 flex items-center space-x-2">
                <span>{nodes.length > 0 ? `${nodes.length} Active Node(s)` : 'Hypervisor Cluster'}</span>
                <span className="opacity-40">/</span>
                <span>{nodes[0]?.pveversion || 'PVE 8.3'}</span>
              </p>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-theme-card px-3 py-2 rounded-theme-sm border border-theme-border">
                <span className="text-[11px] text-theme-text-muted">Total Instances</span>
                <p className="font-bold text-base text-theme-text-primary">{totalVMs}</p>
              </div>
              <div className="bg-theme-card px-3 py-2 rounded-theme-sm border border-theme-border">
                <span className="text-[11px] text-theme-text-muted">Running</span>
                <p className="font-bold text-base text-theme-running">{runningVMs}</p>
              </div>
              <div className="bg-theme-card px-3 py-2 rounded-theme-sm border border-theme-border">
                <span className="text-[11px] text-theme-text-muted">QEMU Virtual</span>
                <p className="font-bold text-base text-theme-text-primary">{totalQemu}</p>
              </div>
              <div className="bg-theme-card px-3 py-2 rounded-theme-sm border border-theme-border">
                <span className="text-[11px] text-theme-text-muted">LXC Containers</span>
                <p className="font-bold text-base text-theme-text-primary">{totalLxc}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Search, Filter & Controls Toolbar */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-text-muted">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search VM by name, ID, or tag..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-theme-sm border border-theme-border bg-theme-surface text-theme-text-primary focus:outline-none focus:border-theme-accent"
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

            {/* Sort & Auto-Refresh Options */}
            <div className="flex items-center space-x-2">
              {/* Sort Selector */}
              <div className="flex items-center space-x-1.5 bg-theme-surface px-2.5 py-1.5 rounded-theme-sm border border-theme-border text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-theme-text-muted" />
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-theme-text-primary focus:outline-none cursor-pointer"
                >
                  <option value="id" className="bg-theme-surface">Sort by ID</option>
                  <option value="name" className="bg-theme-surface">Sort by Name</option>
                  <option value="cpu" className="bg-theme-surface">Sort by CPU Usage</option>
                  <option value="mem" className="bg-theme-surface">Sort by Memory</option>
                  <option value="status" className="bg-theme-surface">Sort by Status</option>
                </select>
              </div>

              {/* Refresh Interval Selector */}
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-theme-surface px-2.5 py-1.5 rounded-theme-sm border border-theme-border text-xs text-theme-text-primary focus:outline-none cursor-pointer"
                title="Auto Refresh Interval"
              >
                <option value={5000} className="bg-theme-surface">5s Refresh</option>
                <option value={10000} className="bg-theme-surface">10s Refresh</option>
                <option value={30000} className="bg-theme-surface">30s Refresh</option>
                <option value={0} className="bg-theme-surface">Manual Refresh</option>
              </select>

              {/* Manual Refresh Button */}
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="theme-btn px-2.5 py-1.5 text-xs bg-theme-surface text-theme-text-primary hover:bg-theme-card"
                title="Refresh now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: `All (${totalVMs})` },
              { id: 'running', label: `Running (${runningVMs})` },
              { id: 'stopped', label: `Stopped (${totalVMs - runningVMs})` },
              { id: 'qemu', label: `QEMU VMs (${totalQemu})`, icon: Layers },
              { id: 'lxc', label: `Containers (${totalLxc})`, icon: Box },
            ].map((tab) => {
              const isActive = filterType === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id as any)}
                  className={`theme-btn px-3 py-1 text-xs whitespace-nowrap flex items-center ${
                    isActive
                      ? 'bg-theme-accent text-theme-accent-fg font-bold'
                      : 'bg-theme-surface text-theme-text-muted hover:text-theme-text-primary'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main VM List / Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-theme-surface border border-theme-border rounded-theme p-5 space-y-4 animate-pulse"
              >
                <div className="flex justify-between items-center">
                  <div className="w-32 h-4 bg-theme-border/60 rounded" />
                  <div className="w-16 h-4 bg-theme-border/60 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-2 bg-theme-border/40 rounded" />
                  <div className="w-full h-2 bg-theme-border/40 rounded" />
                </div>
                <div className="w-full h-8 bg-theme-border/50 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-theme-surface border border-theme-danger/30 rounded-theme space-y-3">
            <AlertCircle className="w-8 h-8 text-theme-danger mx-auto" />
            <h3 className="font-bold text-base text-theme-text-primary">
              Failed to load cluster instances
            </h3>
            <p className="text-xs text-theme-text-muted max-w-md mx-auto">
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
          <div className="p-12 text-center bg-theme-surface border border-theme-border rounded-theme space-y-3">
            <Layers className="w-10 h-10 text-theme-text-muted mx-auto opacity-50" />
            <h3 className="font-bold text-base text-theme-text-primary">
              No matching instances found
            </h3>
            <p className="text-xs text-theme-text-muted">
              Try adjusting your search query or filter selection.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="theme-btn px-3 py-1.5 text-xs bg-theme-card text-theme-text-primary"
              >
                Clear Search Query
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </main>

      {/* VM Detail Modal / Bottom Drawer */}
      {selectedResource && (
        <VMDetailModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onLaunchSSH={(config) => {
            setActiveSSHConfig(config);
            setSelectedResource(null);
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
          }}
        />
      )}

      {/* SSH Terminal Modal */}
      {activeSSHConfig && (
        <SSHTerminalModal
          config={activeSSHConfig}
          onClose={() => setActiveSSHConfig(null)}
        />
      )}
    </div>
  );
};
