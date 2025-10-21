# 🔧 Deployment Troubleshooting Guide

## ❌ Error: "chmod: cannot access 'scripts/*.sh': No such file or directory"

This error means you're either:
1. Running commands on wrong machine (Windows PC instead of Raspberry Pi)
2. In the wrong directory on Raspberry Pi
3. Repository wasn't cloned properly

---

## ✅ Solution: Step-by-Step Fix

### Step 1: Connect to Your Raspberry Pi

**From your Windows PC, open PowerShell and SSH to your Pi:**

```powershell
# Replace <pi-ip> with your actual Raspberry Pi IP address
# Example: ssh ubuntu@192.168.1.100
ssh ubuntu@<your-raspberry-pi-ip>
```

**Common ways to find your Pi's IP:**
- Check your router's connected devices
- If Pi has monitor: run `hostname -I` on the Pi
- Use network scanner: `arp -a` on Windows

**First time login:**
- Default username: `ubuntu`
- Default password: `ubuntu` (will ask you to change it)

---

### Step 2: Verify You're ON the Raspberry Pi

After SSH login, you should see:

```
ubuntu@tokkatot-server:~$
```

or

```
ubuntu@ubuntu:~$
```

**NOT** `PS C:\Users\PureGoat\tokkatot>`  ← This is your Windows PC!

---

### Step 3: Check Current Directory

```bash
# See where you are
pwd

# Should show something like:
# /home/ubuntu
```

---

### Step 4: Navigate to Correct Directory

```bash
# Go to tokkatot directory
cd /opt/tokkatot

# Verify you're in the right place
pwd
# Should show: /opt/tokkatot

# List files
ls -la
```

**Expected output:**
```
drwxr-xr-x  scripts/
drwxr-xr-x  middleware/
drwxr-xr-x  frontend/
drwxr-xr-x  ai-service/
-rw-r--r--  README.md
```

---

### Step 5: Make Scripts Executable

```bash
# Now this should work:
chmod +x scripts/*.sh

# Verify
ls -la scripts/

# Should show scripts with 'x' permission:
# -rwxr-xr-x  deploy-all.sh
# -rwxr-xr-x  setup-access-point.sh
```

---

### Step 6: Run Deployment

```bash
# Make sure you're in /opt/tokkatot
cd /opt/tokkatot

# Run deployment
sudo bash scripts/deploy-all.sh
```

---

## 🚨 Common Issues

### Issue 1: Directory Doesn't Exist

**Error:**
```
cd: no such file or directory: /opt/tokkatot
```

**Solution:**
```bash
# Create and clone repository
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .
```

---

### Issue 2: Git Not Installed

**Error:**
```
bash: git: command not found
```

**Solution:**
```bash
sudo apt update
sudo apt install -y git
```

---

### Issue 3: Permission Denied

**Error:**
```
Permission denied
```

**Solution:**
```bash
# Give yourself ownership
sudo chown -R $USER:$USER /opt/tokkatot

# Then try again
chmod +x scripts/*.sh
```

---

### Issue 4: Repository Already Cloned But Wrong Location

**Check if repo exists elsewhere:**
```bash
# Search for tokkatot
find /home -name "tokkatot" 2>/dev/null
find /opt -name "tokkatot" 2>/dev/null

# If found in wrong place, move it
sudo mv ~/tokkatot /opt/tokkatot
sudo chown -R $USER:$USER /opt/tokkatot
```

---

## 📋 Complete Fresh Start (If Everything Failed)

If you want to start completely fresh:

### On Raspberry Pi (via SSH):

```bash
# Remove old installation
sudo rm -rf /opt/tokkatot

# Create fresh directory
sudo mkdir -p /opt/tokkatot
sudo chown $USER:$USER /opt/tokkatot

# Update system
sudo apt update
sudo apt upgrade -y

# Install git
sudo apt install -y git

# Clone repository
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .

# Verify clone succeeded
ls -la

# Make scripts executable
chmod +x scripts/*.sh

# Run deployment
sudo bash scripts/deploy-all.sh
```

---

## 🎯 Complete Deployment Commands (Copy-Paste Ready)

**Run these commands ONE BY ONE on your Raspberry Pi:**

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install git
sudo apt install -y git

# 3. Create directory
sudo mkdir -p /opt/tokkatot

# 4. Set ownership
sudo chown $USER:$USER /opt/tokkatot

# 5. Go to directory
cd /opt/tokkatot

# 6. Clone repository
git clone https://github.com/somanithpreap/tokkatot.git .

# 7. Verify clone
ls -la

