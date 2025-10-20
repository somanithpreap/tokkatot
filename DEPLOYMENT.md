# Tokkatot - Raspberry Pi / Ubuntu Server Deployment Guide

## Overview
This guide will help you deploy the Tokkatot Smart Poultry System on Ubuntu Server (VirtualBox or Raspberry Pi) as a WiFi Access Point, matching the ESP32 embedded system configuration.

## Network Configuration
- **SSID**: `Smart Poultry 1.0.0-0001`
- **Password**: `skibiditoilet168`
- **Server IP**: `10.0.0.1/24`
- **ESP32 IP**: `10.0.0.2`
- **Gateway**: `10.0.0.1`

## Prerequisites
- Ubuntu Server 20.04 LTS or later
- WiFi adapter that supports AP mode
- Internet connection (for initial setup)
- GitHub account with access to the repository

---

## Step 1: Initial System Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget build-essential net-tools

# Install Go (required for middleware)
wget https://go.dev/dl/go1.23.6.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.6.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify Go installation
go version
```

---

## Step 2: Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot

# Clone repository
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .

# Verify repository structure
ls -la
```

---

## Step 3: Setup WiFi Access Point

### Install Required Packages

```bash
# Install hostapd and dnsmasq
sudo apt install -y hostapd dnsmasq

# Stop services while configuring
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

### Configure Static IP for WiFi Interface

```bash
# Identify your WiFi interface (usually wlan0 or wlp2s0)
ip link show

# Create netplan configuration
sudo nano /etc/netplan/50-wifi-ap.yaml
```

Add the following configuration (replace `wlan0` with your interface name):

```yaml
network:
  version: 2
  renderer: networkd
  wifis:
    wlan0:
      dhcp4: no
      addresses:
        - 10.0.0.1/24
      # Comment out the gateway for AP mode
      # gateway4: 10.0.0.1
```

Apply the configuration:

```bash
sudo netplan apply
```

### Configure hostapd (Access Point)

```bash
# Create hostapd configuration
sudo nano /etc/hostapd/hostapd.conf
```

Add the following configuration:

```conf
# Interface configuration
interface=wlan0
driver=nl80211

# Network configuration
ssid=Smart Poultry 1.0.0-0001
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0

# Security configuration
wpa=2
wpa_passphrase=skibiditoilet168
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

# Country code (change based on your location)
country_code=KH
ieee80211n=1
ieee80211d=1
```

Configure hostapd to use this config:

```bash
# Set hostapd configuration path
sudo nano /etc/default/hostapd
```

Add/modify:
```
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

### Configure dnsmasq (DHCP Server)

```bash
# Backup original configuration
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create new configuration
sudo nano /etc/dnsmasq.conf
```

Add the following:

```conf
# Interface to bind to
interface=wlan0

# DHCP range
dhcp-range=10.0.0.10,10.0.0.50,255.255.255.0,24h

# DNS servers (Google DNS)
dhcp-option=6,8.8.8.8,8.8.4.4

# Gateway
dhcp-option=3,10.0.0.1

# Domain
domain=tokkatot.local

# Log DHCP requests
log-dhcp

# Reserve IP for ESP32
dhcp-host=10.0.0.2
```

### Enable IP Forwarding (Optional - for internet sharing)

```bash
# Enable IP forwarding
sudo nano /etc/sysctl.conf
```

Uncomment:
```
net.ipv4.ip_forward=1
```

Apply:
```bash
sudo sysctl -p
```

### Configure Firewall (Optional - for internet sharing)

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Enable NAT (if you want to share internet from eth0 to wlan0)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT

# Save iptables rules
sudo netfilter-persistent save
```

### Enable and Start Services

```bash
# Unmask and enable hostapd
sudo systemctl unmask hostapd
sudo systemctl enable hostapd

# Enable dnsmasq
sudo systemctl enable dnsmasq

# Start services
sudo systemctl start hostapd
sudo systemctl start dnsmasq

