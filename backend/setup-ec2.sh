#!/bin/bash

# Complete EC2 Setup Script for Vanatvam Backend
# This script automates Step 3 from QUICK_START_AWS.md
# Run this on your EC2 instance after connecting via SSH

set -e

echo "🚀 Vanatvam Backend - EC2 Setup Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run as root. Run as ec2-user or ubuntu${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}❌ Cannot detect OS${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Detected OS: $OS${NC}"
echo ""

# Step 1: Update system
echo -e "${YELLOW}📦 Step 1/8: Updating system packages...${NC}"
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get update -y
    sudo apt-get upgrade -y
fi
echo -e "${GREEN}✅ System updated${NC}"
echo ""

# Step 2: Install Python 3.11
echo -e "${YELLOW}🐍 Step 2/8: Installing Python 3.11...${NC}"
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ]; then
    sudo yum install -y python3.11 python3.11-pip git
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y python3.11 python3.11-pip python3.11-venv git
fi
echo -e "${GREEN}✅ Python 3.11 installed${NC}"
echo ""

# Step 3: Install Nginx
echo -e "${YELLOW}🌐 Step 3/8: Installing Nginx...${NC}"
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ]; then
    sudo yum install -y nginx
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y nginx
fi
echo -e "${GREEN}✅ Nginx installed${NC}"
echo ""

# Step 4: Clone repository
echo -e "${YELLOW}📥 Step 4/8: Setting up repository...${NC}"
cd ~
if [ -d "Vanatvam-Booking" ]; then
    echo -e "${YELLOW}⚠️  Repository exists. Pulling latest changes...${NC}"
    cd Vanatvam-Booking
    git pull || echo -e "${YELLOW}⚠️  Git pull failed. Continuing with existing code...${NC}"
else
    echo -e "${YELLOW}Enter your Git repository URL (or press Enter to skip):${NC}"
    read -r REPO_URL
    if [ -n "$REPO_URL" ]; then
        git clone "$REPO_URL" Vanatvam-Booking
        cd Vanatvam-Booking
    else
        echo -e "${YELLOW}⚠️  No repository URL provided. You'll need to clone manually.${NC}"
        echo -e "${YELLOW}   Create directory structure...${NC}"
        mkdir -p Vanatvam-Booking/backend
        cd Vanatvam-Booking/backend
        echo -e "${YELLOW}⚠️  Please copy your backend files to ~/Vanatvam-Booking/backend/ manually${NC}"
    fi
fi
echo -e "${GREEN}✅ Repository ready${NC}"
echo ""

# Step 5: Setup backend
echo -e "${YELLOW}🔧 Step 5/8: Setting up backend...${NC}"
cd ~/Vanatvam-Booking/backend

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ requirements.txt not found!${NC}"
    echo -e "${YELLOW}   Please ensure backend files are in ~/Vanatvam-Booking/backend/${NC}"
    exit 1
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3.11 -m venv venv
fi

echo -e "${YELLOW}🔌 Activating virtual environment...${NC}"
source venv/bin/activate

echo -e "${YELLOW}📥 Installing Python dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Step 6: Create systemd service
echo -e "${YELLOW}⚙️  Step 6/8: Creating systemd service...${NC}"
CURRENT_USER=$(whoami)
CURRENT_DIR=$(pwd)

sudo tee /etc/systemd/system/vanatvam-backend.service > /dev/null <<EOF
[Unit]
Description=Vanatvam Backend API
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment="PATH=$CURRENT_DIR/venv/bin"
ExecStart=$CURRENT_DIR/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vanatvam-backend

echo -e "${GREEN}✅ Systemd service created${NC}"
echo ""

# Step 7: Setup Nginx
echo -e "${YELLOW}🌐 Step 7/8: Configuring Nginx...${NC}"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "localhost")

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

# Test Nginx configuration
sudo nginx -t

sudo systemctl enable nginx
sudo systemctl start nginx

echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

# Step 8: Create .env template if it doesn't exist
echo -e "${YELLOW}📝 Step 8/8: Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Creating .env template...${NC}"
    cat > .env << 'ENVEOF'
# Database Configuration
# For RDS: postgresql://username:password@your-rds-endpoint:5432/postgres
# For local: postgresql://postgres:password@localhost:5432/vanatvam
DATABASE_URL=postgresql://user:password@localhost:5432/vanatvam

# JWT Configuration
SECRET_KEY=change-this-to-a-random-secret-key-min-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL (update after deploying frontend)
FRONTEND_URL=http://localhost:3000

# Email Configuration (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=
ENVEOF
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env file with your actual configuration!${NC}"
    echo -e "${YELLOW}   Run: nano ~/Vanatvam-Booking/backend/.env${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Make deploy script executable
chmod +x deploy.sh 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ EC2 Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo ""
echo "1. Edit environment variables:"
echo "   nano ~/Vanatvam-Booking/backend/.env"
echo ""
echo "2. Update DATABASE_URL with your RDS endpoint or local PostgreSQL"
echo ""
echo "3. Deploy the backend:"
echo "   cd ~/Vanatvam-Booking/backend"
echo "   ./deploy.sh"
echo ""
echo "4. Check service status:"
echo "   sudo systemctl status vanatvam-backend"
echo ""
echo "5. View logs:"
echo "   sudo journalctl -u vanatvam-backend -f"
echo ""
echo "6. Test the API:"
echo "   curl http://localhost:8000/api/health"
echo "   curl http://$EC2_IP/api/health"
echo ""
