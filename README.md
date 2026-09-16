# ProxMobile - Mobile-Friendly Proxmox VE Remote Web Client

A modern, high-density, mobile-first web client for Proxmox VE with in-browser low-latency SSH terminal, multi-realm authentication, QEMU/LXC management, and 4 curated anti-slop visual themes.

---

## 🚀 Quick Start with Docker Compose

Deploy the complete application in a single unified container with one command:

```bash
# 1. Clone repository & navigate to folder
cd webProxmox

# 2. (Optional) Create .env from example
cp .env.example .env

# 3. Start container in detached mode
docker compose up -d
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## ⚙️ Docker Configuration (`docker-compose.yml`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Host port where the web UI & SSH proxy is exposed |
| `NODE_ENV` | `production` | Production runtime mode |
| `PROXMOX_DEFAULT_HOST` | *(empty)* | Optional default Proxmox host to pre-fill |
| `PROXMOX_DEFAULT_REALM` | `pam` | Default realm (`pam`, `pve`, `ldap`, `openid`) |

To run on a custom port (e.g., port `8080`):
```bash
PORT=8080 docker compose up -d
```

To stop the container:
```bash
docker compose down
```

To view real-time logs:
```bash
docker compose logs -f
```

---

## 💻 Local Development (Without Docker)

```bash
# Install root dependencies
npm install

# Run backend (port 3001) & Vite frontend (port 5173) concurrently
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend REST & WebSocket SSH: `http://localhost:3001`

---

## ✨ Features
- **In-Browser Interactive SSH**: Direct VM SSH or Proxmox Host Console mode (`qm terminal`) with zero IP configuration required.
- **Mobile Virtual Accessory Bar**: `ESC`, `TAB`, `CTRL`, `ALT`, `^C`, `^D`, Arrow Keys, and Clear screen.
- **Multi-Realm Authentication**: Linux PAM (`pam`), Proxmox VE (`pve`), LDAP/Active Directory, and OpenID Connect.
- **4 Distinct Anti-Slop Themes**: Dark Mode, Light Mode, Neobrutalism, Minimalist Black & White.
- **100% Pure SVG Iconography**: Zero emojis/stickers, consistent `lucide-react` stroke widths.
