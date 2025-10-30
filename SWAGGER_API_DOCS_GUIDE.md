# 📚 Swagger API Documentation Guide

## 🎉 **Swagger API Documentation is Now Live!**

Swagger provides an interactive API documentation interface where you can:
- ✅ View all API endpoints
- ✅ Test APIs directly in the browser
- ✅ See request/response schemas
- ✅ Track API usage and responses

---

## 🌐 **Access Swagger UI**

### **Local Development:**
```
http://localhost:3001/api-docs
```

### **Production (Heroku):**
```
https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com/api-docs
```

### **Swagger JSON (for external tools):**
```
http://localhost:3001/api-docs.json
```

---

## 🚀 **How to Use Swagger**

### **1. Open Swagger UI**
Navigate to `http://localhost:3001/api-docs` in your browser.

You'll see a beautiful interface with:
- 📋 List of all API endpoints organized by tags
- 📝 Detailed descriptions for each endpoint
- 🎯 Request/response schemas
- 🧪 "Try it out" buttons to test APIs

---

### **2. Test an API Endpoint**

#### **Example: Test Facebook Overview API**

1. **Find the endpoint:**
   - Scroll to **"Facebook"** section
   - Click on **`GET /facebook/overview/{clientId}`**

2. **Click "Try it out"** button

3. **Enter parameters:**
   - `clientId`: `199` (Demo2 client)

4. **Click "Execute"**

5. **View Response:**
   - Response Code: `200`
   - Response Body:
   ```json
   {
     "success": true,
     "connected": true,
     "data": {
       "pageViews": 0,
       "followers": 1,
       "engagement": 17,
       "reach": 26,
       "impressions": 181,
       "connected": true,
       "status": "Connected"
     }
   }
   ```

---

### **3. Authentication**

Most endpoints require authentication (session cookie).

**To authenticate:**

1. **Login first** via your frontend or using the `/api/auth/login` endpoint
2. **Copy the session cookie** from your browser
3. In Swagger, click **"Authorize"** button (top right with 🔒 icon)
4. Paste your cookie value
5. Now all authenticated endpoints will work!

**Or simpler:**
- Just use Swagger in the **same browser** where you're already logged in to the frontend
- The session cookie will automatically work!

---

## 📊 **Documented Facebook APIs**

### **1. GET /facebook/overview/{clientId}**
- **Purpose:** Get Facebook page metrics from database
- **Returns:** Followers, reach, engagement, impressions, page views
- **Auth:** Required (session cookie)
- **Example:**
  ```
  GET http://localhost:3001/api/facebook/overview/199
  ```

---

### **2. GET /facebook/posts/{clientId}**
- **Purpose:** Get Facebook posts with all metrics
- **Returns:** Posts with impressions, reach, reactions, comments, shares
- **Parameters:**
  - `clientId` (path): Client ID
  - `limit` (query): Max posts to return (default: 50)
- **Auth:** Required
- **Example:**
  ```
  GET http://localhost:3001/api/facebook/posts/199?limit=50
  ```

---

### **3. POST /facebook/sync/{clientId}**
- **Purpose:** Sync Facebook data from Facebook API to database
- **Action:** Fetches latest data from Facebook Graph API and stores it
- **Returns:** Updated Facebook metrics
- **Auth:** Required
- **Example:**
  ```
  POST http://localhost:3001/api/facebook/sync/199
  ```
- **Note:** This takes 10-30 seconds to complete

---

## 🏷️ **API Tags (Categories)**

Swagger organizes APIs into these categories:

| Tag | Description | Endpoints |
|-----|-------------|-----------|
| **Authentication** | Login, logout, session management | `/auth/*` |
| **Facebook** | Facebook integration & analytics | `/facebook/*` |
| **Google Analytics** | GA integration & reports | `/analytics/*` |
| **Clients** | Client management | `/clients/*` |
| **Users** | User management | `/users/*` |
| **Leads** | Lead management & scraping | `/leads/*` |
| **SEO** | SEO analysis & audits | `/seo/*` |
| **Email** | Email sending & templates | `/email/*` |
| **Dashboard** | Dashboard data & analytics | `/dashboard/*` |

---

## 🔧 **Advanced Features**

### **Filter APIs**
Use the search box at the top to filter endpoints:
```
Search: "facebook"  → Shows only Facebook endpoints
Search: "sync"      → Shows all sync endpoints
```

---

### **Export/Import Collection**
1. Download Swagger JSON: `http://localhost:3001/api-docs.json`
2. Import into Postman or Insomnia for API testing

---

### **Copy cURL Commands**
After executing an API in Swagger:
1. Scroll to **"Response"** section
2. Find **"Curl"** tab
3. Copy the cURL command
4. Use it in terminal or scripts

---

## 📝 **Adding Documentation to New Endpoints**

When you add a new API endpoint, document it with Swagger comments:

```typescript
/**
 * @swagger
 * /your-endpoint/{id}:
 *   get:
 *     summary: Brief description of what this endpoint does
 *     description: Detailed description with more context
 *     tags: [CategoryName]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response description
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/your-endpoint/:id', requireAuth, async (req, res) => {
  // Your code here
});
```

---

## 🎨 **Customization**

The Swagger UI is customized with:
- ✅ Hidden top bar (removed Swagger branding)
- ✅ Custom page title: "MarketingBy API Docs"
- ✅ Logo support (when available)
- ✅ Persistent authorization (cookies saved)
- ✅ Request duration display
- ✅ Filter/search enabled
- ✅ Try It Out enabled by default

---

## 🚀 **Next Steps**

1. **Explore all endpoints** in Swagger UI
2. **Test Facebook APIs** with Demo2 client (ID: 199)
3. **Document more endpoints** as you add new features
4. **Share the Swagger URL** with your team

---

## 💡 **Tips**

- **Use Swagger for debugging**: Test APIs directly without writing frontend code
- **Validate responses**: See exactly what data structure APIs return
- **Save time**: No need for Postman/cURL - everything is in the browser
- **Track changes**: Swagger auto-updates when you add new endpoints
- **Team collaboration**: Share the Swagger URL with developers/testers

---

## 📞 **Support**

If you need help:
- Check API logs in backend console
- Verify authentication (session cookie)
- Ensure backend server is running
- Contact: info@wetechforu.com

---

## ✅ **Quick Test Checklist**

- [ ] Open `http://localhost:3001/api-docs`
- [ ] See Swagger UI loaded
- [ ] Find Facebook section
- [ ] Test `GET /facebook/overview/199`
- [ ] See response with metrics
- [ ] Try `GET /facebook/posts/199`
- [ ] See posts list
- [ ] Test `POST /facebook/sync/199` (takes 10-30 sec)
- [ ] Verify data updated

---

**🎉 Happy API Testing!**

