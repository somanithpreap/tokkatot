#!/bin/bash

# ============================================
# GitHub Actions Runner Setup Script
# ============================================
# This script installs and configures a GitHub Actions
# self-hosted runner for the Tokkatot repository
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RUNNER_DIR="/opt/tokkatot/actions-runner"
RUNNER_VERSION="2.311.0"
REPO_URL="https://github.com/somanithpreap/tokkatot"
RUNNER_NAME="tokkatot-ubuntu-$(hostname)"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_info "============================================"
print_info "GitHub Actions Runner Setup"
print_info "============================================"
echo ""

# Step 1: Install dependencies
print_step "Installing dependencies..."
apt update
apt install -y curl jq libicu-dev

# Step 2: Create runner directory
print_step "Creating runner directory..."
mkdir -p $RUNNER_DIR
cd $RUNNER_DIR

# Step 3: Download GitHub Actions Runner
print_step "Downloading GitHub Actions Runner v$RUNNER_VERSION..."

RUNNER_FILE="actions-runner-linux-x64-$RUNNER_VERSION.tar.gz"

if [ ! -f "$RUNNER_FILE" ]; then
    curl -o $RUNNER_FILE -L "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/$RUNNER_FILE"
    print_info "Downloaded $RUNNER_FILE"
else
    print_info "Runner file already exists, skipping download"
fi

# Step 4: Extract runner
print_step "Extracting runner..."
if [ ! -f "run.sh" ]; then
    tar xzf $RUNNER_FILE
    print_info "Extracted runner files"
else
    print_info "Runner already extracted"
fi

# Step 5: Get runner token from user
print_info ""
print_info "============================================"
print_info "GitHub Runner Configuration"
print_info "============================================"
echo ""
print_warning "You need to get a registration token from GitHub"
echo ""
echo -e "${BLUE}Steps to get the token:${NC}"
echo "  1. Go to: $REPO_URL/settings/actions/runners/new"
echo "  2. Log in to GitHub if prompted"
echo "  3. Copy the token from the command shown on the page"
echo "  4. The token looks like: AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
echo ""
echo -e "${YELLOW}Press Enter to open the GitHub page in browser (if available)...${NC}"
read -r

# Try to open browser (may not work on headless servers)
if command -v xdg-open &> /dev/null; then
    xdg-open "$REPO_URL/settings/actions/runners/new" 2>/dev/null || true
fi

echo ""
read -p "Enter the GitHub runner token: " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    print_error "Token cannot be empty!"
    exit 1
fi

# Step 6: Configure runner
print_step "Configuring runner..."

# Prompt for custom runner name
read -p "Enter runner name (default: $RUNNER_NAME): " CUSTOM_NAME
if [ ! -z "$CUSTOM_NAME" ]; then
    RUNNER_NAME=$CUSTOM_NAME
fi

# Prompt for labels
read -p "Enter custom labels (comma-separated, default: ubuntu,self-hosted,tokkatot): " CUSTOM_LABELS
RUNNER_LABELS=${CUSTOM_LABELS:-"ubuntu,self-hosted,tokkatot"}

print_info "Configuring runner with:"
echo "  Name: $RUNNER_NAME"
echo "  Labels: $RUNNER_LABELS"
echo "  URL: $REPO_URL"
echo ""

# Run configuration as root (not recommended for production, but works for testing)
./config.sh \
    --url "$REPO_URL" \
    --token "$GITHUB_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABELS" \
    --work "_work" \
    --replace \
    --unattended

print_info "Runner configured successfully!"

# Step 7: Install as service
print_step "Installing runner as systemd service..."

./svc.sh install

print_info "Service installed"

# Step 8: Start service
print_step "Starting runner service..."

./svc.sh start

# Wait for service to start
sleep 3

# Step 9: Check service status
print_step "Checking service status..."

./svc.sh status

if ./svc.sh status | grep -q "active (running)"; then
    print_info "============================================"
    print_info "GitHub Actions Runner Setup Complete!"
    print_info "============================================"
    echo ""
    print_info "Runner Details:"
    echo "  Name: $RUNNER_NAME"
    echo "  Labels: $RUNNER_LABELS"
    echo "  Directory: $RUNNER_DIR"
    echo ""
    print_info "The runner is now connected to:"
    echo "  $REPO_URL"
    echo ""
    print_info "Verify the runner is online:"
    echo "  Go to: $REPO_URL/settings/actions/runners"
    echo ""
    print_info "Useful commands:"
    echo "  Check status: cd $RUNNER_DIR && sudo ./svc.sh status"
    echo "  View logs: cd $RUNNER_DIR && sudo journalctl -u actions.runner.* -f"
    echo "  Stop service: cd $RUNNER_DIR && sudo ./svc.sh stop"
    echo "  Start service: cd $RUNNER_DIR && sudo ./svc.sh start"
    echo "  Uninstall: cd $RUNNER_DIR && sudo ./svc.sh uninstall"
    echo ""
    print_warning "To remove the runner from GitHub:"
    echo "  1. Stop the service: cd $RUNNER_DIR && sudo ./svc.sh stop"
    echo "  2. Uninstall service: cd $RUNNER_DIR && sudo ./svc.sh uninstall"
    echo "  3. Get removal token from: $REPO_URL/settings/actions/runners"
    echo "  4. Run: ./config.sh remove --token <REMOVAL_TOKEN>"
    echo ""
else
    print_error "Service failed to start!"
    print_error "Check logs with: journalctl -u actions.runner.* -n 50"
    exit 1
fi

# Step 10: Display runner service name
SERVICE_NAME=$(systemctl list-units --type=service | grep "actions.runner" | awk '{print $1}' | head -n 1)
if [ ! -z "$SERVICE_NAME" ]; then
    print_info "Service name: $SERVICE_NAME"
    print_info "Check logs with: sudo journalctl -u $SERVICE_NAME -f"
fi

print_info "Setup complete!"
