import { WebSocket, WebSocketServer } from 'ws';
import { Client as SSHClient, ClientChannel } from 'ssh2';
import { IncomingMessage } from 'http';
import { URL } from 'url';

export function setupSSHWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    try {
      const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const host = parsedUrl.searchParams.get('host') || 'mock';
      const port = parseInt(parsedUrl.searchParams.get('port') || '22', 10);
      const username = parsedUrl.searchParams.get('username') || 'root';
      const password = parsedUrl.searchParams.get('password') || '';
      const privateKey = parsedUrl.searchParams.get('privateKey') || undefined;
      const cols = parseInt(parsedUrl.searchParams.get('cols') || '80', 10);
      const rows = parseInt(parsedUrl.searchParams.get('rows') || '24', 10);
      const command = parsedUrl.searchParams.get('command') || undefined;
      const mode = parsedUrl.searchParams.get('mode') || 'direct'; // 'direct' or 'console'
      const vmid = parsedUrl.searchParams.get('vmid') || undefined;
      const vmType = parsedUrl.searchParams.get('type') || 'qemu';

      const isMock = host === 'mock' || host === 'demo';

      if (isMock) {
        handleMockSSH(ws, host, username, cols, rows);
        return;
      }

      handleRealSSH(ws, { host, port, username, password, privateKey, cols, rows, command, mode, vmid, vmType });
    } catch (err: any) {
      console.error('SSH connection setup failed:', err);
      ws.send(`\r\n\x1b[31m[SSH Connection Error]\x1b[0m ${err.message}\r\n`);
      ws.close();
    }
  });
}

interface RealSSHOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  cols: number;
  rows: number;
  command?: string;
  mode?: string;
  vmid?: string;
  vmType?: string;
}

function handleRealSSH(ws: WebSocket, opts: RealSSHOptions) {
  const ssh = new SSHClient();
  let stream: ClientChannel | null = null;

  ws.send(`\x1b[36mConnecting to SSH at ${opts.username}@${opts.host}:${opts.port}...\x1b[0m\r\n`);

  ssh.on('ready', () => {
    ws.send(`\x1b[32mSSH Connection Established.\x1b[0m\r\n\r\n`);

    const ptyOpts = {
      term: 'xterm-256color',
      cols: opts.cols,
      rows: opts.rows,
    };

    const handleStream = (err: Error | null | undefined, s: ClientChannel) => {
      if (err) {
        ws.send(`\r\n\x1b[31mShell error: ${err.message}\x1b[0m\r\n`);
        ws.close();
        ssh.end();
        return;
      }

      stream = s;

      // Pipe SSH stream output to WebSocket
      stream.on('data', (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data.toString('utf-8'));
        }
      });

      stream.on('close', () => {
        ws.send('\r\n\x1b[33mConnection closed by remote host.\x1b[0m\r\n');
        ws.close();
        ssh.end();
      });
    };

    // If console mode is requested on Proxmox node
    if (opts.mode === 'console' && opts.vmid) {
      const consoleCmd = opts.vmType === 'lxc' ? `pct enter ${opts.vmid}` : `qm terminal ${opts.vmid}`;
      ssh.exec(consoleCmd, { pty: ptyOpts }, handleStream);
    } else if (opts.command) {
      ssh.exec(opts.command, { pty: ptyOpts }, handleStream);
    } else {
      ssh.shell(ptyOpts, handleStream);
    }
  });

  ssh.on('error', (err) => {
    console.error('SSH Client Error:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\n\x1b[31mSSH Error: ${err.message}\x1b[0m\r\n`);
      ws.close();
    }
  });

  ssh.on('close', () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  // Handle messages from client
  ws.on('message', (msg: string | Buffer) => {
    // Fast path: if single keystroke (not JSON), write directly to SSH stream
    if (typeof msg === 'string') {
      if (msg.charCodeAt(0) === 123 && msg.startsWith('{"type":')) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.type === 'resize' && stream) {
            stream.setWindow(parsed.rows || 24, parsed.cols || 80, 0, 0);
            return;
          }
        } catch {
          // Pass through
        }
      }
      if (stream) stream.write(msg);
    } else {
      // Buffer input
      if (msg.length > 8 && msg[0] === 123) {
        const text = msg.toString('utf-8');
        if (text.startsWith('{"type":')) {
          try {
            const parsed = JSON.parse(text);
            if (parsed.type === 'resize' && stream) {
              stream.setWindow(parsed.rows || 24, parsed.cols || 80, 0, 0);
              return;
            }
          } catch {
            // Pass through
          }
        }
      }
      if (stream) stream.write(msg);
    }
  });

  ws.on('close', () => {
    if (stream) stream.end();
    ssh.end();
  });

  // Initiate connection
  ssh.connect({
    host: opts.host,
    port: opts.port,
    username: opts.username,
    password: opts.password,
    privateKey: opts.privateKey,
    readyTimeout: 15000,
    keepaliveInterval: 5000,
    keepaliveCountMax: 3,
  });
}