# Check status
sudo systemctl status hostapd
sudo systemctl status dnsmasq
```

---

## Step 4: Build and Configure Middleware

```bash
cd /opt/tokkatot/middleware

# Create .env file
nano .env
```

Add configuration:

```env
# Server Configuration
PORT=4000
FRONTEND_PATH=/opt/tokkatot/frontend

# Database Configuration
DATABASE_PATH=/opt/tokkatot/middleware/users.db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# IoT Device Configuration
IOT_DEVICE_URL=http://10.0.0.2
ENCRYPTION_KEY=6c23544e3b7c564c57417c6e62645e6f

# AI Service Configuration
AI_SERVICE_URL=http://127.0.0.1:5000

# Environment
ENVIRONMENT=production
```

Build the middleware:

```bash
# Download dependencies
go mod download

# Build the binary
go build -o middleware main.go

# Set executable permissions
chmod +x middleware

# Test the binary
./middleware
```

Press `Ctrl+C` to stop after verifying it runs.

---

## Step 5: Create Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/tokkatot-middleware.service
```

Add the following content:

```ini
[Unit]
Description=Tokkatot Smart Poultry Middleware Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/tokkatot/middleware
ExecStart=/opt/tokkatot/middleware/middleware
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tokkatot-middleware

# Environment
Environment="PATH=/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/tokkatot/middleware

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable tokkatot-middleware.service

# Start the service
sudo systemctl start tokkatot-middleware.service

# Check status
sudo systemctl status tokkatot-middleware.service

# View logs
sudo journalctl -u tokkatot-middleware.service -f
```

---

## Step 6: Setup AI Service (Optional)

```bash
cd /opt/tokkatot/ai-service

# Install Python and pip
sudo apt install -y python3 python3-pip python3-venv

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create systemd service for AI service
sudo nano /etc/systemd/system/tokkatot-ai.service
```

Add:

```ini
[Unit]
Description=Tokkatot AI Disease Detection Service
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/tokkatot/ai-service
Environment="PATH=/opt/tokkatot/ai-service/venv/bin"
ExecStart=/opt/tokkatot/ai-service/venv/bin/python app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tokkatot-ai.service
sudo systemctl start tokkatot-ai.service
sudo systemctl status tokkatot-ai.service
```

---

## Step 7: Setup GitHub Actions Runner

```bash
# Create runner directory
mkdir -p /opt/tokkatot/actions-runner
cd /opt/tokkatot/actions-runner

# Download the latest runner (check GitHub for latest version)
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Create configuration script
cat > configure-runner.sh << 'EOF'
#!/bin/bash

echo "============================================"
echo "GitHub Actions Runner Configuration"
echo "============================================"
echo ""
echo "Go to: https://github.com/somanithpreap/tokkatot/settings/actions/runners/new"
echo ""
echo "Copy the token from GitHub and paste it below:"
echo ""
read -p "Enter GitHub token: " GITHUB_TOKEN
read -p "Enter runner name (default: tokkatot-ubuntu): " RUNNER_NAME
RUNNER_NAME=${RUNNER_NAME:-tokkatot-ubuntu}

./config.sh --url https://github.com/somanithpreap/tokkatot --token $GITHUB_TOKEN --name $RUNNER_NAME --labels ubuntu,self-hosted,tokkatot

echo ""
echo "Configuration complete!"
EOF

chmod +x configure-runner.sh

# Run configuration
./configure-runner.sh
```

Create systemd service for the runner:

```bash
# Install as service
sudo ./svc.sh install

# Start service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

---

## Step 8: Configure Firewall

```bash
# Install UFW (Uncomplicated Firewall)
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow middleware
sudo ufw allow 4000/tcp

# Allow AI service
sudo ufw allow 5000/tcp

# Allow ESP32 communication
sudo ufw allow from 10.0.0.2

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 9: Testing

### Test Access Point

