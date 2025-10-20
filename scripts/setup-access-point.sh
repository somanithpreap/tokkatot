#!/bin/bash

# ============================================
# Tokkatot Access Point Setup Script
# ============================================
# This script configures Ubuntu Server as a WiFi Access Point
# matching the ESP32 embedded system configuration
#
# Network Configuration:
# - SSID: Smart Poultry 1.0.0-0001
# - Password: skibiditoilet168
# - Server IP: 10.0.0.1/24
# - ESP32 IP: 10.0.0.2
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
WIFI_INTERFACE="wlan0"
WIFI_SSID="Smart Poultry 1.0.0-0001"
WIFI_PASSWORD="skibiditoilet168"
SERVER_IP="10.0.0.1"
DHCP_RANGE_START="10.0.0.10"
DHCP_RANGE_END="10.0.0.50"
ESP32_IP="10.0.0.2"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_info "Starting Access Point setup..."

# Step 1: Detect WiFi interface
print_info "Detecting WiFi interface..."
DETECTED_INTERFACE=$(ip link show | grep -E "wl[a-z0-9]+" | head -n 1 | cut -d: -f2 | tr -d ' ')

if [ -z "$DETECTED_INTERFACE" ]; then
    print_error "No WiFi interface detected!"
    exit 1
fi

print_info "Detected WiFi interface: $DETECTED_INTERFACE"
read -p "Use this interface? (Y/n): " USE_DETECTED

if [[ ! $USE_DETECTED =~ ^[Nn]$ ]]; then
    WIFI_INTERFACE=$DETECTED_INTERFACE
else
    read -p "Enter WiFi interface name: " WIFI_INTERFACE
fi

# Step 2: Update system
print_info "Updating system packages..."
apt update && apt upgrade -y

# Step 3: Install required packages
print_info "Installing hostapd and dnsmasq..."
apt install -y hostapd dnsmasq iptables-persistent

# Stop services while configuring
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Step 4: Configure static IP using netplan
print_info "Configuring static IP for $WIFI_INTERFACE..."

