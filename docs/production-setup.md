# Gab'z Laundromat - Production Deployment Guide

## 📋 Overview

This guide covers the complete production deployment of Gab'z Laundromat, a comprehensive laundry service platform for Lagos State, Nigeria. The application includes customer booking, admin management, payment processing, and WhatsApp notifications.

## 🏗️ Architecture

### **Tech Stack**
- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Appwrite (Backend-as-a-Service)
- **Database**: Appwrite Database
- **Payment**: Paystack (Nigerian payment gateway)
- **Notifications**: WhatsApp Business API
- **SMS**: Termii (Nigerian SMS service)
- **Hosting**: Vercel (Frontend) + Appwrite Cloud (Backend)

### **System Requirements**
- Node.js 18+ 
- NPM 8+
- Modern web browser support
- SSL certificate for production
- Valid Nigerian business registration

## 🚀 Pre-Deployment Checklist

### **1. Business Requirements**
- [ ] Nigerian business registration (CAC)
- [ ] Lagos State business permit
- [ ] Tax identification number (TIN)
- [ ] Business bank account
- [ ] Professional liability insurance

### **2. Third-Party Services**
- [ ] Appwrite Cloud account
- [ ] Paystack business account
- [ ] WhatsApp Business API access
- [ ] Termii SMS account
- [ ] Domain name registration
- [ ] SSL certificate

### **3. Legal Compliance**
- [ ] Privacy policy
- [ ] Terms of service
- [ ] GDPR compliance (if applicable)
- [ ] Nigerian data protection compliance
- [ ] Consumer rights documentation

## 🔧 Environment Setup

### **1. Domain & DNS Configuration**

```bash
# Main domain
gabzlaundromat.com

# Subdomains
admin.gabzlaundromat.com
api.gabzlaundromat.com
webhook.gabzlaundromat.com
```

### **2. SSL Certificate Setup**

```bash
# Using Let's Encrypt (recommended)
sudo certbot --nginx -d gabzlaundromat.com -d www.gabzlaundromat.com

# Or use Cloudflare for SSL termination
```

### **3. Environment Variables**

Create production `.env` file:

```env
# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://gabzlaundromat.com

# Appwrite Production
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=prod-gabz-laundromat
APPWRITE_API_KEY=your-production-api-key

# Paystack Live Keys
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your-live-public-key
PAYSTACK_SECRET_KEY=sk_live_your-live-secret-key

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-production-access-token
WHATSAPP_PHONE_NUMBER_ID=your-verified-phone-number
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account

# Security
NEXTAUTH_SECRET=your-production-secret-32-chars
ENCRYPTION_KEY=your-production-encryption-key
```

## 🏪 Appwrite Cloud Setup

### **1. Create Production Project**

```bash
# Install Appwrite CLI
npm install -g appwrite-cli

# Login to Appwrite
appwrite login

# Create new project
appwrite projects create --projectId=prod-gabz-laundromat --name="Gab'z Laundromat Production"
```

### **2. Database Configuration**

```bash
# Create database
appwrite databases create --databaseId=gabz-prod-db --name="Gab'z Production Database"

# Create collections (run the setup script)
node scripts/setup-production-database.js
```

### **3. Storage Configuration**

```bash
# Create storage buckets
appwrite storage createBucket --bucketId=customer-avatars --name="Customer Avatars" --permissions="read(*)"
appwrite storage createBucket --bucketId=order-receipts --name="Order Receipts" --permissions="read(user:\$userId)"
```

### **4. Functions Setup**

```bash
# Deploy webhook handlers
appwrite functions create --functionId=paystack-webhook --name="Paystack Webhook Handler"
appwrite functions create --functionId=whatsapp-webhook --name="WhatsApp Webhook Handler"
```

## 💳 Paystack Integration

### **1. Business Verification**

1. Complete Paystack business verification
2. Submit required documents:
   - CAC certificate
   - Bank account details
   - Director's ID
   - Utility bill

### **2. Webhook Configuration**

