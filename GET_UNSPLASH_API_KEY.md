# 🔑 Get Your FREE Unsplash API Key

**Time Required:** 2 minutes  
**Cost:** FREE forever  
**Limit:** 50 requests/hour (plenty for blog image generation)

---

## Step 1: Go to Unsplash Developers

Visit: **https://unsplash.com/developers**

---

## Step 2: Register as a Developer

1. Click **"Register as a developer"** button
2. Sign up with:
   - Email: `info@wetechforu.com` (or any email)
   - Name: WeTechForU
   - Username: wetechforu

Or sign in if you already have an Unsplash account.

---

## Step 3: Create a New Application

1. After signing in, click **"New Application"**
2. Accept the Unsplash API Terms
3. Fill in the application details:
   ```
   Application name: WeTechForU Blog Images
   Description: AI-powered image search for MarketingBy blog posts
   ```

---

## Step 4: Copy Your Access Key

You'll see a page with your application details.

Look for:
```
Access Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copy this entire key!** It looks something like:
```
YOUR-LONG-ACCESS-KEY-HERE-32-CHARS
```

---

## Step 5: Add to Heroku

Run this command (replace YOUR_KEY with your actual key):

```bash
heroku config:set UNSPLASH_ACCESS_KEY=YOUR-LONG-ACCESS-KEY-HERE
```

Or add it via Heroku Dashboard:
1. Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu
2. Click **Settings**
3. Click **Reveal Config Vars**
4. Add new config var:
   - **KEY:** `UNSPLASH_ACCESS_KEY`
   - **VALUE:** Your copied access key
5. Click **Add**

---

## Step 6: Restart Heroku (if using dashboard)

```bash
heroku restart
```

---

## ✅ Done!

Now when you click "🤖 Generate with AI", you'll get:
- ✅ 6 real, professional photos from Unsplash
- ✅ Healthcare, marketing, business images
- ✅ High-quality, royalty-free
- ✅ 50 searches per hour
- ✅ Completely FREE!

---

## 🔍 Test It:

1. Go to: https://marketingby.wetechforu.com/app/blogs
2. Edit your blog
3. Click "🤖 Generate with AI"
4. See 6 beautiful, professional images!

---

## 📊 Your Limits:

**FREE Tier:**
- 50 requests per hour
- Unlimited images
- No credit card required
- No expiration

**If you need more:**
- Production tier: 5,000 requests/hour
- Still FREE (no billing)
- Just apply for production access on Unsplash

---

## 🆘 Troubleshooting:

### Issue: Still seeing placeholder images

**Solution:**
1. Make sure you added the key to Heroku config vars
2. Restart Heroku: `heroku restart`
3. Wait 30 seconds for restart
4. Try again

### Issue: "Rate limit exceeded"

**Solution:**
- You've made 50+ requests in the past hour
- Wait 1 hour, or
- Apply for production access (5,000/hour, still free)

---

**Your Access Key Format:**
```
UNSPLASH_ACCESS_KEY=your-long-key-here-no-quotes
```

**Example:**
```
UNSPLASH_ACCESS_KEY=abc123def456ghi789jkl012mno345pq
```

