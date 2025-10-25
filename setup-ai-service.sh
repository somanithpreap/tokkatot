#!/bin/bash
# Setup script for tokkatot-ai systemd service
# This script creates the systemd service file automatically

set -e

# Get the current directory (where the script is run from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_SERVICE_DIR="${SCRIPT_DIR}/ai-service"
CURRENT_USER=$(whoami)

echo "Setting up tokkatot-ai.service..."
echo "  User: ${CURRENT_USER}"
echo "  Working Directory: ${AI_SERVICE_DIR}"
echo "  Python venv: ${AI_SERVICE_DIR}/env/bin/python"

# Create the systemd service file
sudo tee /etc/systemd/system/tokkatot-ai.service > /dev/null <<EOF
[Unit]
Description=Tokkatot AI Service - Disease Detection API
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${AI_SERVICE_DIR}
Environment="PATH=${AI_SERVICE_DIR}/env/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=${AI_SERVICE_DIR}/env/bin/python app.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tokkatot-ai

[Install]
WantedBy=multi-user.target
EOF

echo "Service file created successfully!"

# Reload systemd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable the service
echo "Enabling tokkatot-ai.service..."
sudo systemctl enable tokkatot-ai.service

echo "✅ Setup complete! The service is now enabled and will start automatically."
echo ""
echo "To start the service now, run:"
echo "  sudo systemctl start tokkatot-ai.service"
echo ""
echo "To check status:"
echo "  systemctl status tokkatot-ai.service"
