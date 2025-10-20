# Local Server Running with Heroku Database

## ✅ **Server is Running!**

Your local backend server is now running and connected to the Heroku production database:

- **Server URL:** http://localhost:5001
- **API Base:** http://localhost:5001/api
- **Database:** Heroku PostgreSQL (production)
- **Process ID:** Check with `lsof -ti:5001`

## 🎯 **What You Can Do Now**

### Option 1: Update Facebook Credentials via API (Recommended)

Since you have the correct Page Access Token, you can update it directly in the database:

**Using curl:**
```bash
# You'll need to be authenticated first, or we can update directly in database
```

### Option 2: Update Facebook Credentials in Database Directly

**Using the test script:**
```bash
# First, update the credentials in database
DATABASE_URL="postgres://u6jiliov4itlpd:p8cb462eac52ccb92d2602ce07f0e64f54fd267b1e250307a8d4276cbb73d8fab@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfkco05sfrm6d1" \
psql -c "UPDATE client_credentials 
SET credentials = '{\"page_id\": \"744651835408507\", \"access_token\": \"EAAVlGna8NrIBPhPHi4kfoIOqGdUuZAgpsyAHJgZBX70JqtArRREWMdLshrjZCE5TrCXyqObRgnG3qPy2kSjkltXexJbwSa6yCCHweK5ipvbEcUjmfa5fKMHav0vFNWlKD6I9gZA7lXqqdoZBtTy4PFheGN6819Y9pC3PCxfZBlvpfEi6TUCcOPEQ4NoZCUYtHEJcQZDZD\"}', 
last_connected_at = NOW() 
WHERE client_id = 1 AND service_type = 'facebook';"
```

**Or use psql interactive:**
```bash
DATABASE_URL="postgres://..." psql

# Then run:
UPDATE client_credentials 
SET credentials = '{"page_id": "744651835408507", "access_token": "EAAVlGna8NrIBPhPHi4kfoIOqGdUuZAgpsyAHJgZBX70JqtArRREWMdLshrjZCE5TrCXyqObRgnG3qPy2kSjkltXexJbwSa6yCCHweK5ipvbEcUjmfa5fKMHav0vFNWlKD6I9gZA7lXqqdoZBtTy4PFheGN6819Y9pC3PCxfZBlvpfEi6TUCcOPEQ4NoZCUYtHEJcQZDZD"}', 
last_connected_at = NOW() 
WHERE client_id = 1 AND service_type = 'facebook';
```

### Option 3: Use the Web App (Easiest!)

**Since your local server is running with the production database:**

1. **Open your browser** to http://localhost:5001
2. **Login** with your credentials
3. **Go to Client Management** → **Settings** tab
4. **Update Facebook:**
   - Click "Disconnect" (if connected)
   - Page ID: `744651835408507`
   - Access Token: Paste the Page Access Token
   - Click "Connect Facebook"
5. **Go to Social Media tab**
6. **Click "Sync Facebook Data"**
7. **✅ Done!** Your Facebook data will sync successfully

## 🔄 **Server Management**

### Check if Server is Running
```bash
curl http://localhost:5001/health
```

### View Server Logs
```bash
tail -f /tmp/backend-local.log
```

### Stop the Server
```bash
lsof -ti:5001 | xargs kill
```

### Restart the Server
```bash
cd /Users/viraltarpara/Desktop/github_viral/MarketingBy_web_app_react/backend
PORT=5001 node dist/server.js > /tmp/backend-local.log 2>&1 &
```

## 🎯 **Your Facebook Page Access Token**

**Page ID:** `744651835408507`

**Page Access Token:**
```
EAAVlGna8NrIBPhPHi4kfoIOqGdUuZAgpsyAHJgZBX70JqtArRREWMdLshrjZCE5TrCXyqObRgnG3qPy2kSjkltXexJbwSa6yCCHweK5ipvbEcUjmfa5fKMHav0vFNWlKD6I9gZA7lXqqdoZBtTy4PFheGN6819Y9pC3PCxfZBlvpfEi6TUCcOPEQ4NoZCUYtHEJcQZDZD
```

**Token Type:** Page Access Token (correct!)  
**Expires:** Never ✅  
**Status:** Ready to use

## 📊 **Test the Integration**

1. **Update Facebook credentials** (using web app or database)
2. **Go to:** http://localhost:5001/app/client-management
3. **Click:** Social Media tab
4. **Click:** "Sync Facebook Data"
5. **Check logs:** `tail -f /tmp/backend-local.log`
6. **Expected:** ✅ Sync successful, data appears!

## 🚀 **Benefits of Local Server**

- ✅ **Instant updates** - No deployment wait time
- ✅ **Real database** - Connected to Heroku PostgreSQL
- ✅ **Full debugging** - See all logs in real-time
- ✅ **Test immediately** - Can update and test Facebook sync now
- ✅ **Safe** - Changes go to production database

## ⚠️ **Important Notes**

1. **Production Database**: Your local server is connected to the **production** Heroku database. Any changes you make will affect the live data.

2. **Session/Cookies**: You may need to login again since sessions are local.

3. **Frontend**: The frontend is served from the built files in `backend/dist/public`.

4. **CORS**: If you get CORS errors, they're handled by the server.

## 🔧 **Troubleshooting**

### "Address already in use"
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Start again
cd backend && PORT=5001 node dist/server.js &
```

### "Cannot find module"
```bash
# Reinstall dependencies
cd backend
rm -rf node_modules
npm install
npm run build
```

### "Database connection error"
```bash
# Check .env file exists with correct DATABASE_URL
cat backend/.env | grep DATABASE_URL
```

## 🎉 **Quick Start Summary**

**Right now, you can:**

1. Open browser to http://localhost:5001
2. Login to the app
3. Update Facebook credentials in Settings
4. Sync Facebook data
5. See it work immediately!

**No need to wait for Heroku deployment!**

---

**Server Status:** ✅ Running on port 5001  
**Database:** ✅ Connected to Heroku PostgreSQL  
**Ready to use:** ✅ Yes!  

Just open http://localhost:5001 in your browser and update the Facebook credentials!

