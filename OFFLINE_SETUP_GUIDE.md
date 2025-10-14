# Tokkatot Smart Poultry System - Offline Setup Guide

## Overview
This guide helps you set up the Tokkatot Smart Poultry System for complete offline operation on a Raspberry Pi with local WiFi access point for farm workers' mobile devices.

## Prerequisites
- Raspberry Pi 4 (recommended) or Raspberry Pi 3B+
- MicroSD card (32GB+ recommended)
- WiFi dongle (if using Pi 3B+) or built-in WiFi (Pi 4)
- Internet connection for initial setup only

## Offline Dependencies Setup

### 1. Font Awesome Icons
Download the following Font Awesome files and place them in `frontend/assets/fonts/`:

**Required Files:**
- `fa-solid-900.woff2` - Solid icons (WOFF2 format)
- `fa-solid-900.woff` - Solid icons (WOFF fallback)
- `fa-regular-400.woff2` - Regular icons (WOFF2 format)
- `fa-regular-400.woff` - Regular icons (WOFF fallback)

**Download Sources:**
- Official: https://fontawesome.com/download
- CDN direct: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/

**Commands:**
```bash
cd frontend/assets/fonts/
wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff2
wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff
wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-regular-400.woff2
wget https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-regular-400.woff
```

### 2. Orbitron Font (for 404 page)
Download Orbitron font files and place them in `frontend/assets/fonts/`:

**Required Files:**
- `orbitron-regular.woff2`
- `orbitron-regular.woff`
- `orbitron-bold.woff2` (optional)
- `orbitron-bold.woff` (optional)

**Download Sources:**
- Google Fonts: https://fonts.google.com/specimen/Orbitron
- Direct: https://fonts.gstatic.com/s/orbitron/

**Commands:**
```bash
cd frontend/assets/fonts/
# Download from Google Fonts helper or use font conversion tools
# Example URLs (check current Google Fonts CDN):
wget "https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff2" -O orbitron-regular.woff2
```

### 3. Background Patterns (Optional)
If the 404 page uses background patterns, download them to `frontend/assets/images/patterns/`:

```bash
mkdir -p frontend/assets/images/patterns/
# Add any background pattern images here
```

## Raspberry Pi Setup

### 1. Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Go (for middleware)
wget https://go.dev/dl/go1.21.3.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go1.21.3.linux-arm64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Python (for AI service)
sudo apt install python3 python3-pip python3-venv -y

# Install Node.js (if needed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install nodejs -y

# Install nginx for web server
sudo apt install nginx -y
```

### 2. Configure WiFi Access Point
```bash
# Install hostapd and dnsmasq
sudo apt install hostapd dnsmasq -y

# Configure hostapd
sudo tee /etc/hostapd/hostapd.conf > /dev/null << EOF
interface=wlan0
driver=nl80211
ssid=Tokkatot-Farm
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=tokkatot2024
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
EOF

# Configure dnsmasq
sudo tee -a /etc/dnsmasq.conf > /dev/null << EOF
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
EOF

# Configure static IP
sudo tee -a /etc/dhcpcd.conf > /dev/null << EOF
interface wlan0
static ip_address=192.168.4.1/24
nohook wpa_supplicant
EOF

# Enable services
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
```

### 3. Configure Nginx for Local Hosting
```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/tokkatot > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /home/pi/tokkatot/frontend;
    index index.html;
    
    server_name _;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/css application/javascript text/javascript application/json;
    
    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main application
    location / {
        try_files \$uri \$uri/ /pages/index.html;
    }
    
    # API proxy to middleware
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # AI service proxy
    location /ai/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/tokkatot /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Deployment Steps

### 1. Copy Project Files
```bash
# Create project directory
mkdir -p /home/pi/tokkatot
cd /home/pi/tokkatot

# Copy all project files
# (Use scp, rsync, or USB transfer)
```

