# Tokkatot - Quick Start Guide

## VirtualBox Ubuntu Server Testing

This guide will help you quickly deploy Tokkatot on a VirtualBox Ubuntu Server for testing before deploying to Raspberry Pi.

---

## Quick Setup (5 Minutes)

### 1. Install Ubuntu Server in VirtualBox

**VirtualBox Settings:**
- Memory: 2GB minimum (4GB recommended)
- CPU: 2 cores minimum
- Disk: 20GB minimum
- Network Adapter 1: NAT (for internet)
- Network Adapter 2: Host-only Adapter (for WiFi simulation)

**Ubuntu Server:**
- Download: Ubuntu Server 22.04 LTS
- Install with default options
- Create user account
- Install OpenSSH server when prompted

### 2. Initial Setup

After Ubuntu is installed, log in and run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git
sudo apt install -y git

# Clone repository to /opt/tokkatot
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .

# Make scripts executable
chmod +x scripts/*.sh
```

### 3. Run Complete Deployment

```bash
# Run the master deployment script
sudo bash scripts/deploy-all.sh
```

This will:
- ✅ Set up WiFi Access Point (SSID: `Smart Poultry 1.0.0-0001`)
- ✅ Configure network (10.0.0.1/24)
- ✅ Build and install middleware service
- ✅ Set up GitHub Actions runner
- ✅ Configure all systemd services

**Follow the prompts** and the system will reboot automatically.

---

## Manual Step-by-Step Setup

If you prefer manual control, run scripts individually:

### Step 1: Set Up Access Point

```bash
sudo bash scripts/setup-access-point.sh
```

This configures:
- SSID: `Smart Poultry 1.0.0-0001`
- Password: `skibiditoilet168`
- Server IP: `10.0.0.1`
- ESP32 IP: `10.0.0.2` (reserved)

### Step 2: Set Up Middleware

```bash
sudo bash scripts/setup-middleware-service.sh
```

This:
- Installs Go
- Builds middleware binary
- Creates systemd service
- Starts the service on port 4000

### Step 3: Set Up GitHub Runner (Optional)

```bash
sudo bash scripts/setup-github-runner.sh
```

Follow the prompts to:
1. Get token from GitHub
2. Configure runner
3. Install as service

---

## Testing the Deployment

### 1. Check Services

```bash
# Check all services
sudo systemctl status tokkatot-*

# Check Access Point
sudo systemctl status hostapd
sudo systemctl status dnsmasq

# Check middleware
sudo systemctl status tokkatot-middleware

# View logs
sudo journalctl -u tokkatot-middleware -f
```

### 2. Test Access Point

**From another device (phone/laptop):**

1. Look for WiFi: `Smart Poultry 1.0.0-0001`
2. Connect with password: `skibiditoilet168`
3. Your device should get IP: `10.0.0.X` (10-50 range)
4. Open browser: `http://10.0.0.1:4000`
5. You should see the Tokkatot login page

### 3. Test with ESP32

1. Flash ESP32 with your code
2. Power on ESP32
3. ESP32 should connect to AP automatically
4. ESP32 should get IP: `10.0.0.2`
5. Test from server: `curl http://10.0.0.2/get-initial-state`

---

## VirtualBox-Specific Notes

### WiFi Adapter Setup

Since VirtualBox doesn't have real WiFi, use one of these methods:

**Method 1: USB WiFi Adapter (Recommended)**
1. Plug USB WiFi adapter into host machine
2. Enable USB in VirtualBox settings
3. Attach USB WiFi adapter to VM
4. Run setup scripts

**Method 2: Host-Only Network (Testing)**
1. Use second network adapter as Host-only
2. Configure as `10.0.0.1/24`
3. Test from host machine only

**Method 3: NAT Network (Alternative)**
1. Create NAT Network in VirtualBox
2. Configure IP manually
3. Test from other VMs on same NAT network

### Accessing from Host Machine

If using Host-only adapter:

```bash
# On VirtualBox VM
ip addr show  # Find host-only adapter (e.g., enp0s8)

# Configure host-only adapter
sudo ip addr add 10.0.0.1/24 dev enp0s8
sudo ip link set enp0s8 up
```

Then access from host: `http://10.0.0.1:4000`

---

## Troubleshooting

### Access Point Not Starting

```bash
# Check hostapd logs
sudo journalctl -u hostapd -n 50

# Test configuration
sudo hostapd -dd /etc/hostapd/hostapd.conf

# Check WiFi adapter
ip link show
iwconfig
```

### Middleware Not Starting

```bash
# Check logs
sudo journalctl -u tokkatot-middleware -n 100

# Test manually
cd /opt/tokkatot/middleware
./middleware

# Check port
sudo netstat -tulpn | grep 4000
```

### Cannot Connect to WiFi

```bash
# Check dnsmasq
sudo systemctl status dnsmasq
sudo journalctl -u dnsmasq -n 50

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases

# Restart services
sudo systemctl restart hostapd dnsmasq
```

### Build Errors

```bash
# Update Go
wget https://go.dev/dl/go1.23.6.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.6.linux-amd64.tar.gz

# Clear Go cache
go clean -modcache

# Rebuild
cd /opt/tokkatot/middleware
go mod download
go build -o middleware main.go
```

---

## Production Deployment (Raspberry Pi)

### Transfer to Raspberry Pi

Once tested in VirtualBox:

1. **Flash Raspberry Pi OS** (64-bit recommended)

2. **Clone repository** on Raspberry Pi:
   ```bash
   cd /opt/tokkatot
   git clone https://github.com/somanithpreap/tokkatot.git .
   ```

3. **Run deployment**:
   ```bash
   sudo bash scripts/deploy-all.sh
   ```

4. **Configure for production**:
   ```bash
   # Edit .env file
   sudo nano /opt/tokkatot/middleware/.env
   
   # Change JWT_SECRET to a secure random string
   # Update other production settings
   ```

5. **Enable on boot**:
   ```bash
   sudo systemctl enable tokkatot-middleware
   sudo systemctl enable hostapd
   sudo systemctl enable dnsmasq
   ```

### Raspberry Pi Specific

```bash
# Reduce GPU memory (if headless)
sudo nano /boot/config.txt
# Add: gpu_mem=16

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon

# Enable WiFi power management
sudo nano /etc/network/interfaces
# Add to wlan0: wireless-power off
```

---

## Network Diagram

```
┌─────────────────────────────────────────────┐
│  Ubuntu Server / Raspberry Pi              │
│  IP: 10.0.0.1                              │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ WiFi Access Point                   │  │
│  │ SSID: Smart Poultry 1.0.0-0001     │  │
│  │ Password: skibiditoilet168         │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ DHCP Server (dnsmasq)              │  │
│  │ Range: 10.0.0.10 - 10.0.0.50      │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Middleware (Go)                     │  │
│  │ Port: 4000                          │  │
│  │ Serves: Frontend + API              │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ AI Service (Python Flask)           │  │
│  │ Port: 5000                          │  │
│  │ Model: EfficientNetB0               │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    │ WiFi Connection
                    │
┌───────────────────┴─────────────────────────┐
│                                              │
│  ┌────────────────┐        ┌─────────────┐ │
│  │ ESP32 Device   │        │ Mobile App  │ │
│  │ IP: 10.0.0.2   │        │ IP: 10.0.0.X│ │
│  │ Sensors + IoT  │        │ Web Browser │ │
│  └────────────────┘        └─────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Important Files

| File | Purpose |
|------|---------|
| `/opt/tokkatot/middleware/.env` | Configuration |
| `/opt/tokkatot/middleware/users.db` | User database |
| `/etc/systemd/system/tokkatot-middleware.service` | Service definition |
| `/etc/hostapd/hostapd.conf` | WiFi AP config |
| `/etc/dnsmasq.conf` | DHCP config |
| `/etc/netplan/50-wifi-ap.yaml` | Network config |

---

## Security Checklist

Before production:

- [ ] Change JWT_SECRET in `.env`
- [ ] Change WiFi password
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up automatic backups
- [ ] Enable fail2ban
- [ ] Regular security updates

---

## Support

- **Documentation**: See `DEPLOYMENT.md` for detailed guide
- **Issues**: https://github.com/somanithpreap/tokkatot/issues
- **Scripts**: All setup scripts in `scripts/` directory

---

## Quick Commands Reference

```bash
# Service Management
sudo systemctl status tokkatot-middleware
sudo systemctl restart tokkatot-middleware
sudo systemctl stop tokkatot-middleware
sudo systemctl start tokkatot-middleware

# Logs
sudo journalctl -u tokkatot-middleware -f
sudo journalctl -u hostapd -f
sudo journalctl -u dnsmasq -f

# Network
ip addr show
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
cat /var/lib/misc/dnsmasq.leases

# Application
cd /opt/tokkatot
git pull
cd middleware && go build -o middleware main.go
sudo systemctl restart tokkatot-middleware
```

---

Good luck with your deployment! 🚀🐔
