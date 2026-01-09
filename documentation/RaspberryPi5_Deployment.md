# Raspberry Pi 5 Deployment Guide

This guide explains how to deploy the Finny Portfolio Manager on a Raspberry Pi 5 and access it from your local network.

## Prerequisites (on Raspberry Pi 5)

- Raspberry Pi OS (64‑bit recommended)
- Node.js 20 LTS and npm
- `git`

### Install core tools

```bash
# Update OS
sudo apt update && sudo apt -y upgrade

# Install Node.js 20 LTS and git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Verify
node --version
npm --version
```

## Transfer the project to Raspberry Pi

The recommended way is to clone the repository directly from GitHub using SSH or HTTPS:

```bash
cd ~
git clone git@github.com:sebmolinari/finny.git finny
cd finny
```

If you ever need to update, just run:

```bash
cd ~/finny
git pull
```

## Configure the backend

Create the backend environment file and install dependencies.

````bash
cd ~/finny/backend
npm install --production

# Create .env with required variables
cp .env.example .env
# Edit .env with your configuration:
# - PORT, NODE_ENV, DATABASE_PATH
# - JWT_SECRET (min 32 characters)
# - CORS_ORIGIN
# - RATE_LIMIT settings
# - EMAIL_* settings (optional, for email notifications)

## Build the frontend

In production, the backend serves the React build from `frontend/build`.

```bash
cd ~/finny/frontend
npm install
npm run build
```

## Run the app

### Quick run (for testing)

```bash
# From the backend folder
cd ~/finny/backend
node server.js
# Access from your LAN: http://<raspberry-pi-ip>
# Health: http://<raspberry-pi-ip>/api/v1/health
```

### Systemd Service Setup (Production)

To run the backend as a persistent service that starts on boot, use systemd:

#### 1. Create the service file

```bash
sudo tee /etc/systemd/system/finny-backend.service > /dev/null << 'EOF'
[Unit]
Description=Finny Backend API
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/finny/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/home/pi/finny/backend/.env

[Install]
WantedBy=multi-user.target
EOF
```

#### 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable finny-backend
sudo systemctl start finny-backend
```

#### 3. Check service status and logs

```bash
sudo systemctl status finny-backend
sudo journalctl -u finny-backend -n 100 -f
```

## Maintenance

```bash
# Update app
cd ~/finny
# If using git
git pull
cd backend && npm install --production
cd ../frontend && npm run build
sudo systemctl restart finny-backend

# Backup database
cp ~/finny/backend/database.db ~/finny-backup-$(date +%Y%m%d).db
```
````
