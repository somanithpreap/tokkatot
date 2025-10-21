# 🚀 Raspberry Pi 4B Quick Deployment Guide

You have: **Raspberry Pi 4B with Ubuntu Server** ✅  
Next: Deploy Tokkatot in 10 minutes! 🎉

---

## 📋 What You Need

### Hardware
- ✅ Raspberry Pi 4B (you have this!)
- ✅ Ubuntu Server installed (you have this!)
- 🔌 Power supply
- 💾 MicroSD card (16GB+)
- 🌐 Internet connection (ethernet cable for initial setup)
- 📱 USB WiFi adapter (for Access Point mode) - **IMPORTANT!**

### Why USB WiFi Adapter?

**Raspberry Pi 4B has built-in WiFi, BUT:**
- Built-in WiFi = your connection to internet/home network
- USB WiFi = creates Access Point for phones/ESP32 to connect

**Without USB WiFi adapter:**
- You can still test using ethernet or port forwarding
- But for full farm deployment, you need USB WiFi for the Access Point

**Recommended USB WiFi Adapters ($15-25):**
- TP-Link TL-WN722N (best compatibility)
- Ralink RT5370 chipset
- Any adapter supporting AP mode

---

## 🎯 Quick Start (3 Commands!)

### Step 1: Connect to Raspberry Pi

**Option A: Direct Connection (monitor + keyboard)**
```bash
# Login with your Ubuntu credentials
```

**Option B: SSH from your PC**
```powershell
# Find Pi's IP address (check your router)
ssh ubuntu@<raspberry-pi-ip>
# Default password: ubuntu (will ask to change on first login)
```

---

### Step 2: One-Command Deployment! 🚀

```bash
# Update system first
sudo apt update && sudo apt upgrade -y

# Install git if not present
sudo apt install -y git

# Clone repository
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .

# Make scripts executable
chmod +x scripts/*.sh

# 🎉 DEPLOY EVERYTHING!
sudo bash scripts/deploy-all.sh
```
**That's it!** The script will:
1. ✅ Detect USB WiFi adapter (or use built-in WiFi)
2. ✅ Set up Access Point (SSID: Smart Poultry 1.0.0-0001)
3. ✅ Configure network (10.0.0.1/24)
4. ✅ Install Go 1.23.6
5. ✅ Build middleware
6. ✅ Create systemd service
7. ✅ Start everything automatically
8. ✅ Reboot

---

### Step 3: Wait for Reboot

```bash
# System will reboot automatically
# Wait 2-3 minutes, then SSH back in

ssh ubuntu@<raspberry-pi-ip>
```

---

## ✅ Verify Everything Works

```bash
# Run verification script
sudo bash /opt/tokkatot/scripts/verify-system.sh
```

**Expected Output:**
```
✓ Access Point: Running
✓ Middleware: Running  
✓ Server IP configured: 10.0.0.1/24
✓ Port 4000 (Middleware): Open
✓ WiFi AP broadcasting: Smart Poultry 1.0.0-0001
```

**Manual Checks:**
```bash
# Check services
sudo systemctl status tokkatot-middleware
sudo systemctl status hostapd
sudo systemctl status dnsmasq

# Check network
ip addr show

# Test middleware
curl http://10.0.0.1:4000
```

---

## 📱 Connect Your Phone!

### Step 1: Find WiFi Network
1. Open WiFi settings on your phone
2. Look for: **`Smart Poultry 1.0.0-0001`**
3. Connect with password: **`skibiditoilet168`**

### Step 2: Access Web App
Open browser on your phone:
```
http://10.0.0.1:4000
```

You should see the Tokkatot login page! 🎉

### Step 3: Test
1. Sign up for an account
2. Log in
3. Explore the dashboard
4. Check settings page

---

## 🔌 Connect ESP32

Your ESP32 should already be configured with:
```cpp
const char* ssid = "Smart Poultry 1.0.0-0001";
const char* password = "skibiditoilet168";
IPAddress local_ip(10, 0, 0, 2);
IPAddress gateway(10, 0, 0, 1);
```

### Just power it on!

The ESP32 will:
1. Automatically connect to your Raspberry Pi WiFi
2. Get IP address `10.0.0.2`
3. Start sending sensor data

### Test ESP32 Connection

```bash
# From Raspberry Pi
ping 10.0.0.2

# Test endpoint
curl http://10.0.0.2/get-initial-state

# Check connected devices
cat /var/lib/misc/dnsmasq.leases
```