# Backup existing netplan configuration
NETPLAN_DIR="/etc/netplan"
mkdir -p "$NETPLAN_DIR/backup"
cp $NETPLAN_DIR/*.yaml $NETPLAN_DIR/backup/ 2>/dev/null || true

# Create new netplan configuration
cat > $NETPLAN_DIR/50-wifi-ap.yaml << EOF
network:
  version: 2
  renderer: networkd
  wifis:
    $WIFI_INTERFACE:
      dhcp4: no
      addresses:
        - $SERVER_IP/24
EOF

print_info "Applying netplan configuration..."
netplan apply

# Wait for interface to be configured
sleep 3

# Step 5: Configure hostapd
print_info "Configuring hostapd (Access Point)..."

cat > /etc/hostapd/hostapd.conf << EOF
# Interface configuration
interface=$WIFI_INTERFACE
driver=nl80211

# Network configuration
ssid=$WIFI_SSID
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0

# Security configuration
wpa=2
wpa_passphrase=$WIFI_PASSWORD
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

# Country code (Cambodia)
country_code=KH
ieee80211n=1
ieee80211d=1
EOF

# Configure hostapd daemon
cat > /etc/default/hostapd << EOF
DAEMON_CONF="/etc/hostapd/hostapd.conf"
EOF

# Step 6: Configure dnsmasq (DHCP server)
print_info "Configuring dnsmasq (DHCP server)..."

# Backup original configuration
mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup 2>/dev/null || true

cat > /etc/dnsmasq.conf << EOF
# Interface to bind to
interface=$WIFI_INTERFACE

# Don't bind to other interfaces
bind-interfaces

# DHCP range
dhcp-range=$DHCP_RANGE_START,$DHCP_RANGE_END,255.255.255.0,24h

# DNS servers (Google DNS)
dhcp-option=6,8.8.8.8,8.8.4.4

# Gateway
dhcp-option=3,$SERVER_IP

# Domain
domain=tokkatot.local
local=/tokkatot.local/

# Log DHCP requests
log-dhcp

# Reserve IP for ESP32
dhcp-host=$ESP32_IP,infinite

# Increase DNS cache size
cache-size=1000
EOF

# Step 7: Enable IP forwarding (optional, for internet sharing)
print_info "Enabling IP forwarding..."

# Enable in sysctl.conf
sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
sysctl -p

# Step 8: Configure iptables (optional, for internet sharing)
print_info "Configuring firewall rules..."

# Detect ethernet interface
ETH_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n 1)

if [ ! -z "$ETH_INTERFACE" ]; then
    print_info "Detected internet interface: $ETH_INTERFACE"
    print_info "Setting up internet sharing..."
    
    # Enable NAT
    iptables -t nat -A POSTROUTING -o $ETH_INTERFACE -j MASQUERADE
    iptables -A FORWARD -i $ETH_INTERFACE -o $WIFI_INTERFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
    iptables -A FORWARD -i $WIFI_INTERFACE -o $ETH_INTERFACE -j ACCEPT
    
    # Save iptables rules
    netfilter-persistent save
else
    print_warning "No ethernet interface detected. Internet sharing not configured."
fi

# Step 9: Enable and start services
print_info "Enabling and starting services..."

# Unmask and enable hostapd
systemctl unmask hostapd
systemctl enable hostapd

# Enable dnsmasq
systemctl enable dnsmasq

# Start hostapd
print_info "Starting hostapd..."
systemctl start hostapd

# Check hostapd status
if systemctl is-active --quiet hostapd; then
    print_info "hostapd started successfully"
else
    print_error "hostapd failed to start. Checking logs..."
    journalctl -u hostapd -n 20 --no-pager
    exit 1
fi

# Start dnsmasq
print_info "Starting dnsmasq..."
systemctl start dnsmasq

# Check dnsmasq status
if systemctl is-active --quiet dnsmasq; then
    print_info "dnsmasq started successfully"
else
    print_error "dnsmasq failed to start. Checking logs..."
    journalctl -u dnsmasq -n 20 --no-pager
    exit 1
fi

# Step 10: Configure UFW firewall
print_info "Configuring UFW firewall..."

# Install UFW if not installed
apt install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow middleware
ufw allow 4000/tcp

# Allow AI service
ufw allow 5000/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Allow DNS
ufw allow 53

# Allow DHCP
ufw allow 67/udp

# Allow from ESP32
ufw allow from $ESP32_IP

# Enable UFW
ufw --force enable

# Step 11: Print configuration summary
print_info "============================================"
print_info "Access Point Configuration Complete!"
print_info "============================================"
echo ""
print_info "Network Configuration:"
echo "  SSID: $WIFI_SSID"
echo "  Password: $WIFI_PASSWORD"
echo "  Server IP: $SERVER_IP"
echo "  DHCP Range: $DHCP_RANGE_START - $DHCP_RANGE_END"
echo "  ESP32 IP: $ESP32_IP"
echo ""
print_info "Services Status:"
systemctl status hostapd --no-pager | grep Active
systemctl status dnsmasq --no-pager | grep Active
echo ""
print_info "To test the access point:"
echo "  1. Look for WiFi network: $WIFI_SSID"
echo "  2. Connect using password: $WIFI_PASSWORD"
echo "  3. Your device should get IP in range $DHCP_RANGE_START-$DHCP_RANGE_END"
echo "  4. Access server at: http://$SERVER_IP:4000"
echo ""
print_info "Useful commands:"
echo "  Check hostapd status: sudo systemctl status hostapd"
echo "  Check dnsmasq status: sudo systemctl status dnsmasq"
echo "  View hostapd logs: sudo journalctl -u hostapd -f"
echo "  View dnsmasq logs: sudo journalctl -u dnsmasq -f"
echo "  View DHCP leases: cat /var/lib/misc/dnsmasq.leases"
echo ""
print_warning "If the access point is not visible, reboot the system:"
echo "  sudo reboot"
