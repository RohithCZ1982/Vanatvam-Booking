#!/bin/bash

# Vanatvam Backend Deployment Script for EC2
# Run this script on your EC2 instance after initial setup

set -e

echo "🚀 Starting Vanatvam Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Please do not run as root"
   exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")"
BACKEND_DIR=$(pwd)

echo -e "${YELLOW}📁 Backend directory: $BACKEND_DIR${NC}"

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3.11 -m venv venv
fi

echo -e "${YELLOW}🔌 Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vanatvam

# JWT
SECRET_KEY=change-this-to-a-random-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL
FRONTEND_URL=https://your-amplify-app.amplifyapp.com

# Email (Optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
FROM_EMAIL=
EOF
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual values!${NC}"
    exit 1
fi

# Run database migrations (if using Alembic)
# Uncomment if you have Alembic setup
# echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
# alembic upgrade head

# Restart service
echo -e "${YELLOW}🔄 Restarting service...${NC}"
sudo systemctl restart vanatvam-backend

# Wait a moment
sleep 2

# Check service status
if sudo systemctl is-active --quiet vanatvam-backend; then
    echo -e "${GREEN}✅ Service is running!${NC}"
    echo -e "${GREEN}📊 Service status:${NC}"
    sudo systemctl status vanatvam-backend --no-pager -l
else
    echo -e "${YELLOW}❌ Service failed to start. Check logs:${NC}"
    echo "sudo journalctl -u vanatvam-backend -f"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