---

## 🎮 Full Testing Checklist

- [ ] ✅ Raspberry Pi powered on and accessible
- [ ] ✅ Scripts deployed successfully
- [ ] ✅ WiFi Access Point visible on phone
- [ ] ✅ Phone can connect to WiFi
- [ ] ✅ Web app loads at http://10.0.0.1:4000
- [ ] ✅ Can register and login
- [ ] ✅ Dashboard shows data
- [ ] ✅ ESP32 connects and gets IP 10.0.0.2
- [ ] ✅ Sensor data appears in web app
- [ ] ✅ Device controls work (toggle fan, lights)
- [ ] ✅ AI disease detection works
- [ ] ✅ System survives reboot (services auto-start)

---

## 🔧 Troubleshooting

### WiFi Access Point Not Visible

**If you have USB WiFi adapter:**

```bash
# Check if adapter is detected
lsusb
ip link show

# You should see wlan0 and wlan1
# wlan0 = built-in WiFi
# wlan1 = USB WiFi adapter

# Check hostapd
sudo systemctl status hostapd
sudo journalctl -u hostapd -n 50

# Restart services
sudo systemctl restart hostapd
sudo systemctl restart dnsmasq
```

**If NO USB WiFi adapter:**

The script will use built-in WiFi. But this means:
- ❌ Pi won't have internet connection
- ✅ Phone and ESP32 can still connect
- ⚠️ Can't download updates or packages

**Solution:** Get a USB WiFi adapter for best setup!

---

### Can't SSH After Reboot

**Raspberry Pi now has two networks:**
1. **Ethernet/Built-in WiFi:** For your home network (internet)
2. **USB WiFi AP:** For Access Point (10.0.0.1)

**To SSH:**
```powershell
# If Pi is on your home network via ethernet:
ssh ubuntu@<home-network-ip>

# Or connect your PC to Pi's WiFi AP:
# Connect to: Smart Poultry 1.0.0-0001
# Then SSH to: ssh ubuntu@10.0.0.1
```

---

### Middleware Not Starting

```bash
# Check service status
sudo systemctl status tokkatot-middleware

# View logs
sudo journalctl -u tokkatot-middleware -n 100

# Test manually
cd /opt/tokkatot/middleware
./middleware

# If binary is missing, rebuild:
cd /opt/tokkatot/middleware
go build -o middleware main.go
sudo systemctl restart tokkatot-middleware
```

---

### ESP32 Won't Connect

```bash
# Check if WiFi AP is working
sudo systemctl status hostapd

# Check DHCP server
sudo systemctl status dnsmasq

# View DHCP leases (connected devices)
cat /var/lib/misc/dnsmasq.leases

# Check WiFi signal
sudo iw dev wlan1 info  # USB WiFi adapter
```

**On ESP32 side:**
- Verify SSID and password match
- Check static IP configuration
- View Serial Monitor for connection errors
- Try increasing WiFi signal strength

---

## 📊 Network Architecture

```
┌─────────────────────────────────────────────────┐
│  Raspberry Pi 4B (10.0.0.1)                    │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  eth0 or wlan0 (built-in)                │ │
│  │  → Home network / Internet                │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  wlan1 (USB WiFi) - Access Point         │ │
│  │  SSID: Smart Poultry 1.0.0-0001          │ │
│  │  IP: 10.0.0.1/24                          │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  Go Middleware :4000                      │ │
│  │  Python AI Service :5000                  │ │
│  │  SQLite Database                          │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                    │
         │ WiFi              │ WiFi
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  ESP32          │  │  Your Phone     │
│  10.0.0.2       │  │  10.0.0.X       │
│  (DHT22, etc)   │  │  (Browser)      │
└─────────────────┘  └─────────────────┘
```

---

## ⚙️ Configuration Files

All configuration is in:

```bash
# Middleware environment
/opt/tokkatot/middleware/.env

# WiFi AP settings
/etc/hostapd/hostapd.conf

# DHCP settings
/etc/dnsmasq.conf

# Network configuration
/etc/netplan/*.yaml
```

---

## 🔐 Security Recommendations

### For Production Use:

