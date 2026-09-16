import { Router, Request, Response } from 'express';
import { ProxmoxClient } from '../proxmox/client.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { host, username, password, realm, otp } = req.body;

    if (!host || !username) {
      return res.status(400).json({ error: 'Host and Username are required' });
    }

    const authResult = await ProxmoxClient.authenticate({
      host,
      username,
      password,
      realm: realm || 'pam',
      otp,
    });

    // Send ticket info back to client
    return res.json({
      success: true,
      ticket: authResult.ticket,
      csrfToken: authResult.CSRFPreventionToken,
      username: authResult.username,
      host,
      isMock: authResult.isMock,
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    return res.status(401).json({
      error: error.message || 'Proxmox authentication failed',
    });
  }
});

// GET /api/auth/realms
router.get('/realms', (_req: Request, res: Response) => {
  res.json([
    { id: 'pam', name: 'Linux PAM standard authentication' },
    { id: 'pve', name: 'Proxmox VE authentication server' },
    { id: 'ldap', name: 'LDAP / Active Directory' },
    { id: 'openid', name: 'OpenID Connect' },
  ]);
});

export default router;
