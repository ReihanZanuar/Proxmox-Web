import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { SSHConnectionConfig } from '../types/index.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  RefreshCw,
  Terminal as TerminalIcon,
  Wifi,
  WifiOff,
  Trash2,
  Settings2,
  Key,
  Server,
  AlertCircle,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  LogOut,
} from 'lucide-react';

interface SSHTerminalModalProps {
  config: SSHConnectionConfig;
  onClose: () => void;
}

export const SSHTerminalModal: React.FC<SSHTerminalModalProps> = ({ config, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { theme } = useTheme();

  // Load cached SSH credentials for this specific VM if previously saved
  const cacheKey = config.vmid ? `pve_ssh_vm_${config.vmid}` : null;
  const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
  const parsedCache = cached ? JSON.parse(cached) : null;

  const isIpOrFqdn =
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(config.host) ||
    config.host.includes('.') ||
    config.host === 'mock' ||
    config.host === 'demo' ||
    config.host === 'localhost';

  const initialHost = parsedCache?.host || (isIpOrFqdn ? config.host : '');
  const initialPort = parsedCache?.port || config.port || 22;
  const initialUser = parsedCache?.username || config.username || 'root';
  const initialPassword = parsedCache?.password || config.password || '';

  const [currentHost, setCurrentHost] = useState<string>(initialHost);
  const [currentPort, setCurrentPort] = useState<number>(initialPort);
  const [currentUser, setCurrentUser] = useState<string>(initialUser);
  const [currentPassword, setCurrentPassword] = useState<string>(initialPassword);

  // Status & UI toggles
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(!initialHost);
  const [ctrlActive, setCtrlActive] = useState(false);
  const [altActive, setAltActive] = useState(false);

  // Setup terminal theme colors
  const getTerminalTheme = () => {
    switch (theme) {
      case 'light':
        return {
          background: '#FFFFFF',
          foreground: '#0F172A',
          cursor: '#EA580C',
          cursorAccent: '#FFFFFF',
          selectionBackground: '#FED7AA',
          black: '#0F172A',
          red: '#E11D48',
          green: '#059669',
          yellow: '#D97706',
          blue: '#2563EB',
          magenta: '#7C3AED',
          cyan: '#0891B2',
          white: '#F0F2F5',
        };
      case 'neobrutalism':
        return {
          background: '#FFFBEB',
          foreground: '#000000',
          cursor: '#FFE600',
          cursorAccent: '#000000',
          selectionBackground: '#FFE600',
          black: '#000000',
          red: '#FF1744',
          green: '#00E676',
          yellow: '#FF9100',
          blue: '#00F0FF',
          magenta: '#D500F9',
          cyan: '#00E5FF',
          white: '#FFFFFF',
        };
      case 'minimalist-bw':
        return {
          background: '#FFFFFF',
          foreground: '#000000',
          cursor: '#000000',
          cursorAccent: '#FFFFFF',
          selectionBackground: '#E4E4E7',
          black: '#000000',
          red: '#000000',
          green: '#000000',
          yellow: '#000000',
          blue: '#000000',
          magenta: '#000000',
          cyan: '#000000',
          white: '#FFFFFF',
        };
      case 'dark':
      default:
        return {
          background: '#0C0D0E',
          foreground: '#EDEDEE',
          cursor: '#EA580C',
          cursorAccent: '#0C0D0E',
          selectionBackground: 'rgba(234, 88, 12, 0.25)',
          black: '#181B1F',
          red: '#F43F5E',
          green: '#10B981',
          yellow: '#F59E0B',
          blue: '#3B82F6',
          magenta: '#A855F7',
          cyan: '#06B6D4',
          white: '#EDEDEE',
        };
    }
  };

  const connectWebSocket = (targetHost?: string, targetPort?: number, targetUser?: string, targetPass?: string) => {
    const hostToUse = targetHost !== undefined ? targetHost : currentHost;
    const portToUse = targetPort !== undefined ? targetPort : currentPort;
    const userToUse = targetUser !== undefined ? targetUser : currentUser;
    const passToUse = targetPass !== undefined ? targetPass : currentPassword;

    if (!hostToUse || !hostToUse.trim()) {
      setShowSettings(true);
      setStatus('disconnected');
      setErrorMessage('Please enter the target IP or hostname for this VM.');
      return;
    }

    // Save to localStorage for quick future connects
    if (cacheKey) {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          host: hostToUse,
          port: portToUse,
          username: userToUse,
          password: passToUse,
        })
      );
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }

    setStatus('connecting');
    setErrorMessage(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const serverHost = window.location.host;
    const query = new URLSearchParams({
      host: hostToUse.trim(),
      port: (portToUse || 22).toString(),
      username: (userToUse || 'root').trim(),
      ...(passToUse ? { password: passToUse } : {}),
      cols: (xtermInstance.current?.cols || 80).toString(),
      rows: (xtermInstance.current?.rows || 24).toString(),
    });

    const wsUrl = `${protocol}//${serverHost}/ws/ssh?${query.toString()}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      setShowSettings(false);
      setErrorMessage(null);
      if (fitAddonRef.current && xtermInstance.current) {
        fitAddonRef.current.fit();
        ws.send(
          JSON.stringify({
            type: 'resize',
            cols: xtermInstance.current.cols,
            rows: xtermInstance.current.rows,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      const text = event.data.toString();
      if (xtermInstance.current) {
        xtermInstance.current.write(text);
      }

      // Check if message contains connection error
      if (text.includes('ENOTFOUND') || text.includes('getaddrinfo') || text.includes('ECONNREFUSED')) {
        setErrorMessage(`Unable to reach host '${hostToUse}'. Check IP address and ensure SSH port ${portToUse} is open.`);
        setShowSettings(true);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket SSH error:', err);
      setStatus('disconnected');
      setErrorMessage('WebSocket connection error. Remote SSH host may be unreachable.');
      setShowSettings(true);
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js with optimized mobile typing parameters
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      lineHeight: 1.2,
      theme: getTerminalTheme(),
      allowProposedApi: true,
      convertEol: true,
      scrollback: 1000,
      smoothScrollDuration: 0,
      fastScrollModifier: 'alt',
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Fix helper textarea attributes immediately to eliminate mobile keyboard autocorrect/predictive lag
    const helper = terminalRef.current.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement | null;
    if (helper) {
      helper.setAttribute('autocapitalize', 'off');
      helper.setAttribute('autocomplete', 'off');
      helper.setAttribute('autocorrect', 'off');
      helper.setAttribute('spellcheck', 'false');
      helper.setAttribute('inputmode', 'text');
    }

    // Send keystrokes over WebSocket directly
    term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(data);
      }
    });

    // Handle Window & Container Resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermInstance.current && wsRef.current) {
        fitAddonRef.current.fit();
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'resize',
              cols: xtermInstance.current.cols,
              rows: xtermInstance.current.rows,
            })
          );
        }
      }
    };

    window.addEventListener('resize', handleResize);

    if (initialHost) {
      connectWebSocket(initialHost, initialPort, initialUser, initialPassword);
    } else {
      setShowSettings(true);
      setStatus('disconnected');
      setErrorMessage('Please enter the target IP or hostname for this VM to connect.');
    }

    term.focus();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) wsRef.current.close();
      term.dispose();
    };
  }, []);

  // Update theme dynamically if user toggles theme
  useEffect(() => {
    if (xtermInstance.current) {
      xtermInstance.current.options.theme = getTerminalTheme();
    }
  }, [theme]);

  // Mobile Virtual Key Helper Functions
  const sendKey = (keyString: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(keyString);
    }
    if (xtermInstance.current) {
      xtermInstance.current.focus();
    }
  };

  const handleCtrlKey = (letter: string) => {
    const charCode = letter.toUpperCase().charCodeAt(0) - 64;
    sendKey(String.fromCharCode(charCode));
    setCtrlActive(false);
  };

  const clearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      sendKey('\x0c'); // Ctrl+L
    }
  };

  const handleSaveAndConnect = (e: React.FormEvent) => {
    e.preventDefault();
    connectWebSocket();
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-theme-surface border border-theme-border rounded-theme shadow-theme-sm overflow-hidden terminal-tab-container">
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-theme-card border-b border-theme-border shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-theme-sm bg-theme-accent/15 text-theme-accent flex items-center justify-center font-bold shrink-0">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="font-bold text-xs sm:text-sm text-theme-text-primary truncate">
                {currentUser}@{currentHost || '[No IP]'}:{currentPort}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-bg text-theme-text-muted border border-theme-border shrink-0 hidden sm:inline">
                {config.vmName ? config.vmName : `ID ${config.vmid || 'Host'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Control Actions */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Status Pill */}
          <span
            className={`flex items-center text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border ${
              status === 'connected'
                ? 'bg-theme-running-bg text-theme-running border-theme-running/30'
                : status === 'connecting'
                ? 'bg-theme-warning-bg text-theme-warning border-theme-warning/30'
                : 'bg-theme-danger-bg text-theme-danger border-theme-danger/30'
            }`}
          >
            {status === 'connected' ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Connected</span>
              </>
            ) : status === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                <span className="hidden sm:inline">Connecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Offline</span>
              </>
            )}
          </span>

          {/* Toggle Settings Form */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`theme-btn px-2 py-1 text-xs min-h-[32px] ${
              showSettings
                ? 'bg-theme-accent text-theme-accent-fg'
                : 'bg-theme-surface text-theme-text-primary hover:bg-theme-bg'
            }`}
            title="Configure target IP / Port / Credentials"
          >
            <Settings2 className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Config</span>
          </button>

          {/* Reconnect button if disconnected */}
          {status === 'disconnected' && !showSettings && (
            <button
              onClick={() => connectWebSocket()}
              className="theme-btn px-2 py-1 text-xs min-h-[32px] bg-theme-accent text-theme-accent-fg"
              title="Reconnect SSH"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Reconnect</span>
            </button>
          )}

          {/* Close / Disconnect Button */}
          <button
            onClick={onClose}
            className="theme-btn px-2.5 py-1 text-xs min-h-[32px] bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white flex items-center space-x-1"
            title="Close Terminal & Return"
            aria-label="Close terminal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>

      {/* Collapsible Connection Settings Bar */}
      {showSettings && (
        <div className="bg-theme-card border-b border-theme-border p-3 space-y-2.5 shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
          {errorMessage && (
            <div className="p-2 rounded-theme-sm bg-theme-danger-bg border border-theme-danger/30 text-theme-danger text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-tight">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSaveAndConnect} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              {/* Host / IP Input */}
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-theme-text-primary flex items-center">
                  <Server className="w-3.5 h-3.5 mr-1 text-theme-accent" /> Target IP / Host
                </label>
                <input
                  type="text"
                  value={currentHost}
                  onChange={(e) => setCurrentHost(e.target.value)}
                  placeholder="e.g. 192.168.1.50"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  required
                  className="w-full px-2.5 py-1.5 text-xs rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>

              {/* Port */}
              <div className="space-y-1">
                <label className="font-semibold text-theme-text-primary">Port</label>
                <input
                  type="number"
                  value={currentPort}
                  onChange={(e) => setCurrentPort(parseInt(e.target.value, 10) || 22)}
                  placeholder="22"
                  inputMode="numeric"
                  required
                  className="w-full px-2.5 py-1.5 text-xs rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="font-semibold text-theme-text-primary">User</label>
                <input
                  type="text"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  placeholder="root"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  required
                  className="w-full px-2.5 py-1.5 text-xs rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>
            </div>

            {/* Password and Connect Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 w-full relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-theme-text-muted">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="SSH Password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-theme-sm border border-theme-border bg-theme-bg text-theme-text-primary focus:outline-none focus:border-theme-accent font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="submit"
                  className="flex-1 sm:flex-initial theme-btn px-3 py-1.5 text-xs font-bold bg-theme-accent text-theme-accent-fg hover:bg-theme-accent-hover flex items-center justify-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Connect</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="theme-btn px-3 py-1.5 text-xs bg-theme-surface text-theme-text-muted hover:text-theme-text-primary"
                >
                  Hide
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Xterm.js Canvas Container (No background scrolling) */}
      <div
        ref={terminalRef}
        className="flex-1 w-full p-2 bg-theme-bg overflow-hidden focus:outline-none select-none"
        onClick={() => xtermInstance.current?.focus()}
      />

      {/* Mobile Virtual Accessory Keyboard Toolbar */}
      <div className="bg-theme-card border-t border-theme-border p-1.5 flex items-center justify-between overflow-x-auto space-x-1 shrink-0">
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => sendKey('\x1b')}
            className="theme-btn px-2 py-1 text-xs font-mono font-bold bg-theme-surface text-theme-text-primary hover:bg-theme-accent hover:text-theme-accent-fg min-h-[30px] min-w-[36px]"
          >
            ESC
          </button>
          <button
            onClick={() => sendKey('\t')}
            className="theme-btn px-2 py-1 text-xs font-mono font-bold bg-theme-surface text-theme-text-primary hover:bg-theme-accent hover:text-theme-accent-fg min-h-[30px] min-w-[36px]"
          >
            TAB
          </button>
          <button
            onClick={() => setCtrlActive(!ctrlActive)}
            className={`theme-btn px-2 py-1 text-xs font-mono font-bold min-h-[30px] ${
              ctrlActive
                ? 'bg-theme-accent text-theme-accent-fg'
                : 'bg-theme-surface text-theme-text-primary'
            }`}
          >
            CTRL
          </button>
          <button
            onClick={() => setAltActive(!altActive)}
            className={`theme-btn px-2 py-1 text-xs font-mono font-bold min-h-[30px] ${
              altActive
                ? 'bg-theme-accent text-theme-accent-fg'
                : 'bg-theme-surface text-theme-text-primary'
            }`}
          >
            ALT
          </button>
          <button
            onClick={() => sendKey('\x03')}
            className="theme-btn px-2 py-1 text-xs font-mono font-bold bg-theme-danger-bg text-theme-danger hover:bg-theme-danger hover:text-white min-h-[30px]"
            title="Interrupt (Ctrl+C)"
          >
            ^C
          </button>
          <button
            onClick={() => sendKey('\x04')}
            className="theme-btn px-2 py-1 text-xs font-mono font-bold bg-theme-surface text-theme-text-muted hover:text-theme-text-primary min-h-[30px]"
            title="EOF / Logout (Ctrl+D)"
          >
            ^D
          </button>
        </div>

        {/* Navigation Arrows & Screen Clear */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => sendKey('\x1b[A')}
            className="theme-btn px-1.5 py-1 text-xs bg-theme-surface text-theme-text-primary min-h-[30px] min-w-[32px] flex items-center justify-center"
            title="Arrow Up"
            aria-label="Arrow Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => sendKey('\x1b[B')}
            className="theme-btn px-1.5 py-1 text-xs bg-theme-surface text-theme-text-primary min-h-[30px] min-w-[32px] flex items-center justify-center"
            title="Arrow Down"
            aria-label="Arrow Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => sendKey('\x1b[D')}
            className="theme-btn px-1.5 py-1 text-xs bg-theme-surface text-theme-text-primary min-h-[30px] min-w-[32px] flex items-center justify-center"
            title="Arrow Left"
            aria-label="Arrow Left"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => sendKey('\x1b[C')}
            className="theme-btn px-1.5 py-1 text-xs bg-theme-surface text-theme-text-primary min-h-[30px] min-w-[32px] flex items-center justify-center"
            title="Arrow Right"
            aria-label="Arrow Right"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearTerminal}
            className="theme-btn px-2 py-1 text-xs bg-theme-surface text-theme-text-muted hover:text-theme-text-primary min-h-[30px]"
            title="Clear screen buffer"
            aria-label="Clear screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Letter Palette when CTRL is activated on mobile */}
      {ctrlActive && (
        <div className="bg-theme-surface border-t border-theme-border p-1.5 flex flex-wrap gap-1 justify-center shrink-0">
          {['C', 'Z', 'D', 'A', 'E', 'R', 'L', 'W', 'K', 'U'].map((key) => (
            <button
              key={key}
              onClick={() => handleCtrlKey(key)}
              className="theme-btn px-2 py-0.5 text-xs font-mono font-bold bg-theme-card text-theme-text-primary hover:bg-theme-accent hover:text-theme-accent-fg min-h-[28px]"
            >
              Ctrl+{key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