```bash
# Check if AP is running
sudo systemctl status hostapd

# Check WiFi networks (from another device)
# You should see "Smart Poultry 1.0.0-0001"

# Connect and verify IP
# Server should be accessible at: http://10.0.0.1:4000
```

### Test Middleware

```bash
# Check if service is running
sudo systemctl status tokkatot-middleware

# Test API endpoint
curl http://10.0.0.1:4000/health

# View logs
sudo journalctl -u tokkatot-middleware -f
```

### Test from Mobile Device

1. Connect your phone to WiFi: `Smart Poultry 1.0.0-0001`
2. Enter password: `skibiditoilet168`
3. Open browser and go to: `http://10.0.0.1:4000`
4. You should see the Tokkatot login page

---

## Step 10: Monitoring and Maintenance

### View Service Logs

```bash
# Middleware logs
sudo journalctl -u tokkatot-middleware -f

# AI service logs
sudo journalctl -u tokkatot-ai -f

# Access point logs
sudo journalctl -u hostapd -f

# DHCP logs
sudo journalctl -u dnsmasq -f
```

### Restart Services

```bash
# Restart middleware
sudo systemctl restart tokkatot-middleware

# Restart access point
sudo systemctl restart hostapd

# Restart DHCP
sudo systemctl restart dnsmasq
```

### Update Application

```bash
cd /opt/tokkatot

# Pull latest changes
git pull origin main

# Rebuild middleware
cd middleware
go build -o middleware main.go

# Restart service
sudo systemctl restart tokkatot-middleware
```

---

## Troubleshooting

### Access Point Not Showing

```bash
# Check WiFi interface
ip link show

# Check hostapd status
sudo systemctl status hostapd
sudo journalctl -u hostapd -n 50

# Test hostapd configuration
sudo hostapd -dd /etc/hostapd/hostapd.conf
```

### Cannot Connect to WiFi

```bash
# Check dnsmasq
sudo systemctl status dnsmasq
sudo journalctl -u dnsmasq -n 50

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases
```

### Middleware Not Starting

```bash
# Check service status
sudo systemctl status tokkatot-middleware

# View detailed logs
sudo journalctl -u tokkatot-middleware -n 100 --no-pager

# Check port availability
sudo netstat -tulpn | grep 4000

# Test manually
cd /opt/tokkatot/middleware
./middleware
```

### ESP32 Cannot Connect

```bash
# Check if ESP32 IP is reachable
ping 10.0.0.2

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases

# Check firewall
sudo ufw status

# Test ESP32 endpoint
curl http://10.0.0.2/get-initial-state
```

---

## Security Recommendations

1. **Change Default Passwords**
   - Update WiFi password in `/etc/hostapd/hostapd.conf`
   - Update JWT secret in `.env`
   - Update ESP32 password and recompile firmware

2. **Enable HTTPS**
   - Generate SSL certificates
   - Configure middleware to use HTTPS
   - Update ESP32 to use HTTPS

3. **Firewall Configuration**
   - Only allow necessary ports
   - Restrict access to specific IPs

4. **Regular Updates**
   - Keep system packages updated
   - Update application dependencies
   - Monitor security advisories

---

## Performance Optimization

### For Raspberry Pi

```bash
# Reduce GPU memory (if no display)
sudo nano /boot/config.txt
# Add: gpu_mem=16

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Enable swap (if needed)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Set CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

---

## Backup and Recovery

### Backup Script

```bash
# Create backup script
sudo nano /opt/tokkatot/backup.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/opt/tokkatot/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp /opt/tokkatot/middleware/users.db $BACKUP_DIR/users_$DATE.db

# Backup configuration
cp /opt/tokkatot/middleware/.env $BACKUP_DIR/env_$DATE

echo "Backup completed: $DATE"
```

```bash
chmod +x /opt/tokkatot/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/tokkatot/backup.sh") | crontab -
```

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/somanithpreap/tokkatot/issues
- Documentation: https://github.com/somanithpreap/tokkatot

---

## License

See LICENSE file in the repository.
