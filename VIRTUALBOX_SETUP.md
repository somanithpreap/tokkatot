# Tokkatot VirtualBox Ubuntu Server Setup - Complete Guide

This guide provides a step-by-step walkthrough for testing your Tokkatot Smart Poultry System in VirtualBox before deploying to Raspberry Pi.

---

## 🎯 Overview

You will:
1. Set up Ubuntu Server in VirtualBox
2. Configure it as WiFi Access Point (SSID: `Smart Poultry 1.0.0-0001`)
3. Deploy Go middleware service
4. Set up GitHub Actions runner
5. Test with ESP32 device

**Network Configuration:**
- Server IP: `10.0.0.1/24`
- ESP32 IP: `10.0.0.2` (static)
- DHCP Range: `10.0.0.10-50`
- SSID: `Smart Poultry 1.0.0-0001`
- Password: `skibiditoilet168`

---

## 📋 Prerequisites

### Software Needed
- VirtualBox 7.0+ ([Download](https://www.virtualbox.org/))
- Ubuntu Server 22.04 LTS ISO ([Download](https://ubuntu.com/download/server))
- USB WiFi Adapter (optional but recommended)

### Hardware
- Host PC with at least 8GB RAM
- USB WiFi adapter with AP mode support (recommended)

---

## 🖥️ Part 1: VirtualBox Setup

### Step 1: Create Virtual Machine

1. **Open VirtualBox**, click **New**

2. **Configure VM:**
   ```
   Name: Tokkatot-Ubuntu-Server
   Type: Linux
   Version: Ubuntu (64-bit)
   ```

3. **Hardware:**
   ```
   Memory: 4096 MB (4GB)
   Processors: 2 CPUs
   ```

4. **Hard Disk:**
   ```
   Create a virtual hard disk now
   Type: VDI (VirtualBox Disk Image)
   Storage: Dynamically allocated
   Size: 25 GB
   ```

5. **Click Create**

### Step 2: Configure VM Settings

1. **Right-click VM** → **Settings**

2. **System Tab:**
   - Boot Order: Hard Disk, Optical
   - Enable EFI: ✅ (optional)

3. **Network Tab:**
   - **Adapter 1:**
     ```
     Enable Network Adapter: ✅
     Attached to: NAT
     ```
   - **Adapter 2:**
     ```
     Enable Network Adapter: ✅
     Attached to: Host-only Adapter
     Name: VirtualBox Host-Only Ethernet Adapter
     ```

4. **USB Tab:**
   ```
   Enable USB Controller: ✅
   USB 2.0 (EHCI) Controller: ✅
   ```
   Add USB Filter for WiFi adapter (after plugging it in)

5. **Click OK**

### Step 3: Install Ubuntu Server

1. **Select VM** → **Start**

2. **Select Ubuntu Server ISO** when prompted

3. **Follow installer:**
   ```
   Language: English
   Keyboard: English (US)
   Network: Keep default (DHCP)
   Proxy: Leave empty
   Mirror: Keep default
   Storage: Use entire disk
   Profile:
     Name: tokkatot
     Server name: tokkatot-server
     Username: tokkatot
     Password: [your-password]
   SSH Setup: Install OpenSSH server ✅
   Featured snaps: None (skip)
   ```

4. **Wait for installation** (5-10 minutes)

5. **Reboot when prompted**

6. **Login with your credentials**

---

## 🔧 Part 2: Initial Server Setup

### Step 1: SSH Access (Optional but Recommended)

From your host machine:

```bash
# Find VM IP
# In VM terminal:
ip addr show enp0s3  # NAT interface

# From host, SSH into VM:
ssh tokkatot@<VM-IP>
```

### Step 2: Update System

```bash
# Update package lists
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential tools
sudo apt install -y git curl wget vim net-tools
```

### Step 3: Attach USB WiFi Adapter (If Using)

1. **Plug USB WiFi adapter** into host PC

2. **In VirtualBox:**
   - VM → Devices → USB → Select your WiFi adapter

3. **Verify in VM:**
   ```bash
   # Check if WiFi adapter is detected
   ip link show
   iwconfig
   
   # You should see wlan0 or similar
   ```

---

## 🚀 Part 3: Deploy Tokkatot

### Method A: Automated Deployment (Recommended)

```bash
# Create directory
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot

# Clone repository
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .

# Make scripts executable
chmod +x scripts/*.sh

# Run complete deployment
sudo bash scripts/deploy-all.sh
```

**The script will:**
- ✅ Set up WiFi Access Point
- ✅ Configure network (10.0.0.1/24)
- ✅ Build Go middleware
- ✅ Create systemd services
- ✅ Set up GitHub Actions runner (optional)
- ✅ Reboot system

**Follow the prompts** and wait for reboot.

---

### Method B: Manual Step-by-Step

If you prefer manual control:

#### Step 1: Clone Repository

```bash
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .
chmod +x scripts/*.sh
```

#### Step 2: Set Up Access Point

```bash
sudo bash scripts/setup-access-point.sh
```

This configures:
- WiFi AP with SSID: `Smart Poultry 1.0.0-0001`
- Password: `skibiditoilet168`
- Server IP: `10.0.0.1/24`

#### Step 3: Build Middleware

```bash
sudo bash scripts/setup-middleware-service.sh
```

This:
- Installs Go 1.23.6
- Builds middleware binary
- Creates systemd service
- Starts on port 4000

#### Step 4: Setup GitHub Runner (Optional)

```bash
sudo bash scripts/setup-github-runner.sh
```

You'll need a token from:
`https://github.com/somanithpreap/tokkatot/settings/actions/runners/new`

#### Step 5: Reboot

```bash
sudo reboot
```

---

## ✅ Part 4: Verification

### After Reboot

#### Check Services

```bash
# Log back in
ssh tokkatot@<VM-IP>

# Run verification script
sudo bash /opt/tokkatot/scripts/verify-system.sh
```

Expected output:
```
✓ Access Point: Running
✓ Middleware: Running
✓ Server IP configured: 10.0.0.1/24
✓ Port 4000 (Middleware): Open
```

#### Manual Checks

```bash
# Check all services
sudo systemctl status tokkatot-middleware
sudo systemctl status hostapd
sudo systemctl status dnsmasq

# Check if AP is broadcasting
sudo iwconfig

# Check network configuration
ip addr show

# Test middleware
curl http://10.0.0.1:4000
curl http://localhost:4000
```

---

## 📱 Part 5: Connect from Phone/Device

### Step 1: Find WiFi Network

On your phone or laptop:
1. Open WiFi settings
2. Look for: **`Smart Poultry 1.0.0-0001`**
3. Connect using password: **`skibiditoilet168`**

### Step 2: Get IP Address

Your device should automatically get an IP like `10.0.0.15`

### Step 3: Access Web App

Open browser and go to:
```
http://10.0.0.1:4000
```

You should see the **Tokkatot login page**!

### Step 4: Test Registration/Login

1. Click **Sign Up**
2. Create an account
3. Log in
4. Explore the dashboard

---

## 🔌 Part 6: Connect ESP32

### Step 1: Flash ESP32

Your ESP32 code is already configured with:
```cpp
const char* ssid = "Smart Poultry 1.0.0-0001";
const char* password = "skibiditoilet168";
IPAddress local_ip(10, 0, 0, 2);
IPAddress gateway(10, 0, 0, 1);
```

**Flash the ESP32** with your code.

### Step 2: Power On ESP32

The ESP32 will:
1. Connect to the AP
2. Get IP `10.0.0.2`
3. Start HTTP server on port 80

### Step 3: Verify Connection

From Ubuntu Server:

```bash
# Ping ESP32
ping 10.0.0.2

# Test HTTP endpoint
curl http://10.0.0.2/get-initial-state

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases
```

### Step 4: Test Integration

From your phone browser:
1. Go to Settings page
2. Try toggling devices
3. Check if ESP32 responds

---

## 🔍 Part 7: Monitoring and Logs

### View Real-Time Logs

```bash
# Middleware logs
sudo journalctl -u tokkatot-middleware -f

# Access Point logs
sudo journalctl -u hostapd -f

# DHCP logs
sudo journalctl -u dnsmasq -f

# All errors
sudo journalctl -p err -f
```

### Check System Status

```bash
# All Tokkatot services
sudo systemctl status tokkatot-*

# Network status
ip addr show
iwconfig

# Connected devices
cat /var/lib/misc/dnsmasq.leases

# Port usage
sudo netstat -tulpn | grep -E '4000|5000|80'
```

---

## 🐛 Troubleshooting

### Access Point Not Visible

```bash
# Check hostapd
sudo systemctl status hostapd
sudo journalctl -u hostapd -n 50

# Check WiFi interface
ip link show
iwconfig

# Restart services
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
```

### Cannot Connect to WiFi

```bash
# Check dnsmasq
sudo systemctl status dnsmasq
sudo journalctl -u dnsmasq -n 50

# Check configuration
cat /etc/hostapd/hostapd.conf | grep ssid
cat /etc/dnsmasq.conf | grep dhcp-range

# Restart DHCP
sudo systemctl restart dnsmasq
```

### Middleware Not Working

```bash
# Check service
sudo systemctl status tokkatot-middleware

# View logs
sudo journalctl -u tokkatot-middleware -n 100

# Test manually
cd /opt/tokkatot/middleware
./middleware

# Check port
sudo netstat -tulpn | grep 4000

# Rebuild if needed
go build -o middleware main.go
sudo systemctl restart tokkatot-middleware
```

### ESP32 Not Connecting

```bash
# Check if ESP32 is reachable
ping 10.0.0.2

# Check DHCP leases
cat /var/lib/misc/dnsmasq.leases

# Test ESP32 endpoint
curl http://10.0.0.2/get-initial-state

# Check firewall
sudo ufw status
sudo ufw allow from 10.0.0.2
```

### Page Not Loading

```bash
# Check middleware is running
curl http://localhost:4000
curl http://10.0.0.1:4000

# Check from connected device
# On phone, open: http://10.0.0.1:4000

# Check logs
sudo journalctl -u tokkatot-middleware -f
```

---

## 🔄 Common Tasks

### Restart All Services

```bash
sudo systemctl restart tokkatot-middleware
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
```

### Update Application

```bash
cd /opt/tokkatot
git pull origin main
cd middleware
go build -o middleware main.go
sudo systemctl restart tokkatot-middleware
```

### View Connected Devices

```bash
# DHCP leases
cat /var/lib/misc/dnsmasq.leases

# ARP table
arp -a

# Wireless clients
sudo iw dev wlan0 station dump
```

### Change WiFi Password

```bash
# Edit configuration
sudo nano /etc/hostapd/hostapd.conf
# Change: wpa_passphrase=your-new-password

# Restart service
sudo systemctl restart hostapd
```

---

## 📊 Performance Testing

### Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test middleware
ab -n 1000 -c 10 http://10.0.0.1:4000/

# Monitor during test
htop
```

### Network Performance

```bash
# Test WiFi signal from connected device
# On phone, use WiFi Analyzer app

# Check bandwidth
sudo apt install iperf3
# Run server: iperf3 -s
# Run client from phone with iperf3 app
```

---

## 🎓 Next Steps

### 1. Security Hardening

```bash
# Change JWT secret
sudo nano /opt/tokkatot/middleware/.env

# Enable HTTPS
# Generate SSL certificate
# Configure middleware

# Harden firewall
sudo ufw enable
sudo ufw status verbose
```

### 2. Add Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop iftop

# Set up log rotation
sudo nano /etc/logrotate.d/tokkatot
```

### 3. Backup Configuration

```bash
# Backup important files
mkdir -p ~/tokkatot-backup
cp -r /opt/tokkatot/middleware/.env ~/tokkatot-backup/
cp /etc/hostapd/hostapd.conf ~/tokkatot-backup/
cp /etc/dnsmasq.conf ~/tokkatot-backup/
```

### 4. Deploy to Raspberry Pi

Once tested in VirtualBox:

1. Flash Raspberry Pi OS (64-bit)
2. Clone repository
3. Run deployment scripts
4. Configure for production

---

## 📚 Additional Resources

- **Full Deployment Guide:** `DEPLOYMENT.md`
- **Quick Start:** `QUICKSTART.md`
- **Script Documentation:** `scripts/README.md`
- **GitHub Issues:** https://github.com/somanithpreap/tokkatot/issues

---

## ✅ Success Checklist

- [ ] VirtualBox VM created and running
- [ ] Ubuntu Server installed
- [ ] Repository cloned to `/opt/tokkatot`
- [ ] Deployment scripts executed successfully
- [ ] Access Point broadcasting (SSID visible)
- [ ] Phone/laptop can connect to WiFi
- [ ] Web app accessible at `http://10.0.0.1:4000`
- [ ] Can register and log in
- [ ] ESP32 connects and gets IP `10.0.0.2`
- [ ] ESP32 endpoints responding
- [ ] Device controls working from web app
- [ ] All services running automatically
- [ ] Verification script passes

---

## 🎉 Congratulations!

You've successfully deployed the Tokkatot Smart Poultry System in VirtualBox!

Your system is now:
- ✅ Running as WiFi Access Point
- ✅ Serving web application
- ✅ Ready to connect ESP32
- ✅ Configured for local farm control

**Next:** Deploy to actual Raspberry Pi for production use!

---

## 💡 Tips

1. **Take VM Snapshots** before major changes
2. **Test thoroughly** before deploying to Raspberry Pi
3. **Monitor logs** during initial testing
4. **Keep security in mind** for production
5. **Document any changes** you make

Good luck with your Smart Poultry System! 🐔🚀
