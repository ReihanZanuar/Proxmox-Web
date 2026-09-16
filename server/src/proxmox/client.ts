import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { ProxmoxAuthCredentials, ProxmoxTicketResponse, ClusterResource, NodeStatus, VMConfig } from '../types.js';

// Realistic demo cluster state for Demo / Offline preview
const mockClusterResources: ClusterResource[] = [
  {
    id: 'node/proxmox-master',
    type: 'node',
    node: 'pve-node-01',
    status: 'running',
    cpu: 0.18,
    maxcpu: 16,
    mem: 28991029248, // ~27 GB
    maxmem: 67488055296, // 64 GB
    uptime: 1284900,
    tags: 'production,nvme',
  },
  {
    id: 'qemu/100',
    type: 'qemu',
    node: 'pve-node-01',
    vmid: 100,
    name: 'prod-api-gateway',
    status: 'running',
    cpu: 0.24,
    maxcpu: 4,
    mem: 4294967296, // 4 GB
    maxmem: 8589934592, // 8 GB
    disk: 25769803776, // 24 GB
    maxdisk: 64424509440, // 60 GB
    uptime: 432800,
    tags: 'api,docker,nginx',
  },
  {
    id: 'qemu/101',
    type: 'qemu',
    node: 'pve-node-01',
    vmid: 101,
    name: 'k8s-control-plane-01',
    status: 'running',
    cpu: 0.45,
    maxcpu: 8,
    mem: 12884901888, // 12 GB
    maxmem: 17179869184, // 16 GB
    disk: 51539607552, // 48 GB
    maxdisk: 107374182400, // 100 GB
    uptime: 864200,
    tags: 'kubernetes,k8s,master',
  },
  {
    id: 'qemu/102',
    type: 'qemu',
    node: 'pve-node-01',
    vmid: 102,
    name: 'database-postgres-primary',
    status: 'running',
    cpu: 0.32,
    maxcpu: 8,
    mem: 15032385536, // 14 GB
    maxmem: 17179869184, // 16 GB
    disk: 154618822656, // 144 GB
    maxdisk: 268435456000, // 250 GB
    uptime: 1204000,
    tags: 'database,postgresql,nvme',
  },
  {
    id: 'lxc/200',
    type: 'lxc',
    node: 'pve-node-01',
    vmid: 200,
    name: 'monitoring-prometheus-grafana',
    status: 'running',
    cpu: 0.12,
    maxcpu: 4,
    mem: 2147483648, // 2 GB
    maxmem: 4294967296, // 4 GB
    disk: 12884901888,
    maxdisk: 32212254720,
    uptime: 345600,
    tags: 'monitoring,grafana,lxc',
  },
  {
    id: 'lxc/201',
    type: 'lxc',
    node: 'pve-node-01',
    vmid: 201,
    name: 'redis-cache-cluster',
    status: 'running',
    cpu: 0.08,
    maxcpu: 2,
    mem: 1073741824, // 1 GB
    maxmem: 2147483648, // 2 GB
    disk: 5368709120,
    maxdisk: 16106127360,
    uptime: 612400,
    tags: 'cache,redis,lxc',
  },
  {
    id: 'qemu/105',
    type: 'qemu',
    node: 'pve-node-01',
    vmid: 105,
    name: 'staging-app-testing',
    status: 'stopped',
    cpu: 0,
    maxcpu: 4,
    mem: 0,
    maxmem: 8589934592,
    disk: 10737418240,
    maxdisk: 42949672960,
    uptime: 0,
    tags: 'staging,testing',
  },
  {
    id: 'lxc/205',
    type: 'lxc',
    node: 'pve-node-01',
    vmid: 205,
    name: 'backup-sync-worker',
    status: 'stopped',
    cpu: 0,
    maxcpu: 2,
    mem: 0,
    maxmem: 2147483648,
    disk: 8589934592,
    maxdisk: 21474836480,
    uptime: 0,
    tags: 'backup,worker',
  }
];

export class ProxmoxClient {
  private axiosInstance: AxiosInstance;
  public host: string;
  public ticket?: string;
  public csrfToken?: string;
  public username?: string;
  public isMock: boolean;

  constructor(host: string, ticket?: string, csrfToken?: string, username?: string) {
    this.host = host.replace(/\/$/, '');
    this.ticket = ticket;
    this.csrfToken = csrfToken;
    this.username = username;
    this.isMock = host === 'mock' || host === 'demo';

    // Allow self-signed certificates for local Proxmox instances
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    this.axiosInstance = axios.create({
      baseURL: this.isMock ? '' : `${this.host}/api2/json`,
      timeout: 15000,
      httpsAgent,
      headers: {
        ...(this.ticket ? { Cookie: `PVEAuthCookie=${this.ticket}` } : {}),
        ...(this.csrfToken ? { CSRFPreventionToken: this.csrfToken } : {}),
      },
    });
  }