```javascript
// webhook-handler.js
const handlePaystackWebhook = async (event) => {
  const signature = event.headers['x-paystack-signature'];
  
  // Verify webhook signature
  if (!verifySignature(event.body, signature)) {
    return { statusCode: 400, body: 'Invalid signature' };
  }
  
  const data = JSON.parse(event.body);
  
  switch (data.event) {
    case 'charge.success':
      await handlePaymentSuccess(data.data);
      break;
    case 'charge.failed':
      await handlePaymentFailed(data.data);
      break;
  }
  
  return { statusCode: 200, body: 'OK' };
};
```

### **3. Test Payment Flow**

```bash
# Test with Paystack test cards
curl -X POST https://api.paystack.co/transaction/initialize \
  -H "Authorization: Bearer sk_test_your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 10000,
    "currency": "NGN"
  }'
```

## 📱 WhatsApp Business API Setup

### **1. Meta Business Account**

1. Create Meta Business Account
2. Add business phone number
3. Complete business verification
4. Request WhatsApp Business API access

### **2. Webhook Configuration**

```javascript
// whatsapp-webhook.js
const handleWhatsAppWebhook = async (event) => {
  const body = JSON.parse(event.body);
  
  if (body.object === 'whatsapp_business_account') {
    body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages') {
          handleIncomingMessage(change.value);
        }
      });
    });
  }
  
  return { statusCode: 200, body: 'OK' };
};
```

### **3. Message Templates**

Create WhatsApp message templates:

```bash
# Order confirmation template
curl -X POST \
  "https://graph.facebook.com/v17.0/your-business-id/message_templates" \
  -H "Authorization: Bearer your-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order_confirmation",
    "language": "en",
    "category": "TRANSACTIONAL",
    "components": [
      {
        "type": "BODY",
        "text": "Hi {{1}}! Your order #{{2}} has been confirmed. Total: ₦{{3}}. Pickup: {{4}}. Thank you for choosing Gab'\''z Laundromat!"
      }
    ]
  }'
```

## 🚀 Deployment Process

### **1. Frontend Deployment (Vercel)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Configure environment variables
vercel env add NODE_ENV production
vercel env add NEXT_PUBLIC_APP_URL https://gabzlaundromat.com
# ... add all other env vars
```

### **2. Database Migration**

```bash
# Run production migrations
node scripts/migrate-to-production.js

# Seed initial data
node scripts/seed-production-data.js
```

### **3. DNS Configuration**

```bash
# Configure DNS records
A     gabzlaundromat.com        76.76.19.19
CNAME www.gabzlaundromat.com   gabzlaundromat.com
CNAME admin.gabzlaundromat.com gabzlaundromat.com
```

## 🔒 Security Configuration

### **1. Content Security Policy**

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' js.paystack.co;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://cloud.appwrite.io https://api.paystack.co;
      frame-src 'self' js.paystack.co;
    `.replace(/\s{2,}/g, ' ').trim()
  }
];
```

### **2. Rate Limiting**

```javascript
// middleware.js
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

export async function middleware(request) {
  const identifier = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}
```

### **3. Data Encryption**

```javascript
// lib/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const secretKey = process.env.ENCRYPTION_KEY;

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, secretKey);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
};
```

## 📊 Monitoring & Analytics

### **1. Application Monitoring**

```bash
# Install monitoring tools
npm install @sentry/nextjs @vercel/analytics

# Configure Sentry
echo "SENTRY_DSN=your-sentry-dsn" >> .env
```

### **2. Performance Monitoring**

```javascript
// lib/monitoring.js
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const MonitoringComponents = () => (
  <>
    <Analytics />
    <SpeedInsights />
  </>
);
```

### **3. Business Analytics**

```javascript
// lib/analytics-tracking.js
export const trackBusinessEvent = (event, data) => {
  // Track order completions
  if (event === 'order_completed') {
    gtag('event', 'purchase', {
      transaction_id: data.orderId,
      value: data.amount / 100,
      currency: 'NGN',
      items: data.items
    });
  }
  
  // Track user engagement
  if (event === 'booking_started') {
    gtag('event', 'begin_checkout', {
      currency: 'NGN',
      value: data.estimatedAmount / 100
    });
  }
};
```

## 🔄 Backup & Recovery

### **1. Database Backup**

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/gabz-laundromat"

# Export Appwrite data
appwrite databases export \
  --databaseId=gabz-prod-db \
  --output="$BACKUP_DIR/db_backup_$DATE.json"

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.json" \
  s3://gabz-backups/database/
```

