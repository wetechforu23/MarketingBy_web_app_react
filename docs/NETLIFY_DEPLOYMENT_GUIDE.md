# 🚀 Netlify Deployment Guide - MarketingBy Frontend

## 📋 Prerequisites

✅ **Frontend Built**: Build completed successfully  
✅ **Netlify CLI**: Installed globally  
✅ **Domain**: `marketingby.wetechforu.com` (to be configured)  
✅ **Backend**: Deployed to Heroku at `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com`

---

## 🌐 Deployment Options

### **Option 1: Deploy via Netlify CLI** (Fastest)

#### Step 1: Login to Netlify
```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/frontend
netlify login
```

#### Step 2: Initialize Netlify Site
```bash
netlify init
```

**Select the following options:**
- ✅ Create & configure a new site
- ✅ Team: Your Netlify team
- ✅ Site name: `marketingby-wetechforu` (or your preferred name)
- ✅ Build command: `npm run build` (already in netlify.toml)
- ✅ Directory to deploy: `dist` (already in netlify.toml)
- ✅ Netlify functions: No

#### Step 3: Deploy
```bash
netlify deploy --prod
```

---

### **Option 2: Deploy via Netlify Web UI** (Recommended for Custom Domain)

#### Step 1: Go to Netlify Dashboard
1. Visit: https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**

#### Step 2: Connect GitHub Repository
1. Select **GitHub** as the provider
2. Authorize Netlify to access your GitHub account
3. Select repository: `wetechforu23/MarketingBy_web_app_react`
4. Select branch: `main`

#### Step 3: Configure Build Settings
Netlify will automatically detect the `netlify.toml` file with these settings:
- **Base directory**: Leave empty (or set to `frontend`)
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Environment variables**: Already set in `netlify.toml`

Click **"Deploy site"**

#### Step 4: Configure Custom Domain
1. In Netlify Dashboard, go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `marketingby.wetechforu.com`
4. Click **"Verify"**

#### Step 5: Configure DNS (GoDaddy, Namecheap, etc.)
Add the following DNS records to your domain registrar:

**For Root Domain (`wetechforu.com`):**
```
Type: A
Name: @
Value: 75.2.60.5 (Netlify's load balancer)
```

**For Subdomain (`marketingby.wetechforu.com`):**
```
Type: CNAME
Name: marketingby
Value: [your-netlify-site-name].netlify.app
```

**Example:**
```
Type: CNAME
Name: marketingby
Value: marketingby-wetechforu.netlify.app
```

#### Step 6: Enable HTTPS
1. In Netlify Dashboard → **Domain settings**
2. Scroll to **HTTPS**
3. Click **"Verify DNS configuration"**
4. Wait for SSL certificate provisioning (usually 1-5 minutes)
5. Enable **"Force HTTPS"**

---

## 🔧 Configuration Files

### `frontend/netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"
  
  [build.environment]
    VITE_API_BASE_URL = "https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### `frontend/_redirects`
```
/*    /index.html   200
```

---

## 🎯 After Deployment

### **Your URLs will be:**
- **Netlify Default**: `https://marketingby-wetechforu.netlify.app`
- **Custom Domain**: `https://marketingby.wetechforu.com` (after DNS configuration)

### **Login URL:**
```
https://marketingby.wetechforu.com/login
```

### **Credentials:**
```
Email: info@wetechforu.com
Password: Rhyme@2025
```

---

## 🧪 Testing Deployment

### Test Netlify Default URL
```bash
curl -I https://marketingby-wetechforu.netlify.app
```

### Test Custom Domain (after DNS propagation)
```bash
curl -I https://marketingby.wetechforu.com
```

### Test API Connection
Open browser console at your deployed site and check for:
```javascript
// Should connect to Heroku backend
console.log('API URL:', import.meta.env.VITE_API_BASE_URL)
```

---

## 🔄 Continuous Deployment

Netlify will automatically:
- ✅ Deploy on every push to `main` branch
- ✅ Build previews for pull requests
- ✅ Invalidate CDN cache
- ✅ Renew SSL certificates

---

## 🐛 Troubleshooting

### Issue: "Site not found" after custom domain setup
**Solution**: Wait 5-60 minutes for DNS propagation
```bash
# Check DNS propagation
dig marketingby.wetechforu.com
nslookup marketingby.wetechforu.com
```

### Issue: "Mixed Content" errors
**Solution**: Ensure all resources use HTTPS
- Check `index.html` for any `http://` URLs
- Force HTTPS in Netlify settings

### Issue: "404 on page refresh"
**Solution**: Ensure `_redirects` file is in `dist/` folder
```bash
ls dist/_redirects  # Should exist after build
```

### Issue: "API connection failed"
**Solution**: Check CORS settings on Heroku backend
```bash
# Test API directly
curl https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api/health
```

---

## 📊 Environment Variables

Set in Netlify Dashboard → **Site settings** → **Environment variables**:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api` |

**Note**: Already configured in `netlify.toml`, but can be overridden in UI.

---

## 🎉 Quick Deploy Command

```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/frontend
npx vite build
netlify deploy --prod --dir=dist
```

---

## 📞 Support

- **Netlify Docs**: https://docs.netlify.com
- **DNS Help**: https://docs.netlify.com/domains-https/custom-domains
- **Build Issues**: Check Netlify build logs in dashboard

---

## ✅ Checklist

- [ ] Netlify account created
- [ ] Repository connected to Netlify
- [ ] Build successful (green checkmark)
- [ ] Custom domain added (`marketingby.wetechforu.com`)
- [ ] DNS records configured at domain registrar
- [ ] SSL certificate provisioned (HTTPS enabled)
- [ ] Force HTTPS enabled
- [ ] Test login at `https://marketingby.wetechforu.com/login`
- [ ] Verify API connection to Heroku backend
- [ ] Test all pages (Dashboard, Leads, Profile, etc.)

---

**🚀 Ready to deploy! Follow Option 1 or Option 2 above to get your site live!**