```bash
# 1. Change JWT secret
sudo nano /opt/tokkatot/middleware/.env
# Change JWT_SECRET to a random string

# 2. Change WiFi password
sudo nano /etc/hostapd/hostapd.conf
# Change wpa_passphrase=skibiditoilet168
sudo systemctl restart hostapd

# 3. Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 4000/tcp  # Middleware
sudo ufw status

# 4. Disable SSH password auth (use keys)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh

# 5. Keep system updated
sudo apt update && sudo apt upgrade -y
```

---

## 🎯 What If I Don't Have USB WiFi Adapter?

### Option 1: Use Built-in WiFi (Limited)

Deploy anyway:
```bash
sudo bash scripts/deploy-all.sh
```

The script will use built-in WiFi (wlan0) for Access Point.

**Limitations:**
- Pi loses internet connection
- Can't update or install packages
- Works for isolated farm deployment

---

### Option 2: Use Ethernet (Development)

Keep Pi connected to internet via ethernet, skip AP setup:

```bash
cd /opt/tokkatot

# Only build middleware (skip AP setup)
sudo bash scripts/setup-middleware-service.sh
```

**Access from PC on same network:**
```powershell
# Find Pi IP on home network
# Then access from browser:
http://<pi-ip>:4000
```

**For ESP32:**
- Connect ESP32 to your home WiFi
- Update ESP32 code with Pi's home network IP
- Not portable, but works for testing

---

### Option 3: Port Forwarding (Quick Test)

Test the web app without network setup:

```bash
# Just build and run middleware
cd /opt/tokkatot/middleware
go build -o middleware main.go
./middleware
```

Access from your PC:
```powershell
# SSH tunnel
ssh -L 8080:localhost:4000 ubuntu@<pi-ip>

# Then open browser:
http://localhost:8080
```

---

## 💰 Shopping List

If you need to buy anything:

| Item | Price | Priority |
|------|-------|----------|
| USB WiFi Adapter (TP-Link TL-WN722N) | $15-25 | 🔥 HIGH |
| ESP32 DevKit | $5-10 | HIGH |
| DHT22 Sensor | $3-5 | MEDIUM |
| Relay Module (4-channel) | $5-8 | MEDIUM |
| MicroSD Card (32GB+) | $8-15 | MEDIUM |
| Power Supply 5V 3A | $8-12 | HIGH |

**Total for full setup:** ~$50-75

---

## 🚀 Next Steps

### Immediate (Day 1):
1. ✅ Deploy to Raspberry Pi (you're doing this now!)
2. ✅ Test web app from phone
3. ✅ Verify all pages work

### Short Term (Week 1):
1. Connect ESP32 with sensors
2. Test device controls
3. Test AI disease detection
4. Monitor system stability

### Long Term (Month 1):
1. Deploy in actual farm location
2. Add more sensors
3. Set up data backup
4. Configure alerts/notifications
5. Train custom AI model

---

## 📞 Get Help

If something goes wrong:

1. **Check logs:**
   ```bash
   sudo journalctl -u tokkatot-middleware -f
   sudo journalctl -u hostapd -f
   ```

2. **Run verification:**
   ```bash
   sudo bash /opt/tokkatot/scripts/verify-system.sh
   ```

3. **Check documentation:**
   - `DEPLOYMENT.md` - Full deployment guide
   - `FIXES_COMPLETED.md` - All fixes applied
   - `VIRTUALBOX_SETUP.md` - Testing guide

4. **GitHub Issues:**
   https://github.com/somanithpreap/tokkatot/issues

---

## 🎉 You're Ready!

Your Raspberry Pi 4B is perfect for this project! 

**Just run:**
```bash
sudo bash scripts/deploy-all.sh
```

**And you'll have a working smart poultry system in 10 minutes!** 🐔🚀

---

## 📝 Quick Reference

### Essential Commands

```bash
# Check all services
sudo systemctl status tokkatot-*

# Restart everything
sudo systemctl restart tokkatot-middleware hostapd dnsmasq

# View logs
sudo journalctl -u tokkatot-middleware -f

# Update code
cd /opt/tokkatot && git pull && cd middleware && go build -o middleware main.go && sudo systemctl restart tokkatot-middleware

# Reboot Pi
sudo reboot

# Check connected devices
cat /var/lib/misc/dnsmasq.leases

# Test ESP32
curl http://10.0.0.2/get-initial-state
```

---

**Good luck with your deployment!** 🎊

*If you run into any issues, check the troubleshooting section or open a GitHub issue.*