### **2. Automated Backups**

```bash
# Add to crontab
0 2 * * * /scripts/backup-database.sh
0 3 * * 0 /scripts/backup-files.sh
```

### **3. Disaster Recovery Plan**

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 24 hours
3. **Backup locations**: Multiple cloud regions
4. **Recovery procedures**: Documented step-by-step
5. **Testing schedule**: Monthly recovery drills

## 🧪 Testing in Production

### **1. Health Checks**

```javascript
// pages/api/health.js
export default async function handler(req, res) {
  const checks = {
    database: await checkDatabase(),
    payment: await checkPaystack(),
    whatsapp: await checkWhatsApp(),
    storage: await checkStorage()
  };
  
  const isHealthy = Object.values(checks).every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
}
```

### **2. Smoke Tests**

```bash
# Test critical user journeys
curl -f https://gabzlaundromat.com/api/health
curl -f https://gabzlaundromat.com/services
curl -f https://gabzlaundromat.com/login
```

### **3. Load Testing**

```bash
# Install Artillery
npm install -g artillery

# Run load tests
artillery run load-test-config.yml
```

## 📈 Go-Live Checklist

### **Pre-Launch (1 week before)**
- [ ] Complete security audit
- [ ] Performance optimization
- [ ] Load testing passed
- [ ] Backup systems verified
- [ ] Monitoring configured
- [ ] Staff training completed

### **Launch Day**
- [ ] DNS propagation verified
- [ ] SSL certificates active
- [ ] Payment processing tested
- [ ] WhatsApp notifications working
- [ ] Admin access confirmed
- [ ] Customer support ready

### **Post-Launch (First 48 hours)**
- [ ] Monitor application performance
- [ ] Check error rates and logs
- [ ] Verify payment processing
- [ ] Test customer support channels
- [ ] Review user feedback
- [ ] Scale resources if needed

## 🎯 Success Metrics

### **Technical KPIs**
- **Uptime**: 99.9% availability
- **Response Time**: < 2 seconds average
- **Error Rate**: < 0.1% of requests
- **Payment Success**: > 95% completion rate

### **Business KPIs**
- **Order Completion**: > 90% of bookings
- **Customer Satisfaction**: > 4.5/5 rating
- **WhatsApp Response**: < 5 minutes
- **Revenue Growth**: 20% month-over-month

## 🚨 Incident Response

### **Escalation Matrix**
1. **Level 1**: Automated alerts → DevOps team
2. **Level 2**: Service degradation → Engineering lead
3. **Level 3**: Complete outage → CTO + CEO
4. **Level 4**: Data breach → Legal + Compliance

### **Response Times**
- **Critical**: 15 minutes
- **High**: 1 hour
- **Medium**: 4 hours
- **Low**: 24 hours

## 📞 Support Contacts

### **Technical Support**
- **DevOps**: devops@gabzlaundromat.com
- **Engineering**: engineering@gabzlaundromat.com
- **On-call**: +234-800-TECH-HELP

### **Business Support**
- **Operations**: operations@gabzlaundromat.com
- **Customer Service**: support@gabzlaundromat.com
- **Emergency**: +234-800-GABZ-911

---

## 🎉 Conclusion

This production setup provides a robust, scalable foundation for Gab'z Laundromat to serve the Lagos State market. The combination of modern web technologies, Nigerian-specific integrations, and comprehensive monitoring ensures a reliable service that can grow with your business.

**Next Steps:**
1. Complete all pre-deployment tasks
2. Schedule go-live date
3. Prepare marketing launch
4. Monitor performance closely
5. Iterate based on user feedback

Good luck with your launch! 🧺✨ 