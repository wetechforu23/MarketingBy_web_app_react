# Stripe Products Configuration for Healthcare Marketing Plans

## 📋 Product 1: Basic Healthcare Marketing ($399/month)

### Product Details:
- **Name**: Basic Healthcare Marketing
- **Description**: Essential marketing services for small healthcare practices including social media management, paid ads, and basic SEO.
- **Category**: Healthcare Marketing
- **Active**: Yes

### Pricing:
- **Monthly Subscription**: $399.00/month
- **One-Time Setup Fee**: $150.00 (50% discount from $300)
  - Original Value: $300
  - Promo Discount: 50%
  - Customer Pays: $150

### Features (Add as metadata):
```json
{
  "features": [
    "Social Media Management (Organic) – Facebook & Instagram",
    "6–8 posts/month (images + 1 AI video)",
    "8–10 stories/month",
    "Hashtag & competitor research",
    "Facebook & Instagram Ads",
    "Google Ads Management (Search + Display)",
    "Basic SEO & Content Marketing",
    "On-page SEO optimization",
    "2 healthcare blog posts per month",
    "Google Analytics monitoring"
  ],
  "category": "healthcare_marketing",
  "popular": false,
  "split_budget": "50% Google Ads + 50% Facebook/Instagram Ads",
  "setup_fee": 150,
  "setup_fee_original": 300,
  "setup_fee_discount": "50%"
}
```

### Scope of Work:
**Social Media Management (Organic)**
- Optimize business pages
- 6–8 posts/month (images + 1 AI video)
- 8–10 stories/month
- Hashtag & competitor research

**Facebook & Instagram Ads**
- Campaign setup
- A/B testing & weekly optimization
- Performance reporting

**Google Ads Management**
- Search & display campaigns
- Keyword targeting
- Lead form or landing page integration

**Basic SEO & Content Marketing**
- On-page SEO (H1, H2, fix broken links, site structure)
- Meta title & description for each page
- 2 healthcare blog posts per month
- Sitemap submission & Google Analytics monitoring

**One-Time Setup ($150)**
- Google Business Profile setup
- Facebook Business Manager & Instagram integration
- Google Ads account billing setup + conversion tracking
- Facebook Pixel setup
- Google Analytics & Search Console configuration
- Sitemap generation and submission
- Keyword research & competitor audit
- Professional page banner design

---

## 📋 Product 2: Professional Healthcare Marketing ($799/month)

### Product Details:
- **Name**: Professional Healthcare Marketing
- **Description**: Comprehensive marketing for growing healthcare practices with advanced SEO, more content, and dedicated support.
- **Category**: Healthcare Marketing
- **Active**: Yes

### Pricing:
- **Monthly Subscription**: $799.00/month
- **One-Time Setup Fee**: $150.00 (50% discount from $300)

### Features (Add as metadata):
```json
{
  "features": [
    "All Basic Features",
    "12–15 posts/month (images + 2 AI videos)",
    "15–20 stories/month",
    "Advanced SEO optimization",
    "4 healthcare blog posts per month",
    "Video content creation (2 per month)",
    "Competitor analysis & reporting",
    "Weekly performance reports",
    "Dedicated account manager",
    "Priority support",
    "Custom landing pages"
  ],
  "category": "healthcare_marketing",
  "popular": true,
  "setup_fee": 150,
  "setup_fee_original": 300,
  "setup_fee_discount": "50%"
}
```

### Scope of Work:
- All services from Basic plan
- Enhanced social media (12-15 posts, 15-20 stories)
- Advanced SEO optimization
- 4 blog posts per month (double the Basic plan)
- 2 video content pieces per month
- Weekly performance reports
- Dedicated account manager
- Priority support

---

## 📋 Product 3: Enterprise Healthcare Marketing ($1,499/month)

### Product Details:
- **Name**: Enterprise Healthcare Marketing
- **Description**: Full-service marketing for multi-location healthcare practices with unlimited content, custom production, and 24/7 support.
- **Category**: Healthcare Marketing
- **Active**: Yes

### Pricing:
- **Monthly Subscription**: $1,499.00/month
- **One-Time Setup Fee**: $150.00 (50% discount from $300)

### Features (Add as metadata):
```json
{
  "features": [
    "All Professional Features",
    "Unlimited social media posts",
    "Custom video production",
    "White-label reports",
    "Multi-location support",
    "24/7 priority support",
    "Custom landing pages & conversion optimization",
    "Advanced competitor analysis",
    "Dedicated marketing team",
    "Custom campaign strategies",
    "Monthly strategy calls"
  ],
  "category": "healthcare_marketing",
  "popular": false,
  "setup_fee": 150,
  "setup_fee_original": 300,
  "setup_fee_discount": "50%"
}
```

