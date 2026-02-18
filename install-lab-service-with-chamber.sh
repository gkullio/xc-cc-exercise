#!/usr/bin/env bash
set -euo pipefail

LAB_DIR="/opt/capsule-lab"
SERVICE_NAME="capsule-lab"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: must run as root (use sudo)"
  exit 1
fi

# Ensure docker is installed
if ! command -v docker &>/dev/null; then
  echo "Error: docker is not installed"
  exit 1
fi

# Create lab directory and copy compose file
echo "Installing compose file to ${LAB_DIR}..."
mkdir -p "$LAB_DIR"
cp "$SCRIPT_DIR/docker-compose.lab-chamber.yml" "$LAB_DIR/docker-compose.yml"

# Install systemd service
echo "Installing systemd service..."
cp "$SCRIPT_DIR/systemd/${SERVICE_NAME}.service" "/etc/systemd/system/${SERVICE_NAME}.service"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo "Starting ${SERVICE_NAME}..."
systemctl start "$SERVICE_NAME"

echo ""
echo "Done. The lab will pull fresh images and start on every boot."
echo ""
echo "  Status:   systemctl status ${SERVICE_NAME}"
echo "  Logs:     journalctl -u ${SERVICE_NAME}"
echo "  Restart:  systemctl restart ${SERVICE_NAME}"
