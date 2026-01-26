# What to Do After Running ec2-setup.sh

After successfully running `ec2-setup.sh`, follow these steps to complete your backend deployment:

## Step 1: Configure Environment Variables

The setup script creates a template `.env` file. You need to edit it with your actual configuration:

```bash
cd ~/Vanatvam-Booking/backend
nano .env
```

### Required Configuration:

```env
# Database Connection
# If using RDS:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@your-rds-endpoint.region.rds.amazonaws.com:5432/postgres

# If using local PostgreSQL on EC2:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/vanatvam

# JWT Secret Key (generate a strong random string)
SECRET_KEY=your-very-long-random-secret-key-here-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL (update after deploying frontend to Amplify)
FRONTEND_URL=https://main.xxxxx.amplifyapp.com

# Email Configuration (Optional - can configure later via Admin UI)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
```

### Generate a Strong Secret Key:

```bash
# Generate a random secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Copy the output and use it as your SECRET_KEY
```

**Save the file:** Press `Ctrl+X`, then `Y`, then `Enter`

## Step 2: Setup Database

### If Using RDS:

1. **Get your RDS endpoint:**
   - AWS Console → RDS → Databases → Your database
   - Copy the endpoint (e.g., `vanatvam-db.xxxxx.us-east-1.rds.amazonaws.com`)

2. **Update RDS Security Group:**
   - RDS → Your database → VPC security groups
   - Edit inbound rules
   - Add: PostgreSQL (5432) from your EC2 security group

3. **Test Connection (optional):**
   ```bash
   # Install PostgreSQL client
   sudo yum install postgresql15 -y  # Amazon Linux
   # OR
   sudo apt-get install postgresql-client -y  # Ubuntu
   
   # Test connection
   psql -h your-rds-endpoint -U postgres -d postgres
   # Enter password when prompted
   # Type \q to exit
   ```

### If Using Local PostgreSQL:

```bash
# Create database
sudo -u postgres psql
CREATE DATABASE vanatvam;
CREATE USER vanatvam_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vanatvam TO vanatvam_user;
\q

# Update .env with local connection
# DATABASE_URL=postgresql://vanatvam_user:your_password@localhost:5432/vanatvam
```

## Step 3: Create Database Tables

```bash
cd ~/Vanatvam-Booking/backend
source venv/bin/activate

# Option 1: Using Python (if you have models)
python3 -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"

# Option 2: If you have SQL scripts
# psql -h your-rds-endpoint -U postgres -d postgres -f schema.sql

# Option 3: If using Alembic migrations
# alembic upgrade head
```

## Step 4: Deploy Backend

Run the deployment script:

```bash
cd ~/Vanatvam-Booking/backend
./deploy.sh
```

This script will:
- Install/update dependencies
- Restart the backend service
- Check if service is running

## Step 5: Verify Backend is Running

```bash
# Check service status
sudo systemctl status vanatvam-backend

# Check if API is responding
curl http://localhost:8000/api/health
# OR
curl http://YOUR-EC2-PUBLIC-IP/api/health

# View logs
sudo journalctl -u vanatvam-backend -f
# Press Ctrl+C to exit logs
```

**Expected Response:**
```json
{"status": "healthy"}
```
or similar health check response

## Step 6: Test API Endpoints

```bash
# Test a public endpoint
curl http://YOUR-EC2-PUBLIC-IP/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User","phone":"1234567890"}'
```

## Step 7: Start Nginx (If Not Already Running)

```bash
# Check Nginx status
sudo systemctl status nginx

# Start if not running
sudo systemctl start nginx
sudo systemctl enable nginx

# Test Nginx configuration
sudo nginx -t

# Restart if needed
sudo systemctl restart nginx
```

## Step 8: Configure Frontend (After Amplify Deployment)

Once you deploy your frontend to Amplify:

1. **Get Amplify URL:**
   - AWS Console → Amplify → Your app
   - Copy the app URL (e.g., `https://main.xxxxx.amplifyapp.com`)

2. **Update Backend CORS:**
   ```bash
   cd ~/Vanatvam-Booking/backend
   nano main.py
   ```
   
   Find the CORS middleware and add your Amplify URL:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "http://localhost:3000",
           "https://main.xxxxx.amplifyapp.com",  # Add your Amplify URL
       ],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

3. **Update .env:**
   ```bash
   nano .env
   # Update FRONTEND_URL to your Amplify URL
   ```

4. **Restart Backend:**
   ```bash
   sudo systemctl restart vanatvam-backend
   ```

## Step 9: Set Up Amplify Environment Variable

1. Go to AWS Console → Amplify → Your app
2. App settings → Environment variables
3. Add:
   - Key: `REACT_APP_API_URL`
   - Value: `http://YOUR-EC2-PUBLIC-IP` (or your domain if configured)
4. Save and redeploy

## Troubleshooting

### Backend Service Not Starting

```bash
# Check service status
sudo systemctl status vanatvam-backend

# View detailed logs
sudo journalctl -u vanatvam-backend -n 50

# Common issues:
# 1. Database connection error - check DATABASE_URL in .env
# 2. Port already in use - check: sudo lsof -i :8000
# 3. Python path issues - verify venv is activated
```

### Database Connection Issues

```bash
# Test database connection
cd ~/Vanatvam-Booking/backend
source venv/bin/activate
python3 -c "from sqlalchemy import create_engine; engine = create_engine('YOUR_DATABASE_URL'); engine.connect()"
```

### Port 8000 Not Accessible

```bash
# Check if service is listening
sudo netstat -tlnp | grep 8000

# Check security group rules
# AWS Console → EC2 → Security Groups → Your security group
# Verify Custom TCP (8000) rule exists

# Test locally on EC2
curl http://localhost:8000/api/health
```

### Nginx Not Working

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Next Steps After Backend is Running

1. ✅ **Deploy Frontend to Amplify** (see QUICK_START_AWS.md)
2. ✅ **Configure Email Settings** (via Admin UI after first login)
3. ✅ **Set up Domain** (optional - see AWS_DEPLOYMENT_GUIDE.md)
4. ✅ **Configure SSL/HTTPS** (optional - use AWS Certificate Manager)
5. ✅ **Set up Monitoring** (CloudWatch alarms)
6. ✅ **Configure Backups** (RDS automated backups or manual)

## Quick Reference Commands

```bash
# Update code from Git (EASIEST)
cd ~/Vanatvam-Booking/backend
./update-code.sh

# OR Manual update
cd ~/Vanatvam-Booking
git pull origin main
cd backend
./deploy.sh

# View backend logs
sudo journalctl -u vanatvam-backend -f

# Restart backend
sudo systemctl restart vanatvam-backend

# Check backend status
sudo systemctl status vanatvam-backend

# Restart Nginx
sudo systemctl restart nginx

# Test API
curl http://YOUR-EC2-IP/api/health
```

**📋 See [UPDATE_CODE_ON_EC2.md](./UPDATE_CODE_ON_EC2.md) for detailed update instructions!**

## Success Checklist

- [ ] `.env` file configured with correct values
- [ ] Database connection working
- [ ] Database tables created
- [ ] Backend service running (`sudo systemctl status vanatvam-backend`)
- [ ] API responding (`curl http://localhost:8000/api/health`)
- [ ] Nginx running and proxying correctly
- [ ] Can access API from outside (`curl http://YOUR-EC2-IP/api/health`)
- [ ] Frontend deployed to Amplify
- [ ] Frontend can connect to backend
- [ ] Email configuration set up (optional)

Once all these are checked, your backend is fully deployed and ready! 🎉