  static async authenticate(credentials: ProxmoxAuthCredentials): Promise<{
    ticket: string;
    CSRFPreventionToken: string;
    username: string;
    isMock: boolean;
  }> {
    const isMock = credentials.host === 'mock' || credentials.host === 'demo' || credentials.username === 'demo';

    if (isMock) {
      return {
        ticket: 'PVE:mock_ticket_preview_demo_token_xyz:1234567890',
        CSRFPreventionToken: 'MOCK_CSRF_TOKEN_PVE_POCKET_DEMO_42',
        username: `${credentials.username || 'root'}@${credentials.realm || 'pam'}`,
        isMock: true,
      };
    }

    const host = credentials.host.replace(/\/$/, '');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    // Format username: username@realm (e.g. root@pam or user@pve)
    const fullUsername = credentials.username.includes('@')
      ? credentials.username
      : `${credentials.username}@${credentials.realm || 'pam'}`;

    try {
      const response = await axios.post(
        `${host}/api2/json/access/ticket`,
        new URLSearchParams({
          username: fullUsername,
          password: credentials.password || '',
          ...(credentials.otp ? { otp: credentials.otp } : {}),
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          httpsAgent,
          timeout: 10000,
        }
      );

      const data: ProxmoxTicketResponse = response.data.data;
      return {
        ticket: data.ticket,
        CSRFPreventionToken: data.CSRFPreventionToken,
        username: data.username,
        isMock: false,
      };
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Proxmox authentication failed';
      throw new Error(`Authentication Error: ${msg}`);
    }
  }

  async getClusterResources(typeFilter?: string): Promise<ClusterResource[]> {
    if (this.isMock) {
      if (typeFilter) {
        return mockClusterResources.filter((r) => r.type === typeFilter);
      }
      return mockClusterResources;
    }

    const response = await this.axiosInstance.get('/cluster/resources', {
      params: typeFilter ? { type: typeFilter } : {},
    });
    return response.data.data as ClusterResource[];
  }

  async getNodes(): Promise<NodeStatus[]> {
    if (this.isMock) {
      return [
        {
          node: 'pve-node-01',
          status: 'online',
          cpu: 0.18,
          maxcpu: 16,
          mem: 28991029248,
          maxmem: 67488055296,
          uptime: 1284900,
          pveversion: 'pve-manager/8.3.1/6b73a21',
          kversion: 'Linux 6.8.12-4-pve #1 SMP PREEMPT_DYNAMIC',
          loadavg: [0.85, 0.92, 1.05],
        },
      ];
    }

    const response = await this.axiosInstance.get('/nodes');
    return response.data.data as NodeStatus[];
  }

  async getNodeStatus(node: string): Promise<NodeStatus> {
    if (this.isMock) {
      return {
        node,
        status: 'online',
        cpu: 0.18,
        maxcpu: 16,
        mem: 28991029248,
        maxmem: 67488055296,
        uptime: 1284900,
        pveversion: 'pve-manager/8.3.1',
        kversion: 'Linux 6.8.12-4-pve',
        loadavg: [0.85, 0.92, 1.05],
      };
    }

    const response = await this.axiosInstance.get(`/nodes/${node}/status`);
    return response.data.data;
  }

  async getVMConfig(node: string, type: 'qemu' | 'lxc', vmid: number): Promise<VMConfig> {
    if (this.isMock) {
      const found = mockClusterResources.find((r) => r.vmid === vmid);
      return {
        vmid,
        name: found?.name || `vm-${vmid}`,
        node,
        type,
        status: found?.status || 'stopped',
        cores: found?.maxcpu || 4,
        sockets: 1,
        memory: found?.maxmem ? Math.round(found.maxmem / (1024 * 1024)) : 4096,
        cpu: found?.cpu || 0,
        mem: found?.mem || 0,
        maxmem: found?.maxmem || 4294967296,
        disk: found?.disk || 0,
        maxdisk: found?.maxdisk || 32212254720,
        uptime: found?.uptime || 0,
        ip: `192.168.1.${100 + (vmid % 50)}`,
        ostype: type === 'qemu' ? 'l26' : 'debian',
        description: `Proxmox ${type.toUpperCase()} Instance [ID: ${vmid}]`,
      };
    }

    const [configRes, statusRes] = await Promise.all([
      this.axiosInstance.get(`/nodes/${node}/${type}/${vmid}/config`),
      this.axiosInstance.get(`/nodes/${node}/${type}/${vmid}/status/current`),
    ]);

    const cfg = configRes.data.data;
    const status = statusRes.data.data;

    // Extract host IP/domain from Proxmox server URL
    let serverHost = '';
    try {
      if (this.host.startsWith('http://') || this.host.startsWith('https://')) {
        const u = new URL(this.host);
        serverHost = u.hostname;
      } else {
        serverHost = this.host.split(':')[0];
      }
    } catch {
      serverHost = this.host;
    }

    // Try to get IP address if QEMU guest agent is running or from LXC config
    let ipAddress: string | undefined;

    // 1. Try QEMU Guest Agent network interfaces
    if (type === 'qemu' && status.status === 'running') {
      try {
        const agentNet = await this.axiosInstance.get(
          `/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`,
          { timeout: 3000 }
        );
        const ifaces = agentNet.data?.data?.result || [];
        for (const iface of ifaces) {
          if (iface.name !== 'lo' && iface['ip-addresses']) {
            const ipv4 = iface['ip-addresses'].find(
              (ip: any) =>
                ip['ip-address-type'] === 'ipv4' &&
                !ip['ip-address'].startsWith('127.') &&
                !ip['ip-address'].startsWith('169.254.')
            );
            if (ipv4) {
              ipAddress = ipv4['ip-address'];
              break;
            }
          }
        }
      } catch {
        // Agent might not be installed or enabled
      }
    }

    // 2. Try LXC interfaces endpoint
    if (type === 'lxc' && !ipAddress && status.status === 'running') {
      try {
        const lxcNet = await this.axiosInstance.get(
          `/nodes/${node}/lxc/${vmid}/interfaces`,
          { timeout: 3000 }
        );
        const ifaces = lxcNet.data?.data || [];
        for (const iface of ifaces) {
          if (iface.name !== 'lo' && iface.inet) {
            const cleanIp = iface.inet.split('/')[0];
            if (cleanIp && !cleanIp.startsWith('127.')) {
              ipAddress = cleanIp;
              break;
            }
          }
        }
      } catch {
        // Fallback to static config
      }
    }

    // 4. Check description for IP (e.g. IP: 10.99.99.x or 192.168.x.x)
    if (!ipAddress && cfg.description) {
      const descMatch = cfg.description.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/);
      if (descMatch && descMatch[1] && !descMatch[1].startsWith('127.')) {
        ipAddress = descMatch[1];
      }
    }

    return {
      vmid,
      name: status.name || cfg.name || `vm-${vmid}`,
      node,
      type,
      status: status.status,
      cores: cfg.cores || status.cpus || 1,
      sockets: cfg.sockets || 1,
      memory: cfg.memory || Math.round((status.maxmem || 0) / (1024 * 1024)),
      bootdisk: cfg.bootdisk,
      ostype: cfg.ostype,
      ip: ipAddress || undefined,
      nodeHost: serverHost && serverHost !== 'mock' ? serverHost : undefined,
      net0: cfg.net0,
      description: cfg.description,
      uptime: status.uptime,
      cpu: status.cpu,
      mem: status.mem,
      maxmem: status.maxmem,
      disk: status.disk,
      maxdisk: status.maxdisk,
    };
  }

  async executePowerAction(
    node: string,
    type: 'qemu' | 'lxc',
    vmid: number,
    action: 'start' | 'stop' | 'shutdown' | 'reboot' | 'reset' | 'suspend' | 'resume'
  ): Promise<{ success: boolean; upid?: string }> {
    if (this.isMock) {
      const found = mockClusterResources.find((r) => r.vmid === vmid);
      if (found) {
        if (action === 'start' || action === 'resume') {
          found.status = 'running';
          found.cpu = 0.15;
          found.mem = (found.maxmem || 4294967296) * 0.4;
          found.uptime = 5;
        } else if (action === 'stop' || action === 'shutdown') {
          found.status = 'stopped';
          found.cpu = 0;
          found.mem = 0;
          found.uptime = 0;
        } else if (action === 'reboot' || action === 'reset') {
          found.status = 'running';
          found.uptime = 2;
        }
      }
      return { success: true, upid: `UPID:${node}:00000001:00000001:66E7B5C0:${action}:mock:${vmid}:` };
    }

    const response = await this.axiosInstance.post(
      `/nodes/${node}/${type}/${vmid}/status/${action}`
    );
    return {
      success: true,
      upid: response.data.data,
    };
  }
}