### 2. Setup AI Service
```bash
cd /home/pi/tokkatot/ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create systemd service
sudo tee /etc/systemd/system/tokkatot-ai.service > /dev/null << EOF
[Unit]
Description=Tokkatot AI Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/tokkatot/ai-service
Environment=PATH=/home/pi/tokkatot/ai-service/venv/bin
ExecStart=/home/pi/tokkatot/ai-service/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable tokkatot-ai
sudo systemctl start tokkatot-ai
```

### 3. Setup Middleware
```bash
cd /home/pi/tokkatot/middleware
go mod tidy
go build -o tokkatot-middleware main.go

# Create systemd service
sudo tee /etc/systemd/system/tokkatot-middleware.service > /dev/null << EOF
[Unit]
Description=Tokkatot Middleware
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/tokkatot/middleware
ExecStart=/home/pi/tokkatot/middleware/tokkatot-middleware
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable tokkatot-middleware
sudo systemctl start tokkatot-middleware
```

## Testing Offline Functionality

### 1. Test PWA Installation
1. Connect mobile device to `Tokkatot-Farm` WiFi
2. Password: `tokkatot2024`
3. Open browser and navigate to `192.168.4.1`
4. Look for "Add to Home Screen" option
5. Install the PWA

### 2. Test Offline Caching
1. Load the application with internet enabled
2. Disconnect from internet
3. Refresh page - should load from cache
4. Navigate between pages - should work offline

### 3. Test Service Worker
1. Open browser developer tools
2. Go to Application > Service Workers
3. Verify "tokkatot-v1.0.0" is registered and active
4. Check Cache Storage for cached resources

### 4. Test Local Network Access
```bash
# Check services status
sudo systemctl status tokkatot-ai
sudo systemctl status tokkatot-middleware
sudo systemctl status nginx
sudo systemctl status hostapd
sudo systemctl status dnsmasq

# Check ports
sudo netstat -tlnp | grep :80    # Nginx
sudo netstat -tlnp | grep :8080  # Middleware
sudo netstat -tlnp | grep :5000  # AI Service
```

## Troubleshooting

### Common Issues

1. **Font icons not displaying:**
   - Verify font files are in `frontend/assets/fonts/`
   - Check file permissions: `chmod 644 frontend/assets/fonts/*`
   - Clear browser cache

2. **PWA not installing:**
   - Ensure HTTPS or localhost
   - Check manifest.json is accessible
   - Verify service worker registration

3. **WiFi Access Point not working:**
   - Check hostapd status: `sudo systemctl status hostapd`
   - Verify wlan0 interface: `iwconfig`
   - Check iptables rules for internet sharing

4. **Services not starting:**
   - Check logs: `sudo journalctl -u service-name -f`
   - Verify file permissions and paths
   - Check port conflicts

### Performance Optimization

1. **Enable swap (if needed):**
```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

2. **GPU memory split:**
```bash
sudo raspi-config
# Advanced Options > Memory Split > Set to 64
```

3. **CPU governor:**
```bash
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Security Considerations

1. **Change default passwords:**
   - WiFi password in hostapd configuration
   - System user passwords
   - Database passwords

2. **Firewall configuration:**
```bash
sudo ufw enable
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 5000/tcp
sudo ufw allow ssh
```

3. **Regular updates:**
```bash
# Create update script
sudo tee /home/pi/update-tokkatot.sh > /dev/null << EOF
#!/bin/bash
cd /home/pi/tokkatot
git pull
sudo systemctl restart tokkatot-ai
sudo systemctl restart tokkatot-middleware
sudo systemctl reload nginx
EOF

chmod +x /home/pi/update-tokkatot.sh
```

## Access Information

- **WiFi Network:** Tokkatot-Farm
- **WiFi Password:** tokkatot2024
- **Web Interface:** http://192.168.4.1
- **IP Range:** 192.168.4.2 - 192.168.4.20

## Support

For technical support or issues:
1. Check service logs: `sudo journalctl -u service-name`
2. Verify network connectivity: `ping 192.168.4.1`
3. Test individual components separately
4. Check file permissions and ownership

Remember: This system is designed for complete offline operation once setup is complete!