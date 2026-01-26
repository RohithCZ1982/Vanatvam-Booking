# How to Update Code from Git on AWS EC2

When you make changes to your code and want to update the running application on EC2, follow these steps:

## Quick Update (Recommended)

```bash
# Navigate to project directory
cd ~/Vanatvam-Booking/backend

# Run the update script
./update-code.sh
```

This script will:
1. Pull latest changes from Git
2. Redeploy the backend
3. Restart the service

## Manual Update Steps

If you prefer to do it manually:

### Step 1: Pull Latest Code

```bash
# Navigate to project root
cd ~/Vanatvam-Booking

# Pull latest changes
git pull origin main
# OR if your default branch is master:
git pull origin master
```

### Step 2: Update Backend

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Install any new dependencies (if requirements.txt changed)
pip install -r requirements.txt

# Run database migrations (if you have any)
# alembic upgrade head
# OR
# python3 -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Step 3: Restart Service

```bash
# Restart the backend service
sudo systemctl restart vanatvam-backend

# Check status
sudo systemctl status vanatvam-backend

# View logs
sudo journalctl -u vanatvam-backend -f
```

## One-Liner Update

```bash
cd ~/Vanatvam-Booking && git pull && cd backend && ./deploy.sh
```

## Update Specific Branch

If you want to pull from a different branch:

```bash
cd ~/Vanatvam-Booking
git fetch origin
git checkout branch-name
git pull origin branch-name
cd backend
./deploy.sh
```

## Update Frontend (Amplify)

Frontend updates automatically when you push to your Git repository (if connected to Amplify). Or trigger manually:

1. Go to AWS Console → Amplify → Your app
2. Click "Redeploy this version" or wait for auto-deploy

## Troubleshooting

### Git Pull Fails

```bash
# Check git status
git status

# If you have local changes, stash them:
git stash
git pull
git stash pop

# Or reset to match remote (WARNING: loses local changes):
git fetch origin
git reset --hard origin/main
```

### Service Won't Restart

```bash
# Check service logs
sudo journalctl -u vanatvam-backend -n 50

# Common issues:
# 1. Syntax errors in code - check logs
# 2. Missing dependencies - run: pip install -r requirements.txt
# 3. Database connection issues - check .env file
```

### Dependencies Not Updated

```bash
cd ~/Vanatvam-Booking/backend
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

## Automated Updates with GitHub Actions

If you set up CI/CD (see `.github/workflows/deploy-backend.yml`), updates happen automatically when you push to main branch.

## Best Practices

1. **Always test locally first** before pushing to production
2. **Check service status** after update: `sudo systemctl status vanatvam-backend`
3. **Monitor logs** during update: `sudo journalctl -u vanatvam-backend -f`
4. **Backup database** before major updates
5. **Update during low-traffic periods** if possible

## Quick Reference

```bash
# Update code
cd ~/Vanatvam-Booking/backend && ./update-code.sh

# Check service
sudo systemctl status vanatvam-backend

# View logs
sudo journalctl -u vanatvam-backend -f

# Restart service
sudo systemctl restart vanatvam-backend

# Test API
curl http://localhost:8000/api/health
```
