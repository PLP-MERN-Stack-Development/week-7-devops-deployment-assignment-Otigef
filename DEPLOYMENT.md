# 🚀 Production Deployment Guide

## 📋 Overview

This guide covers deploying your MERN chat application to production with CI/CD pipelines, monitoring, and maintenance strategies.

## 🏗️ Architecture

```
Frontend (Vercel/Netlify) ←→ Backend (Railway/Render) ←→ MongoDB Atlas
```

## 🔧 Prerequisites

### 1. MongoDB Atlas Setup
- [ ] Create MongoDB Atlas account
- [ ] Create a free cluster
- [ ] Set up database access (username/password)
- [ ] Configure network access (allow all IPs for development)
- [ ] Get connection string

### 2. GitHub Repository Setup
- [ ] Push code to GitHub
- [ ] Set up repository secrets
- [ ] Configure branch protection rules

## 🚀 Deployment Steps

### Backend Deployment (Railway/Render)

#### Option A: Railway
1. **Create Railway Account**
   - Go to [Railway](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Connect your GitHub repo
   # Railway will auto-detect Node.js
   # Set environment variables:
   NODE_ENV=production
   MONGO_URI=your-mongodb-atlas-connection-string
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

#### Option B: Render
1. **Create Render Account**
   - Go to [Render](https://render.com)
   - Sign up with GitHub

2. **Deploy Backend**
   ```bash
   # Create new Web Service
   # Connect GitHub repository
   # Build Command: npm install
   # Start Command: npm start
   # Set environment variables (same as Railway)
   ```

### Frontend Deployment (Vercel/Netlify)

#### Option A: Vercel
1. **Create Vercel Account**
   - Go to [Vercel](https://vercel.com)
   - Sign up with GitHub

2. **Deploy Frontend**
   ```bash
   # Import your GitHub repository
   # Framework Preset: Vite
   # Root Directory: socketio-chat/client
   # Build Command: npm run build
   # Output Directory: dist
   ```

3. **Set Environment Variables**
   ```bash
   VITE_API_URL=https://your-backend-domain.com
   ```

#### Option B: Netlify
1. **Create Netlify Account**
   - Go to [Netlify](https://netlify.com)
   - Sign up with GitHub

2. **Deploy Frontend**
   ```bash
   # Connect GitHub repository
   # Build command: npm run build
   # Publish directory: dist
   # Set environment variables
   ```

## 🔐 Environment Variables

### Backend (.env)
```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/socketio-chat
JWT_SECRET=your-super-secret-jwt-key-change-this
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=info
ENABLE_MONITORING=true
```

### Frontend (.env)
```bash
VITE_API_URL=https://your-backend-domain.com
VITE_APP_NAME=Chat App
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. **Repository Secrets**
   ```bash
   RAILWAY_TOKEN=your-railway-token
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-vercel-org-id
   VERCEL_PROJECT_ID=your-vercel-project-id
   NETLIFY_AUTH_TOKEN=your-netlify-token
   NETLIFY_SITE_ID=your-netlify-site-id
   SLACK_WEBHOOK=your-slack-webhook-url
   ```

2. **Pipeline Features**
   - ✅ Automatic testing on push/PR
   - ✅ Security audits
   - ✅ Linting and code quality checks
   - ✅ Automatic deployment to staging/production
   - ✅ Slack notifications

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Backend health endpoint
GET https://your-backend-domain.com/health

# Response:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Monitoring Dashboard
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry, LogRocket
- **Performance**: New Relic, DataDog
- **Logs**: Papertrail, Loggly

### Maintenance Tasks

#### Daily
- [ ] Check application health
- [ ] Monitor error logs
- [ ] Review user activity

#### Weekly
- [ ] Security updates
- [ ] Performance analysis
- [ ] Database optimization

#### Monthly
- [ ] Dependency updates
- [ ] Security audit
- [ ] Backup verification

## 🔒 Security Checklist

### Backend Security
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] JWT token expiration
- [ ] Password hashing (bcrypt)
- [ ] Environment variables secured

### Frontend Security
- [ ] HTTPS enabled
- [ ] Content Security Policy
- [ ] XSS protection
- [ ] Input sanitization
- [ ] Secure cookie settings
- [ ] API key protection

## 📈 Performance Optimization

### Backend
- [ ] Database indexing
- [ ] Query optimization
- [ ] Caching (Redis)
- [ ] Compression enabled
- [ ] CDN for static assets

### Frontend
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle size optimization
- [ ] CDN for assets

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**
   ```bash
   # Check CORS_ORIGIN environment variable
   # Ensure frontend domain is included
   ```

2. **Database Connection Issues**
   ```bash
   # Verify MongoDB Atlas connection string
   # Check network access settings
   # Ensure database user has correct permissions
   ```

3. **Build Failures**
   ```bash
   # Check Node.js version compatibility
   # Verify all dependencies are installed
   # Review build logs for specific errors
   ```

### Emergency Procedures

1. **Rollback Deployment**
   ```bash
   # Vercel: Use deployment history
   # Railway: Use rollback feature
   # Netlify: Use deploy history
   ```

2. **Database Recovery**
   ```bash
   # MongoDB Atlas: Use point-in-time recovery
   # Export/Import data if needed
   ```

## 📞 Support

- **Documentation**: [Project README](./README.md)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Monitoring**: [Health Dashboard](./monitoring.md)

## 🎯 Next Steps

1. **Set up monitoring alerts**
2. **Configure automated backups**
3. **Implement user analytics**
4. **Add feature flags**
5. **Set up staging environment**
6. **Create disaster recovery plan**

---

**Last Updated**: January 2024
**Version**: 1.0.0 