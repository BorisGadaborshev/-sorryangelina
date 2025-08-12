#!/bin/bash

# Update server script for Sorry Angelina
# Run as root or with sudo

set -e

APP_DIR="/var/www/sorryangelina"

echo "🔄 Updating Sorry Angelina server..."

cd $APP_DIR

# Pull latest changes
git pull origin main

# Build server
echo "🔨 Building Node.js server..."
cd server
npm install --production
npm run build
cd ..

# Restart service
echo "🚀 Restarting server service..."
systemctl restart sorryangelina

echo "✅ Server update completed!"
echo "📊 Check service status: systemctl status sorryangelina"
echo "📝 View logs: journalctl -u sorryangelina -f"
