#!/bin/bash

# Initial EC2 Setup Script
# Run this ONCE when first setting up your EC2 instance
# Run as: bash ec2-setup.sh

set -e

echo "🔧 Setting up EC2 instance for Vanatvam Backend..."

# Update system
echo "📦 Updating system packages..."
sudo yum update -y || sudo apt-get update && sudo apt-get upgrade -y

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo yum install python3.11 python3.11-pip git -y || \
sudo apt-get install python3.11 python3.11-pip python3.11-venv git -y

# Install PostgreSQL (optional - if not using RDS)
read -p "Install PostgreSQL on this instance? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🐘 Installing PostgreSQL..."
    sudo yum install postgresql15 postgresql15-server -y || \
    sudo apt-get install postgresql postgresql-contrib -y
    
    echo "🔧 Initializing PostgreSQL..."
    sudo postgresql-setup initdb || sudo /usr/lib/postgresql/*/bin/pg_ctl initdb -D /var/lib/postgresql/data
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Install Nginx
echo "🌐 Installing Nginx..."
sudo yum install nginx -y || sudo apt-get install nginx -y

# Clone repository
echo "📥 Cloning repository..."
cd ~
if [ -d "Vanatvam-Booking" ]; then
    echo "⚠️  Repository already exists. Pulling latest changes..."
    cd Vanatvam-Booking
    git pull
else
    read -p "Enter your Git repository URL: " REPO_URL
    git clone $REPO_URL Vanatvam-Booking
    cd Vanatvam-Booking
fi

# Setup backend
echo "🔧 Setting up backend..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/vanatvam-backend.service > /dev/null <<EOF
[Unit]
Description=Vanatvam Backend API
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin"
ExecStart=$(pwd)/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Setup Nginx
echo "🌐 Configuring Nginx..."
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
sudo tee /etc/nginx/conf.d/vanatvam.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $EC2_IP;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable and start services
echo "🚀 Enabling services..."
sudo systemctl daemon-reload
sudo systemctl enable vanatvam-backend
sudo systemctl enable nginx

# Make deploy script executable
chmod +x deploy.sh

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit backend/.env with your configuration"
echo "2. Run: cd backend && ./deploy.sh"
echo "3. Check status: sudo systemctl status vanatvam-backend"
echo "4. View logs: sudo journalctl -u vanatvam-backend -f"
