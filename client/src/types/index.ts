export type ThemeMode = 'light' | 'dark' | 'neobrutalism' | 'minimalist-bw';

export interface ProxmoxAuthSession {
  ticket: string;
  csrfToken: string;
  username: string;
  host: string;
  realm: string;
  isMock: boolean;
}

export interface ClusterResource {
  id: string;
  type: 'qemu' | 'lxc' | 'node' | 'storage' | 'pool';
  node: string;
  vmid?: number;
  name?: string;
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  cpu?: number;
  maxcpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
  uptime?: number;
  netin?: number;
  netout?: number;
  diskread?: number;
  diskwrite?: number;
  template?: number;
  lock?: string;
  tags?: string;
}

export interface NodeStatus {
  node: string;
  status: 'online' | 'offline';
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  uptime: number;
  pveversion: string;
  kversion: string;
  loadavg?: number[];
}

export interface VMConfig {
  vmid: number;
  name: string;
  node: string;
  type: 'qemu' | 'lxc';
  cores?: number;
  sockets?: number;
  memory?: number;
  bootdisk?: string;
  ostype?: string;
  ip?: string;
  nodeHost?: string;
  net0?: string;
  description?: string;
  status: string;
  uptime?: number;
  cpu?: number;
  mem?: number;
  maxmem?: number;
  disk?: number;
  maxdisk?: number;
}

export interface SSHConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  vmid?: number;
  vmName?: string;
  node?: string;
}
