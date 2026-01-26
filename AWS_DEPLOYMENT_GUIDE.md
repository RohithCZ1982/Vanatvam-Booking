# AWS Deployment Guide for Vanatvam Booking System

This guide will help you deploy your React frontend and FastAPI backend to AWS using the free tier.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS Account Setup](#aws-account-setup)
3. [Database Setup (RDS PostgreSQL)](#database-setup-rds-postgresql)
4. [Backend Deployment (EC2)](#backend-deployment-ec2)
5. [Frontend Deployment (Amplify)](#frontend-deployment-amplify)
6. [Environment Variables](#environment-variables)
7. [Domain Setup (Optional)](#domain-setup-optional)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- AWS Account (Free tier eligible)
- AWS CLI installed and configured
- Git repository (GitHub, GitLab, or Bitbucket)
- Basic knowledge of AWS services

---

## AWS Account Setup

1. **Create AWS Account**
   - Go to https://aws.amazon.com
   - Sign up for free tier account
   - Verify your email and payment method (won't be charged if you stay within free tier)

2. **Install AWS CLI**
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   sudo apt-get install awscli
   
   # Windows
   # Download from https://aws.amazon.com/cli/
   ```

3. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your Access Key ID
   # Enter your Secret Access Key
   # Default region: us-east-1 (or your preferred region)
   # Default output format: json
   ```

---

## Database Setup (RDS PostgreSQL)

### Option 1: RDS Free Tier (Recommended for production)

1. **Create RDS Instance**
   - Go to AWS Console → RDS → Create Database
   - Engine: PostgreSQL
   - Template: Free tier
   - DB instance identifier: `vanatvam-db`
   - Master username: `postgres` (or your choice)
   - Master password: (create strong password)
   - DB instance class: `db.t2.micro` (free tier)
   - Storage: 20 GB (free tier limit)
   - VPC: Default VPC
   - Public access: Yes (for EC2 connection)
   - Security group: Create new (allow PostgreSQL port 5432)

2. **Note Connection Details**
   - Endpoint: `vanatvam-db.xxxxx.us-east-1.rds.amazonaws.com`
   - Port: `5432`
   - Database name: `postgres`

3. **Update Security Group**
   - Allow inbound traffic on port 5432 from your EC2 security group

### Option 2: PostgreSQL on EC2 (Saves RDS free tier)

Install PostgreSQL directly on your EC2 instance (see backend deployment section).

---

## Backend Deployment (EC2)

### Step 1: Launch EC2 Instance

1. **Go to EC2 Console**
   - Click "Launch Instance"
   - Name: `vanatvam-backend`

2. **Choose AMI**
   - Amazon Linux 2023 (free tier eligible)
   - Or Ubuntu Server 22.04 LTS

3. **Instance Type**
   - `t2.micro` (free tier - 750 hours/month)

4. **Key Pair**
   - Create new key pair or use existing
   - Download `.pem` file (keep it secure!)

5. **Network Settings**
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Allow Custom TCP (port 8000) - for FastAPI

6. **Storage**
   - 8 GB gp3 (free tier)

7. **Launch Instance**

### Step 2: Connect to EC2 Instance

```bash
# Set permissions for key file
chmod 400 your-key.pem

# Connect to instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip
# For Ubuntu, use: ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Dependencies

```bash
# Update system
sudo yum update -y  # For Amazon Linux
# OR
sudo apt-get update && sudo apt-get upgrade -y  # For Ubuntu

# Install Python 3.11 and pip
sudo yum install python3.11 python3.11-pip git -y  # Amazon Linux
# OR
sudo apt-get install python3.11 python3.11-pip python3.11-venv git -y  # Ubuntu

# Install PostgreSQL (if using on EC2)
sudo yum install postgresql15 postgresql15-server -y  # Amazon Linux
# OR
sudo apt-get install postgresql postgresql-contrib -y  # Ubuntu
```

### Step 4: Clone and Setup Backend

```bash
# Clone your repository
cd /home/ec2-user  # or /home/ubuntu for Ubuntu
git clone https://github.com/yourusername/Vanatvam-Booking.git
cd Vanatvam-Booking/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
```

### Step 5: Configure Environment Variables

Create `.env` file with:

```env
# Database
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/postgres
# OR if using local PostgreSQL on EC2:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/vanatvam

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL (update after deploying frontend)
FRONTEND_URL=https://your-amplify-app-id.amplifyapp.com

# Email (optional - configure later)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Step 6: Setup Database

```bash
# If using RDS, database is already created
# If using local PostgreSQL:
sudo postgresql-setup initdb  # Amazon Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql
CREATE DATABASE vanatvam;
CREATE USER vanatvam_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vanatvam TO vanatvam_user;
\q
```

### Step 7: Run Database Migrations

```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations (if you have Alembic setup)
# alembic upgrade head

# Or create tables manually using your models
python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Step 8: Setup Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/vanatvam-backend.service
```

Add this content:

```ini
[Unit]
Description=Vanatvam Backend API
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/Vanatvam-Booking/backend
Environment="PATH=/home/ec2-user/Vanatvam-Booking/backend/venv/bin"
ExecStart=/home/ec2-user/Vanatvam-Booking/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable vanatvam-backend

# Start service
sudo systemctl start vanatvam-backend

# Check status
sudo systemctl status vanatvam-backend
```

### Step 9: Setup Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo yum install nginx -y  # Amazon Linux
# OR
sudo apt-get install nginx -y  # Ubuntu

# Configure Nginx
sudo nano /etc/nginx/conf.d/vanatvam.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-ec2-public-ip;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 10: Test Backend

```bash
# Test if API is running
curl http://localhost:8000/api/health
# Or
curl http://your-ec2-public-ip/api/health
```

---

## Frontend Deployment (Amplify)

### Step 1: Prepare Frontend

1. **Update API URL**
   - Edit `frontend/src/services/api.ts`
   - Update `API_URL` to your EC2 backend URL:
   ```typescript
   const API_URL = process.env.REACT_APP_API_URL || 'http://your-ec2-public-ip';
   ```

2. **Create Amplify Configuration**
   - Create `amplify.yml` in frontend root (already created)

### Step 2: Deploy to Amplify

1. **Go to AWS Amplify Console**
   - Click "New app" → "Host web app"
   - Connect your Git repository (GitHub, GitLab, Bitbucket)

2. **Configure Build Settings**
   - App name: `vanatvam-frontend`
   - Build settings: Amplify will auto-detect React
   - Environment variables:
     ```
     REACT_APP_API_URL=http://your-ec2-public-ip
     ```

3. **Review and Deploy**
   - Review settings
   - Click "Save and deploy"

4. **Wait for Deployment**
   - Amplify will build and deploy automatically
   - You'll get a URL like: `https://main.xxxxx.amplifyapp.com`

### Step 3: Update Backend CORS

Update your backend `main.py` to allow Amplify domain:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://main.xxxxx.amplifyapp.com",  # Your Amplify URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Restart backend service:
```bash
sudo systemctl restart vanatvam-backend
```

---

## Environment Variables

### Backend (.env on EC2)
```env
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/dbname
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FRONTEND_URL=https://your-amplify-url.amplifyapp.com
```

### Frontend (Amplify Console)
- Go to App settings → Environment variables
- Add: `REACT_APP_API_URL=http://your-ec2-ip`

---

## Domain Setup (Optional)

### Using Route 53 (Free tier: 1 hosted zone)

1. **Register Domain** (if needed)
   - Go to Route 53 → Registered domains
   - Register a domain (~$12/year)

2. **Create Hosted Zone**
   - Route 53 → Hosted zones
   - Create hosted zone for your domain

3. **Update DNS Records**
   - Add A record pointing to EC2 IP
   - Add CNAME for Amplify app

4. **Configure SSL**
   - Use AWS Certificate Manager (ACM) for free SSL
   - Configure in Amplify and Nginx

---

## Monitoring & Maintenance

### CloudWatch (Free tier: 5 GB logs)

1. **Monitor EC2**
   - EC2 → Monitoring tab
   - Set up CloudWatch alarms

2. **Monitor RDS**
   - RDS → Monitoring tab
   - Check database performance

### Cost Monitoring

1. **AWS Cost Explorer**
   - Monitor your spending
   - Set up billing alerts

2. **Free Tier Limits**
   - EC2: 750 hours/month
   - RDS: 750 hours/month
   - S3: 5 GB storage
   - Data transfer: 1 GB/month

### Backup Strategy

1. **Database Backups**
   - RDS: Automated backups (7 days free)
   - Or manual: `pg_dump` to S3

2. **Application Backups**
   - Use Git for code
   - Backup `.env` files securely

---

## Troubleshooting

### Backend not accessible
- Check security group rules
- Check Nginx status: `sudo systemctl status nginx`
- Check backend service: `sudo systemctl status vanatvam-backend`
- Check logs: `sudo journalctl -u vanatvam-backend -f`

### Database connection issues
- Verify security group allows EC2 → RDS
- Check database endpoint
- Verify credentials in `.env`

### Frontend API errors
- Verify `REACT_APP_API_URL` in Amplify
- Check CORS settings in backend
- Verify backend is accessible

---

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong passwords**
3. **Keep EC2 key pair secure**
4. **Regularly update packages**
5. **Use security groups properly**
6. **Enable AWS MFA for account**

---

## Estimated Monthly Cost (After Free Tier)

- EC2 t2.micro: ~$8-10/month
- RDS db.t2.micro: ~$15/month
- S3/Amplify: Usually free for small apps
- **Total: ~$23-25/month** (if you exceed free tier)

---

## Next Steps

1. Set up automated deployments with GitHub Actions
2. Configure email service (SES - free tier: 62,000 emails/month)
3. Set up monitoring and alerts
4. Configure custom domain
5. Set up SSL certificates

---

## Support

For issues:
- AWS Documentation: https://docs.aws.amazon.com
- AWS Free Tier: https://aws.amazon.com/free
- Stack Overflow: Tag with `aws`, `fastapi`, `react`
