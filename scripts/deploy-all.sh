#!/bin/bash

# ============================================
# Complete Tokkatot Deployment Script
# ============================================
# This master script runs all setup scripts in order
# to fully deploy the Tokkatot system on Ubuntu Server
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="/opt/tokkatot"

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
    echo ""
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_header "Tokkatot Complete Deployment"

print_info "This script will:"
echo "  1. Clone the repository to $APP_DIR"
echo "  2. Set up WiFi Access Point"
echo "  3. Build and configure middleware service"
echo "  4. Set up GitHub Actions runner"
echo "  5. Optionally set up AI service"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# ============================================
# STEP 1: Clone Repository
# ============================================
print_header "Step 1: Clone Repository"

if [ -d "$APP_DIR" ] && [ -d "$APP_DIR/.git" ]; then
    print_warning "Repository already exists at $APP_DIR"
    read -p "Pull latest changes? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        cd $APP_DIR
        git pull origin main || git pull origin master || print_warning "Failed to pull latest changes"
    fi
else
    print_info "Cloning repository..."
    
    # Create directory
    mkdir -p $APP_DIR
    
    # Clone repository
    git clone https://github.com/somanithpreap/tokkatot.git $APP_DIR
    
    if [ $? -eq 0 ]; then
        print_info "Repository cloned successfully"
    else
        print_error "Failed to clone repository"
        exit 1
    fi
fi

cd $APP_DIR
print_info "Current directory: $(pwd)"

# Make scripts executable
chmod +x scripts/*.sh

# ============================================
# STEP 2: Set Up Access Point
# ============================================
print_header "Step 2: Set Up WiFi Access Point"

read -p "Set up WiFi Access Point? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "$APP_DIR/scripts/setup-access-point.sh" ]; then
        bash $APP_DIR/scripts/setup-access-point.sh
    else
        print_error "Access point setup script not found!"
        exit 1
    fi
else
    print_warning "Skipping Access Point setup"
fi

# ============================================
# STEP 3: Set Up Middleware Service
# ============================================
print_header "Step 3: Set Up Middleware Service"

read -p "Set up middleware service? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if [ -f "$APP_DIR/scripts/setup-middleware-service.sh" ]; then
        bash $APP_DIR/scripts/setup-middleware-service.sh
    else
        print_error "Middleware setup script not found!"
        exit 1
    fi
else
    print_warning "Skipping middleware setup"
fi

# ============================================
# STEP 4: Set Up AI Service (Optional)
# ============================================
print_header "Step 4: Set Up AI Service (Optional)"

read -p "Set up AI disease detection service? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Installing Python and AI dependencies..."
    
    cd $APP_DIR/ai-service
    
    # Install Python
    apt install -y python3 python3-pip python3-venv
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Create systemd service
    cat > /etc/systemd/system/tokkatot-ai.service << EOF
[Unit]
Description=Tokkatot AI Disease Detection Service
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$APP_DIR/ai-service
Environment="PATH=$APP_DIR/ai-service/venv/bin"
ExecStart=$APP_DIR/ai-service/venv/bin/python app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Enable and start service
    systemctl daemon-reload
    systemctl enable tokkatot-ai.service
    systemctl start tokkatot-ai.service
    
    print_info "AI service started"
    systemctl status tokkatot-ai.service --no-pager
else
    print_warning "Skipping AI service setup"
fi

# ============================================
# STEP 5: Set Up GitHub Actions Runner
# ============================================
print_header "Step 5: Set Up GitHub Actions Runner"

read -p "Set up GitHub Actions runner? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$APP_DIR/scripts/setup-github-runner.sh" ]; then
        bash $APP_DIR/scripts/setup-github-runner.sh
    else
        print_error "GitHub runner setup script not found!"
    fi
else
    print_warning "Skipping GitHub Actions runner setup"
fi

# ============================================
# FINAL SUMMARY
# ============================================
print_header "Deployment Complete!"

print_info "System Status:"
echo ""

# Check Access Point
if systemctl is-active --quiet hostapd; then
    echo -e "  ${GREEN}✓${NC} Access Point: Running"
    echo "    SSID: Smart Poultry 1.0.0-0001"
    echo "    IP: 10.0.0.1"
else
    echo -e "  ${RED}✗${NC} Access Point: Not running"
fi

# Check Middleware
if systemctl is-active --quiet tokkatot-middleware; then
    echo -e "  ${GREEN}✓${NC} Middleware: Running"
    echo "    URL: http://10.0.0.1:4000"
else
    echo -e "  ${RED}✗${NC} Middleware: Not running"
fi

# Check AI Service
if systemctl is-active --quiet tokkatot-ai; then
    echo -e "  ${GREEN}✓${NC} AI Service: Running"
    echo "    URL: http://127.0.0.1:5000"
else
    echo -e "  ${YELLOW}!${NC} AI Service: Not configured"
fi

# Check GitHub Runner
if systemctl list-units --type=service | grep -q "actions.runner"; then
    echo -e "  ${GREEN}✓${NC} GitHub Runner: Running"
else
    echo -e "  ${YELLOW}!${NC} GitHub Runner: Not configured"
fi

echo ""
print_info "Next Steps:"
echo "  1. Connect your phone to WiFi: 'Smart Poultry 1.0.0-0001'"
echo "  2. Enter password: 'skibiditoilet168'"
echo "  3. Open browser: http://10.0.0.1:4000"
echo "  4. Power on ESP32 device (should connect to 10.0.0.2)"
echo ""

print_info "Useful Commands:"
echo "  View all services: sudo systemctl status tokkatot-*"
echo "  View middleware logs: sudo journalctl -u tokkatot-middleware -f"
echo "  View AP logs: sudo journalctl -u hostapd -f"
echo "  Reboot system: sudo reboot"
echo ""

print_warning "IMPORTANT: Edit the .env file and change JWT_SECRET!"
echo "  sudo nano $APP_DIR/middleware/.env"
echo ""

print_info "Deployment script finished successfully!"
print_info "Rebooting in 10 seconds... (Ctrl+C to cancel)"

for i in {10..1}; do
    echo -n "$i... "
    sleep 1
done

echo ""
print_info "Rebooting now..."
reboot
