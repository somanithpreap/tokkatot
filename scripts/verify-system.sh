#!/bin/bash

# ============================================
# System Verification Script
# ============================================
# This script checks if all components are properly configured
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
    echo ""
}

check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo -e "  ${GREEN}✓${NC} $service: Running"
        return 0
    else
        echo -e "  ${RED}✗${NC} $service: Not running"
        return 1
    fi
}

check_port() {
    local port=$1
    local name=$2
    if sudo netstat -tulpn | grep -q ":$port "; then
        echo -e "  ${GREEN}✓${NC} Port $port ($name): Open"
        return 0
    else
        echo -e "  ${RED}✗${NC} Port $port ($name): Not listening"
        return 1
    fi
}

check_file() {
    local file=$1
    local name=$2
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $name: Found"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name: Not found"
        return 1
    fi
}

print_header "Tokkatot System Verification"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}[WARNING]${NC} Some checks require root access. Run with sudo for complete verification."
    echo ""
fi

# ============================================
# Check Network Configuration
# ============================================
print_header "Network Configuration"

# Check if WiFi interface has correct IP
if ip addr show | grep -q "10.0.0.1/24"; then
    echo -e "  ${GREEN}✓${NC} Server IP configured: 10.0.0.1/24"
else
    echo -e "  ${RED}✗${NC} Server IP not configured correctly"
fi

# Check if WiFi interface exists
WIFI_INTERFACE=$(ip link show | grep -E "wl[a-z0-9]+" | head -n 1 | cut -d: -f2 | tr -d ' ')
if [ ! -z "$WIFI_INTERFACE" ]; then
    echo -e "  ${GREEN}✓${NC} WiFi interface found: $WIFI_INTERFACE"
else
    echo -e "  ${RED}✗${NC} No WiFi interface detected"
fi

# ============================================
# Check Services
# ============================================
print_header "Service Status"

check_service "hostapd"
check_service "dnsmasq"
check_service "tokkatot-middleware"
check_service "tokkatot-ai" || echo -e "  ${YELLOW}!${NC} AI service optional"

# Check GitHub runner
if systemctl list-units --type=service | grep -q "actions.runner"; then
    echo -e "  ${GREEN}✓${NC} GitHub Actions runner: Running"
else
    echo -e "  ${YELLOW}!${NC} GitHub Actions runner: Not configured (optional)"
fi

# ============================================
# Check Ports
# ============================================
print_header "Port Status"

check_port "4000" "Middleware"
check_port "5000" "AI Service" || echo -e "  ${YELLOW}!${NC} AI service optional"
check_port "53" "DNS"
check_port "67" "DHCP"

# ============================================
# Check Files
# ============================================
print_header "File Status"

check_file "/opt/tokkatot/middleware/middleware" "Middleware binary"
check_file "/opt/tokkatot/middleware/.env" "Environment config"
check_file "/etc/hostapd/hostapd.conf" "hostapd config"
check_file "/etc/dnsmasq.conf" "dnsmasq config"
check_file "/etc/systemd/system/tokkatot-middleware.service" "Middleware service"

# ============================================
# Check Configuration Files
# ============================================
print_header "Configuration Check"

# Check hostapd SSID
if grep -q "Smart Poultry 1.0.0-0001" /etc/hostapd/hostapd.conf 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} SSID configured correctly"
else
    echo -e "  ${RED}✗${NC} SSID not configured or incorrect"
fi

# Check dnsmasq DHCP range
if grep -q "10.0.0.10,10.0.0.50" /etc/dnsmasq.conf 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} DHCP range configured correctly"
else
    echo -e "  ${RED}✗${NC} DHCP range not configured or incorrect"
fi

# Check middleware port in .env
if grep -q "PORT=4000" /opt/tokkatot/middleware/.env 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Middleware port configured correctly"
else
    echo -e "  ${YELLOW}!${NC} Check middleware port in .env"
fi

# ============================================
# Connectivity Tests
# ============================================
print_header "Connectivity Tests"

# Test localhost middleware
if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Middleware responding on localhost"
else
    echo -e "  ${RED}✗${NC} Middleware not responding on localhost"
fi

# Test 10.0.0.1 middleware
if curl -s http://10.0.0.1:4000 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Middleware responding on 10.0.0.1"
else
    echo -e "  ${RED}✗${NC} Middleware not responding on 10.0.0.1"
fi

# Test ESP32 connection (if available)
if ping -c 1 -W 2 10.0.0.2 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} ESP32 (10.0.0.2) is reachable"
    
    # Test ESP32 HTTP
    if curl -s http://10.0.0.2/get-initial-state > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} ESP32 HTTP server responding"
    else
        echo -e "  ${YELLOW}!${NC} ESP32 not responding to HTTP requests"
    fi
else
    echo -e "  ${YELLOW}!${NC} ESP32 (10.0.0.2) not reachable (device may be off)"
fi

# ============================================
# DHCP Leases
# ============================================
print_header "DHCP Leases"

if [ -f /var/lib/misc/dnsmasq.leases ]; then
    LEASE_COUNT=$(wc -l < /var/lib/misc/dnsmasq.leases)
    if [ $LEASE_COUNT -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Active DHCP leases: $LEASE_COUNT"
        echo ""
        cat /var/lib/misc/dnsmasq.leases | while read line; do
            echo "    $line"
        done
    else
        echo -e "  ${YELLOW}!${NC} No active DHCP leases (no devices connected)"
    fi
else
    echo -e "  ${YELLOW}!${NC} DHCP lease file not found"
fi

# ============================================
# Recent Logs
# ============================================
print_header "Recent Errors (Last 10)"

echo "Middleware errors:"
journalctl -u tokkatot-middleware --no-pager -n 10 --grep "ERROR|error|Error" 2>/dev/null || echo "  No recent errors"

echo ""
echo "hostapd errors:"
journalctl -u hostapd --no-pager -n 10 --grep "ERROR|error|Error" 2>/dev/null || echo "  No recent errors"

echo ""
echo "dnsmasq errors:"
journalctl -u dnsmasq --no-pager -n 10 --grep "ERROR|error|Error" 2>/dev/null || echo "  No recent errors"

# ============================================
# Summary
# ============================================
print_header "Verification Complete"

echo "Access Information:"
echo "  WiFi SSID: Smart Poultry 1.0.0-0001"
echo "  WiFi Password: skibiditoilet168"
echo "  Server URL: http://10.0.0.1:4000"
echo "  ESP32 IP: http://10.0.0.2"
echo ""
echo "Useful Commands:"
echo "  View middleware logs: sudo journalctl -u tokkatot-middleware -f"
echo "  Restart middleware: sudo systemctl restart tokkatot-middleware"
echo "  View AP logs: sudo journalctl -u hostapd -f"
echo "  View DHCP logs: sudo journalctl -u dnsmasq -f"
echo "  Check all services: sudo systemctl status tokkatot-*"
echo ""
