# BankFlow — Next.js App

> Kotak Mahindra Bank Statement → Excel converter  
> Built with Next.js 14 + Tailwind CSS + n8n webhook

---

## 📁 Project Structure

```
bankflow/
├── pages/
│   ├── _app.tsx          # Global styles wrapper
│   ├── _document.tsx     # HTML head + anti-flicker theme script
│   ├── index.tsx         # Main UI (drag & drop, dark/light, stats)
│   └── api/
│       ├── convert.ts    # POST /api/convert — proxies to n8n
│       └── health.ts     # GET  /api/health  — status check
├── styles/
│   └── globals.css       # CSS variables, Tailwind, custom styles
├── .env.local            # N8N_WEBHOOK env var (edit this!)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── Caddyfile             # Caddy reverse proxy config
├── bankflow.service      # systemd service file
└── package.json
```

---

## 🚀 Deployment on Contabo (Node.js + Caddy)

### 1. Upload to server

```bash
# On your local machine — upload the project
scp -r bankflow/ user@YOUR_CONTABO_IP:/var/www/bankflow
```

### 2. Install & Build

```bash
cd /var/www/bankflow

# Install dependencies
npm install

# Set your webhook URL
nano .env.local
# Change: N8N_WEBHOOK=https://n8n.navbharatwater.one/webhook/bank

# Build the Next.js app (required for production)
npm run build
```

### 3. Test it works

```bash
npm start
# → App running at http://localhost:3000
```

Open `http://YOUR_CONTABO_IP:3000` to verify.

### 4. Set up systemd (keeps it alive)

```bash
# Edit the service file — update WorkingDirectory if needed
nano bankflow.service

# Install
sudo cp bankflow.service /etc/systemd/system/bankflow.service
sudo systemctl daemon-reload
sudo systemctl enable bankflow
sudo systemctl start bankflow

# Check
sudo systemctl status bankflow
sudo journalctl -u bankflow -f
```

### 5. Configure Caddy

```bash
# Edit domain in Caddyfile
nano Caddyfile
# Change: bank.yourdomain.com → e.g. bank.navbharatwater.one

# Add to your existing Caddyfile
sudo nano /etc/caddy/Caddyfile
# Paste the contents of Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

### 6. DNS

Add an **A record**:
```
bank.navbharatwater.one  →  YOUR_CONTABO_IP
```

Caddy auto-provisions SSL via Let's Encrypt once DNS propagates.

---

## ⚙️ Environment Variables

| Variable        | Default                                              | Description         |
|-----------------|------------------------------------------------------|---------------------|
| `N8N_WEBHOOK`   | `https://n8n.navbharatwater.one/webhook/bank`        | n8n webhook URL     |
| `MAX_FILE_SIZE` | `52428800` (50MB)                                    | Max upload size     |
| `PORT`          | `3000`                                               | Server port         |

Edit `.env.local` for development, or set in `bankflow.service` for production.

---

## 🔄 Data Flow

```
Browser uploads PDF/TXT
        ↓
Next.js API route /api/convert
        ↓
POST multipart → n8n webhook (field: bank_statement)
        ↓
n8n: Edit Fields → LLMWhisperer (OCR) → Code Node (parse + xlsx)
        ↓
n8n responds: JSON { binary: { data: { data: '<base64>' } }, json: { stats } }
        ↓
API decodes base64 → sends .xlsx binary + X-Stats header
        ↓
Browser receives blob → auto-download + shows stats
```

---

## 🛠️ Development

```bash
# Run locally
npm run dev
# → http://localhost:3000 (hot reload)
```

---

## 🔧 Updating

```bash
# Upload new files
scp -r bankflow/ user@YOUR_IP:/var/www/bankflow

# Rebuild & restart
cd /var/www/bankflow
npm install
npm run build
sudo systemctl restart bankflow
```

---

## 🐛 Troubleshooting

**App won't start:**
```bash
sudo journalctl -u bankflow -n 50 --no-pager
```

**n8n not responding:**
```bash
curl -X POST https://n8n.navbharatwater.one/webhook/bank \
  -F "bank_statement=@test.pdf" -v
```

**Build fails:**
```bash
npm run build 2>&1 | tail -30
```

**Caddy issues:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo journalctl -u caddy -n 30
```
