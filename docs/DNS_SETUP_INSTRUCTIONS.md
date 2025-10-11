# 🌐 DNS Setup Instructions for Custom Domain

## ✅ What's Already Done

1. ✅ **Heroku App**: Live and working
2. ✅ **Custom Domains**: Added to Heroku
3. ✅ **SSL Certificates**: Auto-provisioning enabled
4. ✅ **Frontend + Backend**: Deployed and serving together

---

## 📋 What You Need to Do Now

### **Step 1: Go to Your Domain Registrar**

Login to the website where you registered `wetechforu.com`:
- GoDaddy: https://dcc.godaddy.com/domains
- Namecheap: https://ap.www.namecheap.com/domains/list
- Cloudflare: https://dash.cloudflare.com
- Google Domains: https://domains.google.com

---

### **Step 2: Find DNS Management**

1. Click on your domain: `wetechforu.com`
2. Look for one of these options:
   - "DNS Settings"
   - "DNS Management"
   - "Manage DNS"
   - "Advanced DNS"
   - "DNS Records"

---

### **Step 3: Add These 2 DNS Records**

#### **Record 1: WWW Subdomain** (Recommended for users)

```
┌─────────────────────────────────────────────────────────────────┐
│ Type:     CNAME                                                 │
│ Name:     www.marketingby                                       │
│ Value:    octagonal-bear-qnbn1dueons3ghf5cftbzhpp.herokudns.com│
│ TTL:      3600 (or Auto)                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Copy this value exactly:**
```
octagonal-bear-qnbn1dueons3ghf5cftbzhpp.herokudns.com
```

---

#### **Record 2: Root Domain**

```
┌─────────────────────────────────────────────────────────────────┐
│ Type:     CNAME                                                 │
│ Name:     marketingby                                           │
│ Value:    shallow-pigeon-o94gsax2h2fx0ifeeo3fu1xy.herokudns.com│
│ TTL:      3600 (or Auto)                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Copy this value exactly:**
```
shallow-pigeon-o94gsax2h2fx0ifeeo3fu1xy.herokudns.com
```

---

### **Step 4: Save and Wait**

1. **Click "Save" or "Save Changes"**
2. **Wait 5-30 minutes** for DNS to propagate worldwide
3. **SSL Certificate** will be automatically issued within 5-60 minutes

---

## 🧪 Testing Your Setup

### **Test 1: Check DNS (After 5-30 minutes)**

Run this command:
```bash
./test-custom-domain.sh
```

Or manually test:
```bash
dig www.marketingby.wetechforu.com CNAME +short
```

**Expected Output:**
```
octagonal-bear-qnbn1dueons3ghf5cftbzhpp.herokudns.com
```

---

### **Test 2: Check Website (After DNS propagates)**

Open in your browser:
```
https://www.marketingby.wetechforu.com/login
```

**Expected**: Login page loads with WeTechForU branding

---

### **Test 3: Check SSL Certificate**

Check SSL status:
```bash
heroku certs:auto -a marketingby-wetechforu
```

**Expected Output (after 5-60 min):**
```
Domain                              Status
www.marketingby.wetechforu.com      Cert issued
marketingby.wetechforu.com          Cert issued
```

---

## 📱 Screenshots of Common DNS Providers

### **GoDaddy:**
1. Go to "My Products" → Click your domain
2. Scroll to "DNS" → Click "Manage"
3. Click "Add" → Select "CNAME"
4. Enter the details above

### **Namecheap:**
1. Go to "Domain List" → Click "Manage" next to your domain
2. Go to "Advanced DNS" tab
3. Click "Add New Record" → Select "CNAME Record"
4. Enter the details above

### **Cloudflare:**
1. Go to your domain
2. Click "DNS" in the left menu
3. Click "Add Record" → Select "CNAME"
4. Enter the details above
5. **Important**: Set "Proxy status" to "DNS only" (gray cloud)

---

## ⏱️ Timeline

| Time | What Happens |
|------|--------------|
| **Now** | Add DNS records at your registrar |
| **5-30 min** | DNS propagates, domain resolves |
| **5-60 min** | SSL certificate auto-provisions |
| **After SSL** | ✅ Your site is live with HTTPS! |

---

## 🎯 Your Final URLs

Once DNS is configured:

| URL | Purpose |
|-----|---------|
| `https://www.marketingby.wetechforu.com` | **Main URL** (Give this to users) |
| `https://www.marketingby.wetechforu.com/login` | **Login Page** |
| `https://marketingby.wetechforu.com` | Redirects to www |
| `https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com` | Backup URL (works now) |

---

## 🔐 Login Credentials

```
Email:    info@wetechforu.com
Password: Rhyme@2025
```

---

## ❓ Troubleshooting

### **Issue: DNS not working after 30 minutes**

**Check:**
```bash
dig www.marketingby.wetechforu.com +short
```

**If empty:** DNS not configured or wrong value
**Solution:** Double-check the CNAME values are exactly as shown above

---

### **Issue: "This site can't provide a secure connection"**

**Reason:** SSL certificate not issued yet  
**Solution:** Wait up to 60 minutes, then check:
```bash
heroku certs:auto -a marketingby-wetechforu
```

---

### **Issue: "ERR_NAME_NOT_RESOLVED"**

**Reason:** DNS not propagated yet  
**Solution:** Wait longer, or check propagation at:
- https://www.whatsmydns.net
- https://dnschecker.org

---

## ✅ Checklist

- [ ] Login to domain registrar
- [ ] Find DNS Management
- [ ] Add CNAME for `www.marketingby` → `octagonal-bear-qnbn1dueons3ghf5cftbzhpp.herokudns.com`
- [ ] Add CNAME for `marketingby` → `shallow-pigeon-o94gsax2h2fx0ifeeo3fu1xy.herokudns.com`
- [ ] Save changes
- [ ] Wait 5-30 minutes
- [ ] Run `./test-custom-domain.sh`
- [ ] Test `https://www.marketingby.wetechforu.com/login`
- [ ] Verify SSL with `heroku certs:auto -a marketingby-wetechforu`

---

## 🆘 Need Help?

**If you get stuck:**
1. Take a screenshot of your DNS settings
2. Run: `./test-custom-domain.sh` and share output
3. Check: https://devcenter.heroku.com/articles/custom-domains

---

## 🎉 Success!

Once complete, share this URL with your users:
```
https://www.marketingby.wetechforu.com/login
```

**They can login with:**
- Email: `info@wetechforu.com`
- Password: `Rhyme@2025`

