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

```bash
cd ~
git clone git@github.com:sebmolinari/finny.git finny
cd finny
```

## Configure the backend

Create the backend environment file and install dependencies.

```bash
cd ~/finny/backend
npm install --production
```

Create .env with required variables

```bash
cp .env.example .env
```

## Build the frontend

```bash
cd ~/finny/frontend
npm install
npm run build
```

## Secure files:

```sh
chmod 600 ~/finny/backend/.env
chmod 600 ~/finny/backend/database.db*
```