function handleMockSSH(ws: WebSocket, host: string, username: string, _cols: number, _rows: number) {
  const hostname = host === 'mock' || host === 'demo' ? 'proxmox-pve-01' : `vm-${host.replace(/[^a-zA-Z0-9]/g, '-')}`;
  let currentPrompt = `${username}@${hostname}:~$ `;
  let inputBuffer = '';

  const sendBanner = () => {
    ws.send(`\x1b[1;32mWelcome to ProxMobile Interactive Web Shell\x1b[0m\r\n`);
    ws.send(`Linux ${hostname} 6.8.12-4-pve #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\r\n`);
    ws.send(`Target: \x1b[36m${username}@${host}\x1b[0m (Simulated PTY Session)\r\n`);
    ws.send(`Type '\x1b[1mhelp\x1b[0m' or standard bash commands to test.\r\n\r\n`);
    ws.send(currentPrompt);
  };

  sendBanner();

  ws.on('message', (data: string | Buffer) => {
    const raw = data.toString();

    // Check for resize command
    if (raw.startsWith('{"type":')) {
      return;
    }

    // Handle single keypresses
    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      const code = char.charCodeAt(0);

      if (code === 13) {
        // Enter key
        ws.send('\r\n');
        const cmd = inputBuffer.trim();
        inputBuffer = '';
        executeMockCommand(ws, cmd, hostname, username);
        ws.send(currentPrompt);
      } else if (code === 127 || code === 8) {
        // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          ws.send('\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        ws.send('^C\r\n');
        inputBuffer = '';
        ws.send(currentPrompt);
      } else if (code === 4) {
        // Ctrl+D
        ws.send('logout\r\n');
        ws.close();
      } else if (code >= 32) {
        // Printable character
        inputBuffer += char;
        ws.send(char);
      }
    }
  });
}

function executeMockCommand(ws: WebSocket, cmd: string, hostname: string, username: string) {
  if (!cmd) return;

  const parts = cmd.split(' ');
  const root = parts[0].toLowerCase();

  switch (root) {
    case 'help':
      ws.send(`Available simulated commands:\r\n`);
      ws.send(`  \x1b[32mhelp\x1b[0m        Show this help list\r\n`);
      ws.send(`  \x1b[32muname -a\x1b[0m    Kernel system architecture\r\n`);
      ws.send(`  \x1b[32mpveversion\x1b[0m  Proxmox VE version\r\n`);
      ws.send(`  \x1b[32mtop / htop\x1b[0m  Process monitor snapshot\r\n`);
      ws.send(`  \x1b[32mfree -h\x1b[0m     Memory status\r\n`);
      ws.send(`  \x1b[32mdf -h\x1b[0m       Disk partition metrics\r\n`);
      ws.send(`  \x1b[32mip a\x1b[0m        Network interfaces\r\n`);
      ws.send(`  \x1b[32mclear\x1b[0m       Clear screen buffer\r\n`);
      ws.send(`  \x1b[32mexit\x1b[0m        Close SSH session\r\n`);
      break;

    case 'uname':
      ws.send(`Linux ${hostname} 6.8.12-4-pve #1 SMP PREEMPT_DYNAMIC Wed Sep 10 14:22:10 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux\r\n`);
      break;

    case 'pveversion':
      ws.send(`pve-manager/8.3.1/6b73a21a (running kernel: 6.8.12-4-pve)\r\n`);
      break;

    case 'free':
      ws.send(`               total        used        free      shared  buff/cache   available\r\n`);
      ws.send(`Mem:            64Gi        27Gi        29Gi       1.2Gi       8.0Gi        35Gi\r\n`);
      ws.send(`Swap:          8.0Gi       240Mi       7.7Gi\r\n`);
      break;

    case 'df':
      ws.send(`Filesystem      Size  Used Avail Use% Mounted on\r\n`);
      ws.send(`udev             32G     0   32G   0% /dev\r\n`);
      ws.send(`tmpfs           6.4G  1.8M  6.4G   1% /run\r\n`);
      ws.send(`/dev/nvme0n1p3  914G  182G  686G  21% /\r\n`);
      ws.send(`/dev/nvme0n1p2  511M  344K  511M   1% /boot/efi\r\n`);
      ws.send(`rpool/data      1.8T  420G  1.4T  24% /var/lib/vz\r\n`);
      break;

    case 'ip':
      ws.send(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\r\n`);
      ws.send(`    inet 127.0.0.1/8 scope host lo\r\n`);
      ws.send(`2: vmbr0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP\r\n`);
      ws.send(`    inet 192.168.1.100/24 scope global vmbr0\r\n`);
      break;

    case 'clear':
      ws.send('\x1b[2J\x1b[H');
      break;

    case 'exit':
    case 'logout':
      ws.send('Connection to remote host closed.\r\n');
      ws.close();
      break;

    case 'whoami':
      ws.send(`${username}\r\n`);
      break;

    case 'uptime':
      ws.send(` 07:42:15 up 14 days, 21:08,  2 users,  load average: 0.42, 0.58, 0.65\r\n`);
      break;

    case 'top':
    case 'htop':
      ws.send(`\x1b[7m top - 07:42:20 up 14 days,  2 users,  load average: 0.42, 0.58, 0.65 \x1b[0m\r\n`);
      ws.send(`Tasks: 340 total,   1 running, 339 sleeping,   0 stopped,   0 zombie\r\n`);
      ws.send(`%Cpu(s):  4.2 us,  1.8 sy,  0.0 ni, 93.8 id,  0.1 wa,  0.0 hi,  0.1 si\r\n`);
      ws.send(`MiB Mem :  64380.2 total,  29810.4 free,  26540.8 used,   8029.0 buff/cache\r\n\r\n`);
      ws.send(`\x1b[1m  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\x1b[0m\r\n`);
      ws.send(` 1402 root      20   0 4820120 4.102g  18420 S  12.4   6.5 142:18.42 kvm -id 100\r\n`);
      ws.send(` 1894 root      20   0 8920400 8.210g  19240 S  18.6  12.8 389:04.10 kvm -id 101\r\n`);
      ws.send(` 2410 root      20   0 1204010 1.204g  14200 S   6.2   1.9  48:19.80 kvm -id 102\r\n`);
      ws.send(`  892 www-data  20   0  145020  28410   8920 S   1.2   0.0   4:10.12 pvedaemon\r\n`);
      break;

    default:
      ws.send(`bash: ${cmd}: command not found. Type 'help' for simulated tools.\r\n`);
      break;
  }
}
