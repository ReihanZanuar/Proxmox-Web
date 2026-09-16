import React, { useState } from 'react';
import { ClusterResource } from '../types/index.js';
import {
  Play,
  Square,
  RotateCw,
  Terminal,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  Box,
  MoreVertical,
  Activity,
} from 'lucide-react';

interface VMCardProps {
  resource: ClusterResource;
  onSelect: (resource: ClusterResource) => void;
  onOpenSSH: (resource: ClusterResource) => void;
  onPowerAction: (
    resource: ClusterResource,
    action: 'start' | 'stop' | 'reboot' | 'shutdown' | 'reset'
  ) => void;
}

export const VMCard: React.FC<VMCardProps> = ({
  resource,
  onSelect,
  onOpenSSH,
  onPowerAction,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isRunning = resource.status === 'running';

  // Format memory
  const formatMem = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  };

  const memPercent =
    resource.mem && resource.maxmem
      ? Math.min(100, Math.round((resource.mem / resource.maxmem) * 100))
      : 0;

  const cpuPercent =
    resource.cpu !== undefined ? Math.min(100, Math.round(resource.cpu * 100)) : 0;

  const formatUptime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return 'Stopped';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isLXC = resource.type === 'lxc';

  return (
    <div className="theme-card bg-theme-surface border-theme border-theme-border rounded-theme p-4 sm:p-5 transition-all shadow-theme-sm hover:border-theme-accent/60 flex flex-col justify-between space-y-4">
      {/* Header: Title, ID, Type, Status */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start space-x-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-theme flex items-center justify-center border shrink-0 ${
                isLXC
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  : 'bg-theme-accent/15 text-theme-accent border-theme-accent/30'
              }`}
            >
              {isLXC ? (
                <Box className="w-6 h-6" strokeWidth={1.75} />
              ) : (
                <Layers className="w-6 h-6" strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-theme-text-primary tracking-tight truncate">
                  {resource.name || `VM ${resource.vmid}`}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-theme-sm bg-theme-bg border border-theme-border text-theme-text-muted shrink-0">
                  {resource.vmid}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted flex items-center space-x-1.5 mt-0.5 font-mono">
                <span className="capitalize font-semibold">{resource.type.toUpperCase()}</span>
                <span className="opacity-40">/</span>
                <span>Node: {resource.node}</span>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                isRunning
                  ? 'bg-theme-running-bg text-theme-running border-theme-running/30'
                  : 'bg-theme-stopped-bg text-theme-stopped border-theme-stopped/30'
              }`}
            >
              <Activity
                className={`w-3.5 h-3.5 mr-1 ${
                  isRunning ? 'text-theme-running animate-pulse' : 'text-theme-stopped opacity-50'
                }`}
                strokeWidth={2.5}
              />
              {isRunning ? 'Running' : 'Stopped'}
            </span>

            {/* Overflow menu for mobile quick actions */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-theme-sm flex items-center justify-center text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-theme-surface border border-theme-border rounded-theme shadow-theme-hard p-1.5 z-30 space-y-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSelect(resource);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-text-primary hover:bg-theme-bg rounded-theme-sm"
                    >
                      View Hardware & Specs
                    </button>
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onPowerAction(resource, 'reboot');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-warning hover:bg-theme-bg rounded-theme-sm flex items-center"
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-2" /> Reboot Instance
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onPowerAction(resource, 'shutdown');
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-danger hover:bg-theme-bg rounded-theme-sm flex items-center"
                        >
                          <Square className="w-3.5 h-3.5 mr-2" /> ACPI Shutdown
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPowerAction(resource, 'start');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-running hover:bg-theme-bg rounded-theme-sm flex items-center"
                      >
                        <Play className="w-3.5 h-3.5 mr-2" /> Start Instance
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Meters (CPU, RAM, Uptime) */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-theme-border/60">
          {/* CPU Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted flex items-center font-mono font-medium">
                <Cpu className="w-3.5 h-3.5 mr-1 text-theme-accent" strokeWidth={1.75} /> CPU
              </span>
              <span className="font-mono font-bold text-theme-text-primary text-xs">
                {isRunning ? `${cpuPercent}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden border border-theme-border/40">
              <div
                className={`h-full transition-all duration-300 ${
                  cpuPercent > 80
                    ? 'bg-theme-danger'
                    : cpuPercent > 50
                    ? 'bg-theme-warning'
                    : 'bg-theme-accent'
                }`}
                style={{ width: `${isRunning ? cpuPercent : 0}%` }}
              />
            </div>
          </div>

          {/* RAM Meter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted flex items-center font-mono font-medium">
                <HardDrive className="w-3.5 h-3.5 mr-1 text-theme-running" strokeWidth={1.75} /> RAM
              </span>
              <span className="font-mono font-bold text-theme-text-primary text-xs">
                {isRunning ? `${memPercent}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden border border-theme-border/40">
              <div
                className="h-full bg-theme-running transition-all duration-300"
                style={{ width: `${isRunning ? memPercent : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sub-info: Memory exact and Uptime */}
        <div className="flex items-center justify-between text-xs text-theme-text-muted mt-2.5 font-mono">
          <span>
            {isRunning ? `${formatMem(resource.mem)} / ${formatMem(resource.maxmem)}` : `Cap: ${formatMem(resource.maxmem)}`}
          </span>
          <span className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
            {formatUptime(resource.uptime)}
          </span>
        </div>
      </div>

      {/* Action Button Footer */}
      <div className="pt-3 border-t border-theme-border/60 grid grid-cols-2 gap-2">
        {/* Power or Details Button */}
        {isRunning ? (
          <button
            onClick={() => onSelect(resource)}
            className="theme-btn py-2.5 px-3 text-xs font-semibold bg-theme-card text-theme-text-primary hover:bg-theme-bg flex items-center justify-center"
          >
            Specs & Power
          </button>
        ) : (
          <button
            onClick={() => onPowerAction(resource, 'start')}
            className="theme-btn py-2.5 px-3 text-xs font-bold bg-theme-running text-white hover:opacity-90 flex items-center justify-center"
            title="Start VM"
          >
            <Play className="w-4 h-4 mr-1.5" />
            <span>Start VM</span>
          </button>
        )}

        {/* Primary SSH Terminal Button */}
        <button
          onClick={() => onOpenSSH(resource)}
          disabled={!isRunning}
          className={`theme-btn py-2.5 px-3 text-xs font-bold flex items-center justify-center shadow-theme-sm ${
            isRunning
              ? 'bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover'
              : 'bg-theme-surface text-theme-text-muted opacity-40 cursor-not-allowed'
          }`}
          title={isRunning ? 'Open in-browser SSH shell' : 'Start VM to launch SSH'}
        >
          <Terminal className="w-4 h-4 mr-1.5" />
          <span>Launch SSH</span>
        </button>
      </div>
    </div>
  );
};
