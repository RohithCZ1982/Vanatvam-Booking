# Security Group Setup Guide

If you're having trouble creating security groups during EC2 instance launch, follow this guide.

## Method 1: Create Security Group First (Easiest)

### Step 1: Create Security Group

1. Go to **AWS Console → EC2 → Security Groups**
2. Click **"Create Security Group"**
3. Fill in the details:
   - **Name:** `vanatvam-backend-sg`
   - **Description:** `Security group for Vanatvam backend API`
   - **VPC:** Select your default VPC (or the VPC you want to use)

4. **Add Inbound Rules:**
   Click "Add rule" for each of these:

   | Type | Protocol | Port Range | Source | Description |
   |------|----------|------------|--------|-------------|
   | SSH | TCP | 22 | My IP | SSH access |
   | HTTP | TCP | 80 | 0.0.0.0/0 | HTTP access |
   | HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS access |
   | Custom TCP | TCP | 8000 | 0.0.0.0/0 | FastAPI backend |

   **Note:** For SSH, you can select "My IP" from the dropdown, or use `0.0.0.0/0` for testing (less secure).

5. **Outbound Rules:** Leave default (All traffic)

6. Click **"Create Security Group"**

### Step 2: Launch Instance with Existing Security Group

1. Go to **EC2 → Launch Instance**
2. Configure instance normally
3. In **"Network Settings"** section:
   - Click **"Edit"**
   - Under **"Security groups"**, select **"Select existing security group"**
   - Choose `vanatvam-backend-sg` from the dropdown
4. Continue with instance launch

---

## Method 2: Add Rules After Launch

If you've already launched the instance:

1. Go to **EC2 → Instances**
2. Select your instance
3. Click on the **"Security"** tab
4. Click on the security group name (it's a link)
5. Click **"Edit inbound rules"**
6. Click **"Add rule"** and add each rule:
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
   - Custom TCP (8000) from 0.0.0.0/0
7. Click **"Save rules"**

---

## Method 3: Using AWS CLI

If you prefer command line:

```bash
# Create security group
aws ec2 create-security-group \
  --group-name vanatvam-backend-sg \
  --description "Vanatvam backend security group" \
  --vpc-id vpc-xxxxxxxxx

# Note the GroupId from output (e.g., sg-xxxxxxxxx)
SG_ID="sg-xxxxxxxxx"

# Add SSH rule (replace with your IP for better security)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Add HTTP rule
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Add HTTPS rule
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Add Custom TCP rule for FastAPI
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0
```

---

## RDS Security Group Setup

For RDS to accept connections from EC2:

1. Go to **RDS → Databases → Your Database**
2. Click on **"VPC security groups"** (it's a link)
3. Click **"Edit inbound rules"**
4. Add rule:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select your EC2 security group (`vanatvam-backend-sg`)
5. Click **"Save rules"**

**Alternative:** Allow from EC2's security group ID:
- Type: PostgreSQL
- Port: 5432
- Source: Custom → Enter your EC2 security group ID (sg-xxxxxxxxx)

---

## Security Best Practices

1. **SSH Access:**
   - Use "My IP" instead of 0.0.0.0/0 for better security
   - Or use a VPN/Bastion host

2. **Production:**
   - Consider using Application Load Balancer (ALB) instead of exposing port 8000
   - Use HTTPS only (port 443)
   - Restrict source IPs when possible

3. **Testing:**
   - Using 0.0.0.0/0 is okay for testing
   - Remember to restrict access in production

---

## Verify Security Group Rules

To verify your security group is configured correctly:

```bash
# List security groups
aws ec2 describe-security-groups --group-names vanatvam-backend-sg

# Or check in AWS Console
# EC2 → Security Groups → Select your group → Inbound rules tab
```

---

## Common Issues

### Issue: "Invalid security group" error
**Solution:** Make sure you're selecting the security group in the correct VPC

### Issue: Can't add multiple rules at once
**Solution:** Add rules one at a time, or create security group separately first

### Issue: Port 8000 not accessible
**Solution:** 
- Verify rule is added correctly
- Check if backend service is running: `sudo systemctl status vanatvam-backend`
- Test locally: `curl http://localhost:8000`

### Issue: RDS connection timeout
**Solution:**
- Verify RDS security group allows EC2 security group
- Check RDS is publicly accessible
- Verify database endpoint is correct

---

## Quick Checklist

- [ ] Security group created with all 4 rules (SSH, HTTP, HTTPS, Custom TCP 8000)
- [ ] EC2 instance launched with correct security group
- [ ] RDS security group allows EC2 security group on port 5432
- [ ] Can SSH into EC2 instance
- [ ] Can access backend on port 8000
- [ ] Can access backend through Nginx on port 80
