import axios from 'axios';
import { ClusterResource, NodeStatus, VMConfig, ProxmoxAuthSession } from '../types/index.js';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Interceptor to inject Proxmox session headers
apiClient.interceptors.request.use((config) => {
  const saved = localStorage.getItem('pve_session');
  if (saved) {
    try {
      const session: ProxmoxAuthSession = JSON.parse(saved);
      config.headers['x-pve-host'] = session.host;
      config.headers['x-pve-ticket'] = session.ticket;
      config.headers['x-pve-csrf'] = session.csrfToken;
      config.headers['x-pve-user'] = session.username;
    } catch {
      // Ignored if session is corrupted
    }
  }
  return config;
});

export const ProxmoxAPI = {
  async getClusterResources(typeFilter?: string): Promise<ClusterResource[]> {
    const res = await apiClient.get('/cluster/resources', {
      params: typeFilter ? { type: typeFilter } : {},
    });
    return res.data.data;
  },

  async getNodes(): Promise<NodeStatus[]> {
    const res = await apiClient.get('/nodes');
    return res.data.data;
  },

  async getNodeStatus(node: string): Promise<NodeStatus> {
    const res = await apiClient.get(`/nodes/${node}/status`);
    return res.data.data;
  },

  async getVMConfig(node: string, type: 'qemu' | 'lxc', vmid: number): Promise<VMConfig> {
    const res = await apiClient.get(`/nodes/${node}/${type}/${vmid}/config`);
    return res.data.data;
  },

  async executePowerAction(
    node: string,
    type: 'qemu' | 'lxc',
    vmid: number,
    action: 'start' | 'stop' | 'shutdown' | 'reboot' | 'reset' | 'suspend' | 'resume'
  ): Promise<{ success: boolean; upid?: string }> {
    const res = await apiClient.post(`/nodes/${node}/${type}/${vmid}/status/${action}`);
    return res.data;
  },
};