# 8. Make scripts executable
chmod +x scripts/*.sh

# 9. Run deployment
sudo bash scripts/deploy-all.sh
```

---

## 🔍 Verification Commands

After each step, verify it worked:

```bash
# Verify git installed
git --version
# Should show: git version 2.x.x

# Verify directory exists
ls -la /opt/tokkatot
# Should show files

# Verify scripts are executable
ls -la /opt/tokkatot/scripts/
# Should show -rwxr-xr-x (x means executable)

# Verify you're in correct directory
pwd
# Should show: /opt/tokkatot
```

---

## 💡 Understanding the Error

### Windows PowerShell (Your PC):
```powershell
PS C:\Users\PureGoat\tokkatot> chmod +x scripts/*.sh
# ❌ WRONG - This tries to run on Windows!
# Windows doesn't have chmod command
# You're in the wrong location
```

### Linux Terminal (Raspberry Pi):
```bash
ubuntu@ubuntu:/opt/tokkatot$ chmod +x scripts/*.sh
# ✅ CORRECT - This runs on Raspberry Pi
# Linux has chmod command
# You're in the right location
```

---

## 🎓 Key Points

1. **SSH = Remote connection to Raspberry Pi**
   - You type commands in PowerShell on Windows
   - But they execute on Raspberry Pi
   - After `ssh ubuntu@<ip>`, you're "inside" the Pi

2. **File locations are different:**
   - Windows: `C:\Users\PureGoat\tokkatot`
   - Raspberry Pi: `/opt/tokkatot`
   - These are TWO DIFFERENT places!

3. **Commands must run on Pi:**
   - `chmod`, `bash`, `sudo` = Linux commands
   - Must run after SSH login
   - Won't work in Windows PowerShell

---

## 📱 Quick Reference

### Where am I?

```bash
# Windows PowerShell:
PS C:\Users\...>

# Raspberry Pi SSH:
ubuntu@ubuntu:~$
# or
tokkatot@tokkatot-server:~$
```

### How to connect?

```powershell
# From Windows PowerShell:
ssh ubuntu@<raspberry-pi-ip>

# Example:
ssh ubuntu@192.168.1.100
```

### Where should I run commands?

| Command | Where to Run |
|---------|--------------|
| `ssh ubuntu@<ip>` | Windows PowerShell |
| `chmod +x scripts/*.sh` | Raspberry Pi (after SSH) |
| `sudo bash scripts/deploy-all.sh` | Raspberry Pi (after SSH) |
| `git clone ...` | Raspberry Pi (after SSH) |
| All Linux commands | Raspberry Pi (after SSH) |

---

## ✅ Correct Workflow

### Step 1: Open PowerShell on Windows
```powershell
# You see:
PS C:\Users\PureGoat>
```

### Step 2: SSH to Raspberry Pi
```powershell
ssh ubuntu@192.168.1.100
# Enter password
```

### Step 3: Now you're ON the Pi
```bash
# You see:
ubuntu@ubuntu:~$

# All commands run on Pi now!
```

### Step 4: Navigate and Deploy
```bash
cd /opt/tokkatot
chmod +x scripts/*.sh
sudo bash scripts/deploy-all.sh
```

---

## 🆘 Still Stuck?

### Check These:

1. **Are you connected to Pi via SSH?**
   ```bash
   # Run this - if it shows your Windows username, you're NOT on Pi
   whoami
   
   # Should show: ubuntu
   # NOT: PureGoat
   ```

2. **Is repository cloned?**
   ```bash
   ls /opt/tokkatot
   # Should show files, not "No such file"
   ```

3. **Are you in correct directory?**
   ```bash
   pwd
   # Should show: /opt/tokkatot
   ```

4. **Do scripts exist?**
   ```bash
   ls -la scripts/
   # Should show .sh files
   ```

---

## 🎯 Success Indicators

You'll know it's working when:

✅ SSH login shows `ubuntu@...`  
✅ `pwd` shows `/opt/tokkatot`  
✅ `ls` shows `scripts/`, `middleware/`, `frontend/`  
✅ `chmod +x scripts/*.sh` runs without errors  
✅ `sudo bash scripts/deploy-all.sh` starts deployment  

---

## 📞 Quick Help Commands

```bash
# Where am I?
pwd

# Who am I?
whoami

# What's in this folder?
ls -la

# Is this a Raspberry Pi?
uname -a
# Should show: Linux ... aarch64 or armv7l

# Go to tokkatot directory
cd /opt/tokkatot

# Start over (fresh clone)
cd ~
sudo rm -rf /opt/tokkatot
sudo mkdir -p /opt/tokkatot && sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .
```

---

## 🚀 Ready to Try Again?

From your Windows PowerShell:

```powershell
# 1. SSH to Pi (replace <ip> with actual IP)
ssh ubuntu@<your-pi-ip>

# 2. Then run these commands on the Pi:
```

From Raspberry Pi (after SSH):

```bash
sudo apt update && sudo apt install -y git
sudo mkdir -p /opt/tokkatot && sudo chown $USER:$USER /opt/tokkatot
cd /opt/tokkatot
git clone https://github.com/somanithpreap/tokkatot.git .
chmod +x scripts/*.sh
sudo bash scripts/deploy-all.sh
```

**That's it!** 🎉

---

Good luck! If you're still having issues, let me know which step is failing!
