# Get Heroku PostgreSQL Connection URL

## Method 1: Via Heroku Dashboard (Recommended)

1. **Login to Heroku Dashboard**
   - Go to: https://dashboard.heroku.com/apps/marketingby-wetechforu

2. **Navigate to Database Settings**
   - Click **"Resources"** tab
   - Find **"Heroku Postgres"** addon
   - Click on it to open database dashboard

3. **View Credentials**
   - Click **"Settings"** tab
   - Click **"View Credentials"** button
   - Copy the **"URI"** field

4. **Format**
   ```
   postgres://username:password@host:port/database
   
   Example:
   postgres://u8abc123:p456def789@ec2-54-123-456-78.compute-1.amazonaws.com:5432/d9xyz890
   ```

## Method 2: Use Existing Connection from .env

If you have the Heroku DATABASE_URL in your current `.env`, you're already set!

Check your `backend/.env` file for:
```
DATABASE_URL=postgres://...
```

## What to Look For

- **Host**: Usually `ec2-XX-XXX-XXX-XX.compute-1.amazonaws.com`
- **Port**: Usually `5432`
- **Database**: Usually starts with `d` + random letters
- **User**: Usually starts with `u` + random letters
- **Password**: Long random string
- **SSL**: Heroku requires `?sslmode=require` or `ssl=true`

## Security Note

⚠️ **NEVER** commit the Heroku database URL to git!
⚠️ Keep it only in your local `.env` file

