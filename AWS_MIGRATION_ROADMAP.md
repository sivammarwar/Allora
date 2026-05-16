# AWS Migration & Play Store Launch Roadmap

## Current Setup
- API/DB/Redis: Railway
- Web: Vercel
- Mobile: Dev builds via USB

## Target Setup
- API: AWS ECS/Fargate
- DB: AWS RDS PostgreSQL
- Redis: AWS ElastiCache
- Web: AWS S3 + CloudFront
- Mobile: Google Play Store

---

## Phase 1: AWS Setup (Week 1)
1. Create AWS account, set up IAM users with MFA
2. Choose region (ap-south-1 for Mumbai)
3. Configure billing alerts
4. Purchase domain, set up Route 53
5. Create SSL certificates via ACM

---

## Phase 2: Database Migration (Week 2)
1. Create RDS PostgreSQL instance (db.t3.medium, Multi-AZ)
2. Export data from Railway: `pg_dump -h <railway-host> -U <user> -d <db> > backup.sql`
3. Import to RDS: `psql -h <rds-endpoint> -U <user> -d <db> < backup.sql`
4. Create ElastiCache Redis (cache.t3.micro)
5. Update API environment variables

---

## Phase 3: API Deployment (Week 3)
1. Create Dockerfile for API
2. Push image to AWS ECR
3. Create ECS cluster with Fargate
4. Set up Application Load Balancer (ALB)
5. Configure health checks and auto-scaling

---

## Phase 4: Web Deployment (Week 4)
**Option A: S3 + CloudFront (Recommended)**
1. Build Next.js: `npm run build`
2. Upload to S3
3. Create CloudFront distribution
4. Configure custom domain with SSL

**Option B: AWS Amplify (Easiest)**
1. Connect GitHub repo to Amplify
2. Configure build settings
3. Enable custom domain

---

## Phase 5: CI/CD Pipeline (Week 5)
1. Set up GitHub Actions for API (build Docker, deploy to ECS)
2. Set up GitHub Actions for Web (build, deploy to S3/Amplify)
3. Add automated tests
4. Configure deployment secrets

---

## Phase 6: Security (Week 6)
1. Configure VPC with private/public subnets
2. Set up security groups (whitelist IPs)
3. Enable WAF (Web Application Firewall)
4. Use AWS Secrets Manager for sensitive data
5. Enable encryption at rest/in transit

---

## Phase 7: Monitoring (Week 7)
1. Enable CloudWatch Logs & Metrics
2. Set up alarms (CPU > 80%, errors > 5%)
3. Integrate Sentry for error tracking
4. Configure performance dashboards

---

## Phase 8: Scaling (Week 8)
1. Configure ECS auto-scaling (scale at 70% CPU)
2. Add RDS read replicas if needed
3. Implement CloudFront caching

---

## Phase 9: Play Store Launch (Weeks 9-10)
1. Update app name, package name, icons
2. Generate signed APK/AAB
3. Create Play Console account ($25 one-time fee)
4. Prepare screenshots, descriptions, privacy policy
5. Submit for review

---

## Estimated Costs (Monthly)
- RDS PostgreSQL: ~$50-100
- ElastiCache Redis: ~$20-30
- ECS Fargate: ~$30-50
- ALB: ~$20-30
- CloudFront: ~$10-20
- S3: ~$1-5
- **Total: ~$130-235/month**

## Key Commands
```bash
# Build Docker image
docker build -t allora-api .

# Push to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
docker tag allora-api:latest <account-id>.dkr.ecr.ap-south-1.amazonaws.com/allora-api:latest
docker push <account-id>.dkr.ecr.ap-south-1.amazonaws.com/allora-api:latest

# Database export/import
pg_dump -h <host> -U <user> -d <db> > backup.sql
psql -h <host> -U <user> -d <db> < backup.sql
```
