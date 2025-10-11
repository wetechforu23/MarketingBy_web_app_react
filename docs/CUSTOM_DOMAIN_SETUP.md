# 🌐 Custom Domain Setup Guide

## ✅ Current Status
- **Heroku App**: Live at `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com`
- **Frontend & Backend**: Both working correctly
- **Next Step**: Add custom domain `www.marketingby.wetechforu.com`

---

## 🚀 Step 1: Add Domain to Heroku

Run these commands in your terminal:

```bash
# Add www subdomain
heroku domains:add www.marketingby.wetechforu.com -a marketingby-wetechforu

# Add root domain (optional)
heroku domains:add marketingby.wetechforu.com -a marketingby-wetechforu

# Check domains
heroku domains -a marketingby-wetechforu
```

**Expected Output:**
```
=== marketingby-wetechforu Heroku Domain
marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com

=== marketingby-wetechforu Custom Domains
Domain Name                         DNS Targets
www.marketingby.wetechforu.com      www.marketingby.wetechforu.com.herokudns.com
marketingby.wetechforu.com          marketingby.wetechforu.com.herokudns.com
```

---

## 🌍 Step 2: Configure DNS at Your Domain Registrar

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add these DNS records:

### **For `www.marketingby.wetechforu.com`:**
```
Type: CNAME
Name: www.marketingby
Host: www.marketingby
Value: www.marketingby.wetechforu.com.herokudns.com
TTL: 3600 (or Auto)
```

### **For `marketingby.wetechforu.com` (root domain):**
```
Type: ALIAS or ANAME (if supported)
Name: marketingby
Host: marketingby
Value: marketingby.wetechforu.com.herokudns.com
TTL: 3600 (or Auto)
```

**⚠️ Note:** If your DNS provider doesn't support ALIAS/ANAME for root domains, use these alternatives:

#### **Option A: CNAME Flattening (Cloudflare, DNS Made Easy)**
```
Type: CNAME
Name: marketingby
Value: marketingby.wetechforu.com.herokudns.com
```

#### **Option B: A Records (Legacy)**
Get Heroku's IP addresses:
```bash
dig +short www.marketingby.wetechforu.com.herokudns.com
```
Then add A records for each IP.

---

## 🔐 Step 3: Enable SSL/HTTPS (Automatic)

Heroku automatically provisions SSL certificates for custom domains via **Automated Certificate Management (ACM)**.

Check SSL status:
```bash
heroku certs:auto -a marketingby-wetechforu
```

**Expected Output:**
```
=== Automatic Certificate Management is enabled on marketingby-wetechforu

Domain                              Status
www.marketingby.wetechforu.com      Cert issued
marketingby.wetechforu.com          Cert issued
```

**⏱️ SSL Provisioning Time:** 5-60 minutes after DNS propagation

---

## ✅ Step 4: Verify DNS Propagation

Check if your DNS is propagating:

```bash
# Check CNAME for www
dig www.marketingby.wetechforu.com CNAME +short

# Check root domain
dig marketingby.wetechforu.com +short

# Test HTTP response
curl -I https://www.marketingby.wetechforu.com
```

**Online Tools:**
- https://www.whatsmydns.net
- https://dnschecker.org

---

## 🔄 Step 5: Redirect Root to WWW (Optional)

If you want `marketingby.wetechforu.com` to redirect to `www.marketingby.wetechforu.com`, you can:

### **Option A: DNS-Level Redirect (Recommended)**
Use your DNS provider's redirect/forwarding service (available on most registrars).

### **Option B: App-Level Redirect**
Already handled in the Express server with CORS configuration.

---

## 🧪 Step 6: Test Your Custom Domain

Once DNS propagates (usually 5-30 minutes), test your site:

```bash
# Test root URL
curl -I https://www.marketingby.wetechforu.com

# Test login page
curl -I https://www.marketingby.wetechforu.com/login

# Test API
curl https://www.marketingby.wetechforu.com/api/health
```

**Expected**: All should return `HTTP/1.1 200 OK` or `HTTP/2 200`

---

## 📋 Quick Reference

| URL | Purpose |
|-----|---------|
| `https://www.marketingby.wetechforu.com` | Main frontend (custom domain) |
| `https://marketingby.wetechforu.com` | Root domain (redirects to www) |
| `https://www.marketingby.wetechforu.com/login` | Login page |
| `https://www.marketingby.wetechforu.com/api/health` | API health check |
| `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com` | Heroku fallback URL |

---

## 🐛 Troubleshooting

### Issue: "DNS_PROBE_FINISHED_NXDOMAIN"
**Solution**: DNS not configured or not propagated yet. Wait 5-30 minutes.

### Issue: "ERR_TOO_MANY_REDIRECTS"
**Solution**: Check CORS and redirect settings in `server.ts`.

### Issue: "Certificate Error / Not Secure"
**Solution**: Wait for SSL certificate provisioning (5-60 minutes).
```bash
heroku certs:auto -a marketingby-wetechforu
```

### Issue: "404 Not Found"
**Solution**: Check if frontend files are deployed:
```bash
heroku run "ls -la /app/backend/dist/public/" -a marketingby-wetechforu
```

---

## ✅ Checklist

- [ ] Run `heroku domains:add www.marketingby.wetechforu.com`
- [ ] Run `heroku domains:add marketingby.wetechforu.com`
- [ ] Add CNAME record for `www.marketingby` → `www.marketingby.wetechforu.com.herokudns.com`
- [ ] Add ALIAS/ANAME for `marketingby` → `marketingby.wetechforu.com.herokudns.com`
- [ ] Wait for DNS propagation (5-30 min)
- [ ] Verify DNS with `dig www.marketingby.wetechforu.com`
- [ ] Wait for SSL provisioning (5-60 min)
- [ ] Test `https://www.marketingby.wetechforu.com`
- [ ] Test login at `https://www.marketingby.wetechforu.com/login`
- [ ] Verify API at `https://www.marketingby.wetechforu.com/api/health`

---

## 🎉 Success!

Once all steps are complete, your users can access:
```
https://www.marketingby.wetechforu.com/login
```

Login with:
```
Email: info@wetechforu.com
Password: Rhyme@2025
```

---

## 📞 Need Help?

- **Heroku Docs**: https://devcenter.heroku.com/articles/custom-domains
- **SSL Issues**: https://devcenter.heroku.com/articles/automated-certificate-management
- **DNS Help**: Contact your domain registrar's support

