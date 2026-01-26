#!/bin/bash

# Update Code from Git on EC2
# This script pulls latest code and redeploys the backend

set -e

echo "🔄 Updating code from Git..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
cd ~/Vanatvam-Booking

# Check if git repository exists
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository. Please clone the repository first.${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main || git pull origin master

# Check if there are changes
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code updated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to pull changes. Check your git configuration.${NC}"
    exit 1
fi

# Navigate to backend directory
cd backend

# Run deployment script
echo -e "${YELLOW}🚀 Redeploying backend...${NC}"
./deploy.sh

echo -e "${GREEN}🎉 Update complete!${NC}"