---

## 🔧 How to Create in Stripe Dashboard:

### Step 1: Create Products
1. Go to https://dashboard.stripe.com/products
2. Click "+ Add product"
3. Enter product name and description
4. Add metadata fields (copy from JSON above)
5. Click "Add product"

### Step 2: Add Recurring Price
1. Select the product you just created
2. Click "+ Add price"
3. Select "Recurring"
4. Set billing period to "Monthly"
5. Enter price ($399, $799, or $1,499)
6. Click "Add price"

### Step 3: Add One-Time Setup Fee
1. In the same product, click "+ Add price"
2. Select "One time"
3. Enter price $150
4. Add description: "One-Time Setup Fee (50% discount - $300 value)"
5. Click "Add price"

### Step 4: Set Default Price
1. On the product page, click "..." next to the monthly recurring price
2. Select "Set as default"

---

## 📝 Important Metadata to Add:

For each product, add these metadata key-value pairs:

| Key | Value |
|-----|-------|
| `category` | `healthcare_marketing` |
| `setup_fee` | `150` |
| `setup_fee_original` | `300` |
| `setup_fee_discount` | `50` |
| `popular` | `true` (for Professional) or `false` (for others) |
| `features` | JSON array (as shown above) |

---

## 💳 Billing Structure:

### Initial Payment (First Month):
- Setup Fee: $150 (one-time)
- First Month Subscription: $399/$799/$1,499
- **Total First Payment**: $549/$949/$1,649

### Subsequent Months:
- Monthly Subscription Only: $399/$799/$1,499

### Customer Ad Spend (Separate):
- Customer provides their own credit card for Google Ads
- Customer provides their own credit card for Facebook Ads
- Customer decides their own budget
- We manage the campaigns, they pay the platforms directly

---

## 🎯 Customer Requirements Checklist:

### Website Access:
- [ ] Admin access to website backend
- [ ] Access for pixel installation
- [ ] Access for SEO changes

### Social Media Access:
- [ ] Facebook Page admin access
- [ ] Facebook Ad Account access
- [ ] Instagram Professional Account (linked to Facebook)

### Google Access:
- [ ] Google Business Profile manager access
- [ ] Google Ads account access
- [ ] Google Analytics access
- [ ] Google Search Console access

### Business Materials:
- [ ] Logo files
- [ ] Brand colors
- [ ] Service descriptions
- [ ] Operating hours
- [ ] Contact information
- [ ] Photos/videos of practice

### Billing Setup:
- [ ] Add billing method to Google Ads (customer's card)
- [ ] Add billing method to Facebook Ads (customer's card)
- [ ] Confirm monthly subscription payment method (for WeTechForU services)

---

## 📄 Agreement & Contract Terms:

### Service Agreement Includes:
1. **Scope of Work** - Detailed list of deliverables
2. **Access Requirements** - List of platforms and access levels needed
3. **Client Responsibilities** - Content approval, access provision, billing setup
4. **Service Timeline** - Setup completion within 7-10 business days
5. **Payment Terms** - Setup fee due before work begins, monthly fee due on 1st of each month
6. **Ad Spend Policy** - Customer owns and funds ad accounts
7. **Content Approval** - 3-day approval window for all content
8. **Performance Expectations** - Metrics we track and report
9. **Termination Policy** - 30-day notice required
10. **Dispute Resolution** - Evidence of service delivery for chargeback protection

### Chargeback Protection:
- Signed digital agreement with timestamp and IP
- Email communication logs
- Content approval records
- Platform access logs
- Work completion screenshots
- Monthly report delivery records
- Customer acknowledgment of services rendered

---

## 🚀 Onboarding Timeline:

**Week 1 (Days 1-3): Access & Setup**
- Collect all access credentials
- Verify platform access
- Setup tracking (Analytics, Pixels, etc.)

**Week 2 (Days 4-7): Configuration**
- Complete technical setup
- Keyword research
- Competitor audit
- Design cover photos

**Week 3 (Days 8-10): Review & Launch**
- Present initial content calendar
- Get client approval
- Schedule first month of posts
- Launch first campaigns

**Ongoing:**
- Weekly optimization
- Monthly reporting
- Content approval process
- Performance monitoring

---

## 📧 Save this file and use it to:
1. Create products in Stripe dashboard
2. Configure pricing correctly
3. Set up proper metadata for automated filtering
4. Ensure consistent service delivery
5. Track customer onboarding
6. Maintain agreement records for dispute protection

