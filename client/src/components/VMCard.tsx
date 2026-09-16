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
    <div className="theme-card bg-theme-card border-theme border-theme-border rounded-theme p-4 transition-all hover:border-theme-accent/60 flex flex-col justify-between space-y-4">
      {/* Header: Title, ID, Type, Status */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2.5">
            <div
              className={`w-9 h-9 rounded-theme-sm flex items-center justify-center border ${
                isLXC
                  ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  : 'bg-theme-accent/15 text-theme-accent border-theme-accent/30'
              }`}
            >
              {isLXC ? (
                <Box className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Layers className="w-5 h-5" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-theme-text-primary tracking-tight truncate max-w-[160px] sm:max-w-[200px]">
                  {resource.name || `VM ${resource.vmid}`}
                </span>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-theme-sm bg-theme-surface border border-theme-border text-theme-text-muted">
                  ID {resource.vmid}
                </span>
              </div>
              <p className="text-xs text-theme-text-muted flex items-center space-x-1.5 mt-0.5 font-mono">
                <span className="capitalize">{resource.type.toUpperCase()}</span>
                <span className="opacity-40">/</span>
                <span>Node: {resource.node}</span>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                isRunning
                  ? 'bg-theme-running-bg text-theme-running border-theme-running/30'
                  : 'bg-theme-stopped-bg text-theme-stopped border-theme-stopped/30'
              }`}
            >
              <Activity
                className={`w-3 h-3 mr-1 ${
                  isRunning ? 'text-theme-running animate-pulse' : 'text-theme-stopped opacity-50'
                }`}
                strokeWidth={2.5}
              />
              {isRunning ? 'Running' : 'Stopped'}
            </span>

            {/* Overflow menu for mobile quick actions */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-theme-sm text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg"
                aria-label="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-36 bg-theme-surface border border-theme-border rounded-theme shadow-theme-md p-1.5 z-30 space-y-1">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onSelect(resource);
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-theme-text-primary hover:bg-theme-bg rounded-theme-sm"
                    >
                      View Details
                    </button>
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onPowerAction(resource, 'reboot');
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-theme-warning hover:bg-theme-bg rounded-theme-sm flex items-center"
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Reboot
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            onPowerAction(resource, 'shutdown');
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-theme-danger hover:bg-theme-bg rounded-theme-sm flex items-center"
                        >
                          <Square className="w-3.5 h-3.5 mr-1.5" /> Shutdown
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPowerAction(resource, 'start');
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-theme-running hover:bg-theme-bg rounded-theme-sm flex items-center"
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Start
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Telemetry Meters (CPU, RAM, Uptime) */}
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-theme-border/60">
          {/* CPU Meter */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted flex items-center font-mono">
                <Cpu className="w-3 h-3 mr-1" strokeWidth={1.75} /> CPU
              </span>
              <span className="font-mono font-semibold text-theme-text-primary text-[11px]">
                {isRunning ? `${cpuPercent}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden border border-theme-border/40">
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
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-theme-text-muted flex items-center font-mono">
                <HardDrive className="w-3 h-3 mr-1" strokeWidth={1.75} /> RAM
              </span>
              <span className="font-mono font-semibold text-theme-text-primary text-[11px]">
                {isRunning ? `${memPercent}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden border border-theme-border/40">
              <div
                className="h-full bg-theme-running transition-all duration-300"
                style={{ width: `${isRunning ? memPercent : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sub-info: Memory exact and Uptime */}
        <div className="flex items-center justify-between text-[11px] text-theme-text-muted mt-2 font-mono">
          <span>
            {isRunning ? `${formatMem(resource.mem)} / ${formatMem(resource.maxmem)}` : `Cap: ${formatMem(resource.maxmem)}`}
          </span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" strokeWidth={1.75} />
            {formatUptime(resource.uptime)}
          </span>
        </div>
      </div>

      {/* Action Button Footer */}
      <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between space-x-2">
        {/* Power Action Buttons */}
        <div className="flex items-center space-x-1.5">
          {isRunning ? (
            <>
              <button
                onClick={() => onPowerAction(resource, 'shutdown')}
                className="theme-btn px-2.5 py-1 text-xs bg-theme-surface text-theme-text-muted hover:text-theme-danger hover:border-theme-danger"
                title="Shutdown VM"
                aria-label="Shutdown VM"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden md:inline ml-1.5">Shutdown</span>
              </button>
              <button
                onClick={() => onPowerAction(resource, 'reboot')}
                className="theme-btn px-2.5 py-1 text-xs bg-theme-surface text-theme-text-muted hover:text-theme-warning hover:border-theme-warning"
                title="Reboot VM"
                aria-label="Reboot VM"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline ml-1.5">Reboot</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => onPowerAction(resource, 'start')}
              className="theme-btn px-3 py-1 text-xs bg-theme-running text-white hover:opacity-90"
              title="Start VM"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => onSelect(resource)}
            className="theme-btn px-2.5 py-1 text-xs bg-theme-surface text-theme-text-primary hover:bg-theme-bg"
          >
            Details
          </button>
        </div>

        {/* Primary SSH Terminal Button */}
        <button
          onClick={() => onOpenSSH(resource)}
          disabled={!isRunning}
          className={`theme-btn px-3.5 py-1 text-xs font-bold flex items-center ${
            isRunning
              ? 'bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover'
              : 'bg-theme-surface text-theme-text-muted opacity-50 cursor-not-allowed'
          }`}
          title={isRunning ? 'Open in-browser SSH shell' : 'Start VM to launch SSH'}
        >
          <Terminal className="w-3.5 h-3.5 mr-1.5" />
          <span>SSH</span>
        </button>
      </div>
    </div>
  );
};
