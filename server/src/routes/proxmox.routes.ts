import { Router, Request, Response } from 'express';
import { ProxmoxClient } from '../proxmox/client.js';

const router = Router();

// Middleware helper to extract Proxmox credentials from headers
function getClient(req: Request): ProxmoxClient {
  const host = (req.headers['x-pve-host'] as string) || 'mock';
  const ticket = req.headers['x-pve-ticket'] as string;
  const csrfToken = req.headers['x-pve-csrf'] as string;
  const username = req.headers['x-pve-user'] as string;

  return new ProxmoxClient(host, ticket, csrfToken, username);
}

// GET /api/cluster/resources
router.get('/cluster/resources', async (req: Request, res: Response) => {
  try {
    const client = getClient(req);
    const typeFilter = req.query.type as string | undefined;
    const resources = await client.getClusterResources(typeFilter);
    return res.json({ data: resources });
  } catch (error: any) {
    console.error('Error fetching cluster resources:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch cluster resources' });
  }
});

// GET /api/nodes
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const client = getClient(req);
    const nodes = await client.getNodes();
    return res.json({ data: nodes });
  } catch (error: any) {
    console.error('Error fetching nodes:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch nodes' });
  }
});

// GET /api/nodes/:node/status
router.get('/nodes/:node/status', async (req: Request, res: Response) => {
  try {
    const client = getClient(req);
    const nodeName = String(req.params.node);
    const status = await client.getNodeStatus(nodeName);
    return res.json({ data: status });
  } catch (error: any) {
    console.error('Error fetching node status:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch node status' });
  }
});

// GET /api/nodes/:node/:type/:vmid/config
router.get('/nodes/:node/:type/:vmid/config', async (req: Request, res: Response) => {
  try {
    const client = getClient(req);
    const node = String(req.params.node);
    const type = String(req.params.type);
    const vmidStr = String(req.params.vmid);

    if (type !== 'qemu' && type !== 'lxc') {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }

    const config = await client.getVMConfig(node, type as 'qemu' | 'lxc', parseInt(vmidStr, 10));
    return res.json({ data: config });
  } catch (error: any) {
    console.error('Error fetching VM config:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch VM config' });
  }
});

// POST /api/nodes/:node/:type/:vmid/status/:action
router.post('/nodes/:node/:type/:vmid/status/:action', async (req: Request, res: Response) => {
  try {
    const client = getClient(req);
    const node = String(req.params.node);
    const type = String(req.params.type);
    const vmidStr = String(req.params.vmid);
    const action = String(req.params.action);

    if (type !== 'qemu' && type !== 'lxc') {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }

    const validActions = ['start', 'stop', 'shutdown', 'reboot', 'reset', 'suspend', 'resume'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action: ${action}` });
    }

    const result = await client.executePowerAction(
      node,
      type as 'qemu' | 'lxc',
      parseInt(vmidStr, 10),
      action as any
    );

    return res.json(result);
  } catch (error: any) {
    console.error('Error executing power action:', error.message);
    return res.status(500).json({ error: error.message || `Failed to execute action` });
  }
});

export default router;
