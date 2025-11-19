#!/bin/bash

# Storage Cleanup Script for macOS
# This script removes safe-to-delete cache files and temporary data
# Review each section before running if you're unsure

set -e

echo "🧹 Starting storage cleanup..."
echo "Current disk usage:"
df -h / | tail -1

TOTAL_FREED=0

# Function to calculate freed space
free_space() {
    local path=$1
    if [ -d "$path" ]; then
        local size=$(du -sk "$path" 2>/dev/null | cut -f1)
        local size_mb=$((size / 1024))
        TOTAL_FREED=$((TOTAL_FREED + size_mb))
        echo "  ✓ Freed ~${size_mb}MB from $path"
    fi
}

echo ""
echo "📦 Cleaning package manager caches..."

# Homebrew cache
if [ -d ~/Library/Caches/Homebrew ]; then
    echo "  Cleaning Homebrew cache..."
    brew cleanup --prune=all 2>/dev/null || rm -rf ~/Library/Caches/Homebrew/* 2>/dev/null
    free_space ~/Library/Caches/Homebrew
fi

# pnpm cache
if [ -d ~/Library/Caches/pnpm ]; then
    echo "  Cleaning pnpm cache (5.5GB)..."
    pnpm store prune 2>/dev/null || rm -rf ~/Library/Caches/pnpm/* 2>/dev/null
    free_space ~/Library/Caches/pnpm
fi

# npm cache
if [ -d ~/.npm ]; then
    echo "  Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || rm -rf ~/.npm/* 2>/dev/null
    free_space ~/.npm
fi

echo ""
echo "🔨 Cleaning build caches..."

# TypeScript cache
if [ -d ~/Library/Caches/typescript ]; then
    echo "  Cleaning TypeScript cache..."
    rm -rf ~/Library/Caches/typescript/* 2>/dev/null
    free_space ~/Library/Caches/typescript
fi

# Hardhat cache
if [ -d ~/Library/Caches/hardhat-nodejs ]; then
    echo "  Cleaning Hardhat cache..."
    rm -rf ~/Library/Caches/hardhat-nodejs/* 2>/dev/null
    free_space ~/Library/Caches/hardhat-nodejs
fi

# Node-gyp cache
if [ -d ~/Library/Caches/node-gyp ]; then
    echo "  Cleaning node-gyp cache..."
    rm -rf ~/Library/Caches/node-gyp/* 2>/dev/null
    free_space ~/Library/Caches/node-gyp
fi

# CocoaPods cache
if [ -d ~/Library/Caches/CocoaPods ]; then
    echo "  Cleaning CocoaPods cache..."
    pod cache clean --all 2>/dev/null || rm -rf ~/Library/Caches/CocoaPods/* 2>/dev/null
    free_space ~/Library/Caches/CocoaPods
fi

# pip cache
if [ -d ~/Library/Caches/pip ]; then
    echo "  Cleaning pip cache..."
    pip cache purge 2>/dev/null || rm -rf ~/Library/Caches/pip/* 2>/dev/null
    free_space ~/Library/Caches/pip
fi

# Rust cargo cache (if you want to clean old builds)
# Uncomment if needed:
# if [ -d ~/.cargo ]; then
#     echo "  Cleaning Cargo registry cache..."
#     cargo cache --autoclean 2>/dev/null || true
# fi

echo ""
echo "🎭 Cleaning application caches..."

# Playwright cache
if [ -d ~/Library/Caches/ms-playwright ]; then
    echo "  Cleaning Playwright cache..."
    rm -rf ~/Library/Caches/ms-playwright/* 2>/dev/null
    free_space ~/Library/Caches/ms-playwright
fi

# Google Chrome/Chromium caches
if [ -d ~/Library/Caches/Google ]; then
    echo "  Cleaning Google caches (3.6GB)..."
    # Keep last 30 days
    find ~/Library/Caches/Google -type f -mtime +30 -delete 2>/dev/null || true
    free_space ~/Library/Caches/Google
fi

# Electron caches
if [ -d ~/Library/Caches/electron ]; then
    echo "  Cleaning Electron caches..."
    rm -rf ~/Library/Caches/electron/* 2>/dev/null
    free_space ~/Library/Caches/electron
fi

# Telegram cache
if [ -d ~/Library/Caches/ru.keepcoder.Telegram ]; then
    echo "  Cleaning Telegram cache..."
    rm -rf ~/Library/Caches/ru.keepcoder.Telegram/* 2>/dev/null
    free_space ~/Library/Caches/ru.keepcoder.Telegram
fi

# WhatsApp cache
if [ -d ~/Library/Caches/net.whatsapp.WhatsApp ]; then
    echo "  Cleaning WhatsApp cache..."
    rm -rf ~/Library/Caches/net.whatsapp.WhatsApp/* 2>/dev/null
    free_space ~/Library/Caches/net.whatsapp.WhatsApp
fi

# Postman cache
if [ -d ~/Library/Caches/com.postmanlabs.agent.mac.ShipIt ]; then
    echo "  Cleaning Postman cache..."
    rm -rf ~/Library/Caches/com.postmanlabs.agent.mac.ShipIt/* 2>/dev/null
    free_space ~/Library/Caches/com.postmanlabs.agent.mac.ShipIt
fi

# Slack cache
if [ -d ~/Library/Caches/com.tinyspeck.slackmacgap.ShipIt ]; then
    echo "  Cleaning Slack cache..."
    rm -rf ~/Library/Caches/com.tinyspeck.slackmacgap.ShipIt/* 2>/dev/null
    free_space ~/Library/Caches/com.tinyspeck.slackmacgap.ShipIt
fi

# Siri cache
if [ -d ~/Library/Caches/SiriTTS ]; then
    echo "  Cleaning Siri cache..."
    rm -rf ~/Library/Caches/SiriTTS/* 2>/dev/null
    free_space ~/Library/Caches/SiriTTS
fi

echo ""
echo "🗑️  Cleaning system caches..."

# Python cache
if [ -d ~/Library/Caches/com.apple.python ]; then
    echo "  Cleaning Python system cache..."
    rm -rf ~/Library/Caches/com.apple.python/* 2>/dev/null
    free_space ~/Library/Caches/com.apple.python
fi

echo ""
echo "📊 Cleanup Summary:"
echo "  Estimated space freed: ~${TOTAL_FREED}MB"
echo ""
echo "Current disk usage:"
df -h / | tail -1

echo ""
echo "✅ Automatic cleanup complete!"
echo ""
echo "⚠️  MANUAL CLEANUP REQUIRED for large items:"
echo "  • Bitcoin blockchain: ~61GB at ~/Library/Application Support/Bitcoin"
echo "     → If using a full node, consider pruned mode or moving to external drive"
echo ""
echo "  • Docker: ~25GB at ~/Library/Containers/com.docker.docker"
echo "     → Run: docker system prune -a --volumes"
echo ""
echo "  • WhatsApp media: ~15GB at ~/Library/Group Containers/group.net.whatsapp.WhatsApp.shared"
echo "     → Open WhatsApp → Settings → Storage → Manage Storage"
echo ""
echo "  • Google Drive/Chrome data: ~12GB at ~/Library/Application Support/Google"
echo "     → Review and delete unnecessary files"
echo ""
echo "  • pnpm store: ~13GB at ~/Library/pnpm"
echo "     → Run: pnpm store prune (if not done above)"
echo ""

