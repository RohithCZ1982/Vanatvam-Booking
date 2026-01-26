# Quick Fix: apt-get Command Not Found

If you're getting "apt-get: command not found" error, you're on **Amazon Linux** (not Ubuntu). Amazon Linux uses `yum` instead of `apt-get`.

## Quick Fix

Since you're on Amazon Linux, use `yum` commands:

```bash
# Install Git
sudo yum install git -y

# Install Python
sudo yum install python3 python3-pip -y

# Install Nginx
sudo yum install nginx -y
```

## Updated Setup Script

The setup script has been updated to automatically detect your system and use the correct package manager. Just run:

```bash
cd ~/Vanatvam-Booking/backend
bash ec2-setup.sh
```

The script will now:
- ✅ Auto-detect if you're on Amazon Linux (yum) or Ubuntu (apt-get)
- ✅ Use the correct package manager commands
- ✅ Handle Python version detection automatically

## Manual Installation (If Script Still Fails)

### For Amazon Linux:

```bash
# Update system
sudo yum update -y

# Install Git
sudo yum install git -y

# Install Python 3
sudo yum install python3 python3-pip -y

# Install Nginx
sudo yum install nginx -y

# Install PostgreSQL (if not using RDS)
sudo yum install postgresql15 postgresql15-server -y
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### For Ubuntu (if you switch):

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Git
sudo apt-get install git -y

# Install Python 3
sudo apt-get install python3 python3-pip python3-venv -y

# Install Nginx
sudo apt-get install nginx -y

# Install PostgreSQL (if not using RDS)
sudo apt-get install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Verify Your System

To check which Linux distribution you're on:

```bash
# Check OS
cat /etc/os-release

# Amazon Linux will show:
# NAME="Amazon Linux"
# ID="amzn"

# Ubuntu will show:
# NAME="Ubuntu"
# ID="ubuntu"
```

## Continue Setup

After installing the required packages manually:

```bash
# Clone repository (if not done)
cd ~
git clone https://github.com/yourusername/Vanatvam-Booking.git
cd Vanatvam-Booking/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Continue with setup
# Edit .env file
nano .env

# Create database tables
python3 -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"

# Deploy
./deploy.sh
```

## Package Manager Reference

| Task | Amazon Linux (yum) | Ubuntu (apt-get) |
|------|---------------------|------------------|
| Update | `sudo yum update -y` | `sudo apt-get update && sudo apt-get upgrade -y` |
| Install Git | `sudo yum install git -y` | `sudo apt-get install git -y` |
| Install Python | `sudo yum install python3 python3-pip -y` | `sudo apt-get install python3 python3-pip python3-venv -y` |
| Install Nginx | `sudo yum install nginx -y` | `sudo apt-get install nginx -y` |
| Install PostgreSQL | `sudo yum install postgresql15 postgresql15-server -y` | `sudo apt-get install postgresql postgresql-contrib -y` |

The updated setup script handles all of this automatically! 🎉
