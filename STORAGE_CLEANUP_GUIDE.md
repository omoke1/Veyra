# 🧹 Storage Cleanup Guide

## Current System Status
- **Disk Usage**: 422GB / 460GB (97% full) ⚠️ **CRITICAL**
- **Available Space**: Only 16GB remaining

## 🔍 Storage Analysis

### Top Space Consumers

| Location | Size | Action Required |
|----------|------|-----------------|
| Bitcoin Blockchain | **61GB** | Manual cleanup (see below) |
| Docker | **25GB** | `docker system prune -a --volumes` |
| WhatsApp Media | **15GB** | WhatsApp Settings → Storage |
| pnpm Store | **13GB** | `pnpm store prune` |
| Google Data | **12GB** | Review & delete unused |
| Homebrew Cache | **4.9GB** | `brew cleanup --prune=all` |
| Cursor | **4.5GB** | Review if needed |
| Notion | **4.3GB** | Review if needed |

## ✅ Automatic Cleanup (Safe)

Run the cleanup script to remove safe caches:

```bash
cd /Users/abba/Desktop/Veyra
./cleanup-storage.sh
```

This will clean:
- ✅ Package manager caches (Homebrew, pnpm, npm)
- ✅ Build tool caches (TypeScript, Hardhat, node-gyp, CocoaPods, pip)
- ✅ Application caches (Playwright, Google, Electron, Telegram, WhatsApp, etc.)
- ✅ System caches (Python, Siri, etc.)

**Estimated space freed: ~30-40GB**

## 🔧 Manual Cleanup Required

### 1. Bitcoin Blockchain (61GB) - Largest Item

**Option A: Enable Pruned Node** (Recommended if you don't need full history)
- Reduces blockchain size to ~7GB
- Instructions: https://bitcoin.org/en/full-node#reduce-storage

**Option B: Move to External Drive**
```bash
# Move entire Bitcoin data directory
mv ~/Library/Application\ Support/Bitcoin /Volumes/[ExternalDrive]/Bitcoin
ln -s /Volumes/[ExternalDrive]/Bitcoin ~/Library/Application\ Support/Bitcoin
```

**Option C: Delete if not actively using**
```bash
# ⚠️ WARNING: This removes all Bitcoin wallet data!
# Only do this if you have backups
rm -rf ~/Library/Application\ Support/Bitcoin
```

### 2. Docker (25GB)

Clean unused Docker data:
```bash
# Remove all stopped containers, unused networks, images, and build cache
docker system prune -a --volumes

# Or remove specific unused images
docker image prune -a
```

### 3. WhatsApp Media (15GB)

1. Open WhatsApp Desktop
2. Settings → Storage → Manage Storage
3. Delete old media and files you don't need

Or manually:
```bash
# ⚠️ This removes all downloaded media - will re-download on next use
rm -rf ~/Library/Group\ Containers/group.net.whatsapp.WhatsApp.shared/*
```

### 4. pnpm Store (13GB)

If not cleaned by script:
```bash
pnpm store prune
```

### 5. Google Drive/Chrome (12GB)

Review:
- ~/Library/Application Support/Google/Chrome/Default/Cache
- ~/Library/Application Support/Google/Drive

Delete unused files or empty cache:
- Chrome: Settings → Privacy → Clear browsing data
- Google Drive: Check for offline files and delete unused

### 6. Rust Toolchain (5.9GB)

If you don't need multiple Rust versions:
```bash
rustup toolchain list  # See installed versions
rustup toolchain uninstall <version>  # Remove unused versions
```

### 7. Android SDK (2.5GB)

If not actively developing Android apps:
```bash
# Review and remove unused SDK components
# Or move to external drive
```

## 🚀 Quick Cleanup Commands

### All Safe Caches (One-liner)
```bash
cd /Users/abba/Desktop/Veyra && ./cleanup-storage.sh
```

### Package Managers
```bash
brew cleanup --prune=all
pnpm store prune
npm cache clean --force
pip cache purge
```

### Docker
```bash
docker system prune -a --volumes
```

### Development Tools
```bash
# TypeScript
rm -rf ~/Library/Caches/typescript/*

# Hardhat
rm -rf ~/Library/Caches/hardhat-nodejs/*

# Node-gyp
rm -rf ~/Library/Caches/node-gyp/*

# CocoaPods
pod cache clean --all || rm -rf ~/Library/Caches/CocoaPods/*
```

## 📊 Expected Results

After running automatic cleanup + manual cleanup of Docker:
- **Space freed**: ~50-60GB
- **New usage**: ~360-370GB / 460GB
- **New capacity**: ~80% (much safer!)

After Bitcoin cleanup:
- **Additional space**: ~61GB
- **Final usage**: ~300GB / 460GB
- **Final capacity**: ~65% ✅

## ⚠️ Warnings

1. **Bitcoin Data**: Only delete if you have wallet backups elsewhere
2. **Docker**: `docker system prune -a` removes ALL unused images/containers
3. **Application Caches**: Will regenerate on next use (may slow initial launch)
4. **WhatsApp Media**: Will need to re-download if accessed again

## 🔄 Maintenance Schedule

Run the cleanup script monthly:
```bash
# Add to crontab for monthly cleanup
0 0 1 * * /Users/abba/Desktop/Veyra/cleanup-storage.sh >> ~/cleanup.log 2>&1
```

## 📝 Additional Tips

1. **Monitor storage regularly**: `df -h` weekly
2. **Use Disk Utility** for large file visualization: 
   - Applications → Utilities → Disk Utility
   - Or use third-party tools like DaisyDisk, GrandPerspective
3. **Move large projects to external drive**
4. **Archive old files** instead of keeping them on main drive
5. **Use Time Machine** but exclude large caches from backups





