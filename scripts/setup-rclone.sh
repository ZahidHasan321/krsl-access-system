#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Rclone Setup Script for KRSL Access System
#
# 1. Checks/Installs rclone (using official install script)
# 2. Automates configuration for 'gdrive' remote
# 3. Prompts user for OAuth code
# ============================================================

# --- 1. Install rclone ---
if command -v rclone &> /dev/null; then
    echo "✅ rclone is already installed."
    rclone version | head -n 1
else
    echo "⬇️  rclone not found. Installing via official script..."
    # The official script handles OS detection and installation
    if curl https://rclone.org/install.sh | sudo bash; then
        echo "✅ rclone installed successfully."
    else
        echo "❌ Failed to install rclone."
        exit 1
    fi
fi

# --- 2. Configure 'gdrive' remote ---
REMOTE_NAME="gdrive"

echo "-----------------------------------------------------"
echo "Checking rclone configuration..."

# Function to setup the remote
setup_remote() {
    echo "⚙️  Configuring '${REMOTE_NAME}' for Google Drive..."
    echo "   (This will launch the setup for a headless machine)"
    echo ""

    # 1. Create the remote config entry (non-interactive)
    #    This sets up the name, type, and scope, but leaves it unauthenticated.
    #    We redirect stderr to null to hide the "Config file not found" notice if it's new.
    rclone config create "$REMOTE_NAME" drive config_is_local=false > /dev/null 2>&1 || true

    echo "👉 PLEASE FOLLOW THESE STEPS:"
    echo "   1. You need have rclone installed in your local machine where a web browser is available."
    echo "   2. Press n and enter for remote authentication."
    echo "   3. Run the command rclone authorize drive in your local machine."
    echo "   4. Copy the verification code."
    echo "   5. Paste the code here and press Enter."
    echo ""
    echo "-----------------------------------------------------"

    # 2. Trigger the auth flow
    #    We pipe "n" to answer "Use auto config? (Y/n)"
    #    'cat' keeps the pipe open so you can paste the code.
    rclone config reconnect "${REMOTE_NAME}:"
}

if rclone listremotes | grep -q "^${REMOTE_NAME}:$"; then
    echo "✅ Remote '${REMOTE_NAME}' already exists."
    # Optional: Check if it actually works
    if rclone lsd "${REMOTE_NAME}:" > /dev/null 2>&1; then
        echo "   And it is authenticated correctly."
    else
        echo "⚠️  Remote exists but seems unauthenticated."
        read -p "   Do you want to re-authenticate it? [y/N] " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_remote
        fi
    fi
else
    setup_remote
fi
