export interface ProxmoxAuthCredentials {
  host: string; // e.g. "https://192.168.1.100:8006"
  username: string; // e.g. "root" or "admin"
  realm: string; // e.g. "pam" or "pve"
  password?: string;
  otp?: string;
}

export interface ProxmoxTicketResponse {
  ticket: string;
  CSRFPreventionToken: string;
  username: string;
  cap?: Record<string, any>;
}

export interface ClusterResource {
  id: string; // e.g. "qemu/100" or "lxc/101" or "node/pve"
  type: 'qemu' | 'lxc' | 'node' | 'storage' | 'pool';
  node: string;
  vmid?: number;
  name?: string;
  status: 'running' | 'stopped' | 'paused' | 'unknown';
  cpu?: number; // float 0..1
  maxcpu?: number;
  mem?: number; // bytes
  maxmem?: number; // bytes
  disk?: number; // bytes
  maxdisk?: number; // bytes
  uptime?: number; // seconds
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
  memory?: number; // MB
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

export interface SSHSessionParams {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  term?: string;
  cols?: number;
  rows?: number;
}
