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

const VMCardComponent: React.FC<VMCardProps> = ({
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
    if (!seconds || seconds <= 0) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isLXC = resource.type === 'lxc';

  return (
    <div className="theme-card bg-theme-surface border border-theme-border rounded-theme p-3.5 sm:p-4 shadow-theme-sm space-y-3">
      {/* Header Row: Icon, Title, ID, Type, Node, Status Pill, Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-theme flex items-center justify-center border shrink-0 ${
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm sm:text-base text-theme-text-primary tracking-tight truncate">
                {resource.name || `VM ${resource.vmid}`}
              </h3>
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.2 rounded bg-theme-bg border border-theme-border text-theme-text-muted shrink-0">
                #{resource.vmid}
              </span>
            </div>
            <p className="text-[11px] text-theme-text-muted font-mono flex items-center space-x-1 mt-0.5 truncate">
              <span className="font-semibold text-theme-text-primary">{resource.type.toUpperCase()}</span>
              <span className="opacity-40">•</span>
              <span className="truncate">Node: {resource.node}</span>
            </p>
          </div>
        </div>

        {/* Status Pill & 3-Dots Dropdown */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
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
                    View Hardware Specs
                  </button>
                  {isRunning ? (
                    <>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPowerAction(resource, 'shutdown');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-text-primary hover:bg-theme-bg rounded-theme-sm flex items-center"
                      >
                        <Square className="w-3.5 h-3.5 mr-2 text-theme-danger" /> Matikan
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPowerAction(resource, 'reboot');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-warning hover:bg-theme-bg rounded-theme-sm flex items-center"
                      >
                        <RotateCw className="w-3.5 h-3.5 mr-2" /> Reboot
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onPowerAction(resource, 'stop');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-danger hover:bg-theme-bg rounded-theme-sm flex items-center"
                      >
                        <Square className="w-3.5 h-3.5 mr-2 text-theme-danger fill-current" /> Force Stop
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onPowerAction(resource, 'start');
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-theme-accent hover:bg-theme-bg rounded-theme-sm flex items-center"
                    >
                      <Play className="w-3.5 h-3.5 mr-2" /> Start VM
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Grid (Balanced 2-Column Boxes) */}
      <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-theme-border/60">
        {/* CPU Block */}
        <div className="bg-theme-bg p-2.5 rounded-theme-sm border border-theme-border/50 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-theme-text-muted flex items-center font-medium">
              <Cpu className="w-3.5 h-3.5 mr-1 text-theme-accent" strokeWidth={1.75} /> CPU
            </span>
            <span className="font-bold text-theme-text-primary">
              {isRunning ? `${cpuPercent}%` : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden border border-theme-border/40">
            <div
              className={`h-full ${
                cpuPercent > 80
                  ? 'bg-theme-danger'
                  : cpuPercent > 50
                  ? 'bg-theme-warning'
                  : 'bg-theme-accent'
              }`}
              style={{ width: `${isRunning ? cpuPercent : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-theme-text-muted font-mono pt-0.5">
            <span>Uptime</span>
            <span className="flex items-center font-semibold text-theme-text-primary">
              <Clock className="w-3 h-3 mr-1 opacity-70" />
              {isRunning ? formatUptime(resource.uptime) : 'Stopped'}
            </span>
          </div>
        </div>

        {/* RAM Block */}
        <div className="bg-theme-bg p-2.5 rounded-theme-sm border border-theme-border/50 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-theme-text-muted flex items-center font-medium">
              <HardDrive className="w-3.5 h-3.5 mr-1 text-theme-running" strokeWidth={1.75} /> RAM
            </span>
            <span className="font-bold text-theme-text-primary">
              {isRunning ? `${memPercent}%` : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-theme-surface rounded-full overflow-hidden border border-theme-border/40">
            <div
              className="h-full bg-theme-running"
              style={{ width: `${isRunning ? memPercent : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-theme-text-muted font-mono pt-0.5 truncate">
            <span>RAM</span>
            <span className="font-semibold text-theme-text-primary truncate" title={isRunning ? `${formatMem(resource.mem)} / ${formatMem(resource.maxmem)}` : formatMem(resource.maxmem)}>
              {isRunning ? `${formatMem(resource.mem)} / ${formatMem(resource.maxmem)}` : formatMem(resource.maxmem)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Footer: Symmetrical, straight, high touch target */}
      <div className="pt-2.5 border-t border-theme-border/60 grid grid-cols-2 gap-2">
        {/* Specs & Power Button */}
        {isRunning ? (
          <button
            onClick={() => onSelect(resource)}
            className="theme-btn py-2 px-3 text-xs font-semibold bg-theme-card text-theme-text-primary hover:bg-theme-bg flex items-center justify-center min-h-[38px]"
          >
            Specs & Power
          </button>
        ) : (
          <button
            onClick={() => onPowerAction(resource, 'start')}
            className="theme-btn py-2 px-3 text-xs font-bold bg-theme-running text-white hover:opacity-90 flex items-center justify-center min-h-[38px]"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            <span>Start VM</span>
          </button>
        )}

        {/* Launch SSH Button */}
        <button
          onClick={() => onOpenSSH(resource)}
          disabled={!isRunning}
          className={`theme-btn py-2 px-3 text-xs font-bold flex items-center justify-center min-h-[38px] ${
            isRunning
              ? 'bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover shadow-theme-sm'
              : 'bg-theme-surface text-theme-text-muted opacity-40 cursor-not-allowed'
          }`}
          title={isRunning ? 'Open SSH Terminal' : 'Start VM to launch SSH'}
        >
          <Terminal className="w-3.5 h-3.5 mr-1.5" />
          <span>Launch SSH</span>
        </button>
      </div>
    </div>
  );
};

export const VMCard = React.memo(VMCardComponent);
