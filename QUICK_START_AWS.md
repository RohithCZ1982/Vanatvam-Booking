# Quick Start: Deploy to AWS in 30 Minutes

This is a condensed guide to get you deployed quickly. For detailed instructions, see [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md).

## Prerequisites Checklist

- [ ] AWS Account created
- [ ] AWS CLI installed (`aws --version`)
- [ ] Git repository ready
- [ ] Credit card on file (won't be charged if you stay in free tier)

## Step 1: Create RDS Database (5 minutes)

1. AWS Console → RDS → Create Database
2. Choose: PostgreSQL, Free tier template
3. Settings:
   - DB identifier: `vanatvam-db`
   - Master username: `postgres`
   - Master password: (create strong password)
   - Public access: **Yes**
4. Create database
5. **Save the endpoint URL!**

## Step 2: Launch EC2 Instance (5 minutes)

### Option A: Create Security Group First (Recommended)

1. **Create Security Group First:**
   - AWS Console → EC2 → Security Groups → Create Security Group
   - Name: `vanatvam-backend-sg`
   - Description: `Security group for Vanatvam backend`
   - VPC: Default VPC
   - **Inbound Rules:**
     - Type: SSH, Port: 22, Source: My IP (or 0.0.0.0/0 for testing)
     - Type: HTTP, Port: 80, Source: 0.0.0.0/0
     - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
     - Type: Custom TCP, Port: 8000, Source: 0.0.0.0/0
   - Create security group

2. **Launch Instance:**
   - AWS Console → EC2 → Launch Instance
   - Name: `vanatvam-backend`
   - AMI: Amazon Linux 2023
   - Instance: t2.micro (free tier)
   - Key pair: Create new, download `.pem` file
   - **Network settings:** Select existing security group → Choose `vanatvam-backend-sg`
   - Launch instance

### Option B: Configure During Launch

1. AWS Console → EC2 → Launch Instance
2. Settings:
   - Name: `vanatvam-backend`
   - AMI: Amazon Linux 2023
   - Instance: t2.micro (free tier)
   - Key pair: Create new, download `.pem` file
   - **Network settings:**
     - Click "Edit" next to Security groups
     - Create new security group
     - **Add rules one by one:**
       - SSH (22) from My IP
       - HTTP (80) from Anywhere (0.0.0.0/0)
       - HTTPS (443) from Anywhere (0.0.0.0/0)
       - Custom TCP (8000) from Anywhere (0.0.0.0/0)
3. Launch instance
4. **Save the public IP address!**

## Step 3: Setup EC2 (10 minutes)

### Option A: Using Setup Script (Recommended)

```bash
# 1. Connect to EC2
chmod 400 your-key.pem
ssh -i your-key.pem ec2-user@YOUR-EC2-IP
# For Ubuntu, use: ssh -i your-key.pem ubuntu@YOUR-EC2-IP

# 2. Clone repository (if not already done)
cd ~
git clone https://github.com/yourusername/Vanatvam-Booking.git
cd Vanatvam-Booking/backend

# 3. Run automated setup script
bash setup-ec2.sh

# 4. Edit environment variables
nano .env
# Update:
# - DATABASE_URL with your RDS endpoint
# - SECRET_KEY (generate a random string)
# - FRONTEND_URL (update after deploying frontend)

# 5. Deploy backend
./deploy.sh
```

### Option B: Manual Setup

If you prefer manual setup or the script fails:

```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@YOUR-EC2-IP

# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt-get update && sudo apt-get upgrade -y  # Ubuntu

# Install dependencies
sudo yum install python3.11 python3.11-pip git nginx -y  # Amazon Linux
# OR
sudo apt-get install python3.11 python3.11-pip python3.11-venv git nginx -y  # Ubuntu

# Clone repository
cd ~
git clone https://github.com/yourusername/Vanatvam-Booking.git
cd Vanatvam-Booking/backend

# Setup Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
nano .env
# Add your configuration

# Follow remaining steps from AWS_DEPLOYMENT_GUIDE.md
```

## Step 4: Deploy Frontend to Amplify (10 minutes)

1. AWS Console → Amplify → New app → Host web app
2. Connect your Git repository
3. App settings:
   - App name: `vanatvam-frontend`
   - Build settings: Auto-detect (React)
4. Environment variables:
   - `REACT_APP_API_URL` = `http://YOUR-EC2-IP`
5. Save and deploy
6. **Save the Amplify URL!**

## Step 5: Update Backend CORS

On your EC2 instance:

```bash
# Edit main.py to add Amplify URL to CORS
nano main.py
# Add your Amplify URL to allow_origins

# Restart service
sudo systemctl restart vanatvam-backend
```

## Step 6: Test Everything

1. Visit your Amplify URL
2. Try logging in
3. Check backend logs: `sudo journalctl -u vanatvam-backend -f`

## Troubleshooting

**Backend not accessible?**
- Check security group allows port 8000
- Check service: `sudo systemctl status vanatvam-backend`

**Database connection failed?**
- Verify RDS security group allows EC2 security group
- Check `.env` DATABASE_URL is correct

**Frontend can't connect to backend?**
- Verify `REACT_APP_API_URL` in Amplify
- Check CORS settings in backend

## Cost Monitoring

- Set up billing alerts in AWS Console
- Monitor in Cost Explorer
- Free tier limits:
  - EC2: 750 hours/month
  - RDS: 750 hours/month
  - Amplify: Usually free for small apps

## Next Steps

- [ ] Set up custom domain
- [ ] Configure SSL certificates
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Set up CI/CD with GitHub Actions

## Need Help?

See the full [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) for detailed instructions.
