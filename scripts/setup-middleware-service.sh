#!/bin/bash

# ============================================
# Tokkatot Middleware Service Setup Script
# ============================================
# This script builds the Go middleware and sets up
# a systemd service to run it automatically
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/tokkatot"
MIDDLEWARE_DIR="$APP_DIR/middleware"
SERVICE_NAME="tokkatot-middleware"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

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

print_info "Starting Tokkatot Middleware setup..."

# Step 1: Check if Go is installed and has correct version
print_info "Checking Go installation..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    GO_ARCH="arm64"
elif [ "$ARCH" = "armv7l" ] || [ "$ARCH" = "armv6l" ]; then
    GO_ARCH="armv6l"
elif [ "$ARCH" = "x86_64" ]; then
    GO_ARCH="amd64"
else
    print_error "Unsupported architecture: $ARCH"
    exit 1
fi

print_info "Detected architecture: $ARCH (Go arch: $GO_ARCH)"

# Check if Go is installed and version is sufficient
GO_REQUIRED_VERSION="1.21"
GO_INSTALLED=false

if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    print_info "Found Go version: $GO_VERSION"
    
    # Simple version check (compare major.minor)
    GO_MAJOR=$(echo $GO_VERSION | cut -d. -f1)
    GO_MINOR=$(echo $GO_VERSION | cut -d. -f2)
    
    if [ "$GO_MAJOR" -gt 1 ] || ([ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -ge 21 ]); then
        GO_INSTALLED=true
        print_info "Go version is sufficient"
    else
        print_warning "Go version is too old (need 1.21+). Will install newer version."
    fi
fi

if [ "$GO_INSTALLED" = false ]; then
    print_info "Installing Go 1.23.6 for $GO_ARCH..."
    
    # Remove old Go installations
    apt remove -y golang-go 2>/dev/null || true
    rm -rf /usr/local/go
    
    # Download and install Go
    cd /tmp
    GO_TARBALL="go1.23.6.linux-$GO_ARCH.tar.gz"
    
    print_info "Downloading $GO_TARBALL..."
    if ! wget -q https://go.dev/dl/$GO_TARBALL; then
        print_error "Failed to download Go"
        exit 1
    fi
    
    print_info "Extracting Go..."
    tar -C /usr/local -xzf $GO_TARBALL
    
    # Cleanup
    rm -f $GO_TARBALL
    
    print_info "Go installed successfully"
fi

# Ensure Go is in PATH
export PATH=/usr/local/go/bin:$PATH

# Verify Go installation
if ! command -v go &> /dev/null; then
    print_error "Go installation failed"
    exit 1
fi

print_info "Using Go: $(go version)"

# Step 2: Navigate to middleware directory
if [ ! -d "$MIDDLEWARE_DIR" ]; then
    print_error "Middleware directory not found: $MIDDLEWARE_DIR"
    print_error "Please ensure the repository is cloned to $APP_DIR"
    exit 1
fi

cd $MIDDLEWARE_DIR
print_info "Working directory: $(pwd)"

# Step 3: Create .env file if it doesn't exist
if [ ! -f "$MIDDLEWARE_DIR/.env" ]; then
    print_warning ".env file not found. Creating default configuration..."
    
    cat > $MIDDLEWARE_DIR/.env << 'EOF'
# Server Configuration
PORT=4000
FRONTEND_PATH=/opt/tokkatot/frontend

# Database Configuration
DATABASE_PATH=/opt/tokkatot/middleware/users.db

# JWT Configuration (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=tokkatot_super_secret_jwt_key_change_in_production_2024

# IoT Device Configuration
IOT_DEVICE_URL=http://10.0.0.2
ENCRYPTION_KEY=6c23544e3b7c564c57417c6e62645e6f

# AI Service Configuration
AI_SERVICE_URL=http://127.0.0.1:5000

# Environment
ENVIRONMENT=production

# Logging
LOG_LEVEL=info
EOF
    
    print_info "Created .env file with default configuration"
    print_warning "IMPORTANT: Edit $MIDDLEWARE_DIR/.env and change JWT_SECRET before production use!"
else
    print_info ".env file already exists"
fi

# Step 4: Download Go dependencies
print_info "Downloading Go dependencies..."
export PATH=/usr/local/go/bin:$PATH
go mod download

# Step 5: Build the middleware
print_info "Building middleware binary..."
export PATH=/usr/local/go/bin:$PATH
go build -o middleware main.go

# Verify binary was created
if [ -f "$MIDDLEWARE_DIR/middleware" ]; then
    print_info "Middleware binary built successfully"
    chmod +x $MIDDLEWARE_DIR/middleware
else
    print_error "Failed to build middleware binary"
    exit 1
fi

# Step 6: Create systemd service file
print_info "Creating systemd service file..."

cat > $SERVICE_FILE << EOF
[Unit]
Description=Tokkatot Smart Poultry Middleware Service
Documentation=https://github.com/somanithpreap/tokkatot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$MIDDLEWARE_DIR
ExecStart=$MIDDLEWARE_DIR/middleware
Restart=always
RestartSec=10
StartLimitInterval=0

# Output to systemd journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Environment
Environment="PATH=/usr/local/go/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
Environment="GIN_MODE=release"

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$MIDDLEWARE_DIR

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

print_info "Systemd service file created: $SERVICE_FILE"

# Step 7: Reload systemd
print_info "Reloading systemd daemon..."
systemctl daemon-reload

# Step 8: Enable service
print_info "Enabling $SERVICE_NAME service..."
systemctl enable $SERVICE_NAME.service

# Step 9: Start service
print_info "Starting $SERVICE_NAME service..."
systemctl start $SERVICE_NAME.service

# Wait a moment for service to start
sleep 3

# Step 10: Check service status
print_info "Checking service status..."

if systemctl is-active --quiet $SERVICE_NAME.service; then
    print_info "============================================"
    print_info "Middleware service started successfully!"
    print_info "============================================"
    echo ""
    systemctl status $SERVICE_NAME.service --no-pager
    echo ""
    print_info "Service is running and enabled at boot"
    print_info "Access the application at: http://10.0.0.1:4000"
    echo ""
    print_info "Useful commands:"
    echo "  Check status: sudo systemctl status $SERVICE_NAME"
    echo "  View logs: sudo journalctl -u $SERVICE_NAME -f"
    echo "  Restart service: sudo systemctl restart $SERVICE_NAME"
    echo "  Stop service: sudo systemctl stop $SERVICE_NAME"
    echo "  Disable service: sudo systemctl disable $SERVICE_NAME"
    echo ""
else
    print_error "Service failed to start!"
    print_error "Checking logs for errors..."
    journalctl -u $SERVICE_NAME.service -n 50 --no-pager
    exit 1
fi

# Step 11: Test the service
print_info "Testing middleware endpoint..."
sleep 2

if curl -s http://localhost:4000 > /dev/null; then
    print_info "Middleware is responding on port 4000"
else
    print_warning "Middleware may not be responding yet. Check logs with:"
    echo "  sudo journalctl -u $SERVICE_NAME -f"
fi

print_info "Setup complete!"
