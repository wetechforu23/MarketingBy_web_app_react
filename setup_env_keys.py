#!/usr/bin/env python3
"""
Environment Variables Setup Helper
Helps you add API keys to your .env file for ProMed Healthcare PPC tracking
"""

import os
import shutil
from datetime import datetime

def setup_env_file():
    """Set up .env file with API keys"""
    
    print("ProMed Healthcare - Environment Variables Setup")
    print("=" * 60)
    
    # Check if .env file exists
    if os.path.exists('.env'):
        print("✓ .env file found")
        
        # Create backup
        backup_name = f".env.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2('.env', backup_name)
        print(f"✓ Backup created: {backup_name}")
    else:
        print("⚠️  .env file not found, creating from template...")
        
        # Copy from example
        if os.path.exists('config/env.example'):
            shutil.copy2('config/env.example', '.env')
            print("✓ Created .env from config/env.example")
        else:
            print("✗ config/env.example not found!")
            return False
    
    # API keys to add/update
    api_keys = {
        'GOOGLE_ADS_API_KEY': 'your_google_ads_api_key_here',
        'GOOGLE_ADS_CLIENT_ID': 'your_google_ads_client_id_here',
        'GOOGLE_ADS_DEVELOPER_TOKEN': 'your_google_ads_developer_token_here',
        'GOOGLE_ADS_REFRESH_TOKEN': 'your_google_ads_refresh_token_here',
        'GOOGLE_ADS_CONVERSION_ID': 'your_google_ads_conversion_id_here',
        'GOOGLE_ADS_CONVERSION_LABEL': 'your_google_ads_conversion_label_here',
        'GOOGLE_ANALYTICS_API_KEY': 'your_google_analytics_api_key_here',
        'GOOGLE_ANALYTICS_PROPERTY_ID': 'your_google_analytics_property_id_here',
        'GOOGLE_ANALYTICS_MEASUREMENT_ID': 'your_google_analytics_measurement_id_here'
    }
    
    print("\nAPI Keys to configure:")
    print("-" * 40)
    
    for i, (key, default_value) in enumerate(api_keys.items(), 1):
        print(f"\n{i}. {key}")
        
        # Check if key already exists
        current_value = get_env_value(key)
        if current_value and current_value != default_value:
            print(f"   Current: {current_value[:20]}...")
            update = input("   Update? (y/n): ").lower().strip()
            if update != 'y':
                continue
        
        new_value = input(f"   Enter {key}: ").strip()
        
        if new_value:
            set_env_value(key, new_value)
            print(f"   ✓ {key} updated")
        else:
            print(f"   ⚠️  {key} skipped")
    
    print("\n" + "=" * 60)
    print("✓ Environment setup complete!")
    print("\nNext steps:")
    print("1. Run: python test_api_keys.py")
    print("2. Follow API_KEYS_SETUP_GUIDE.md for detailed instructions")
    
    return True

def get_env_value(key):
    """Get current value of environment variable from .env file"""
    
    if not os.path.exists('.env'):
        return None
    
    try:
        with open('.env', 'r') as f:
            for line in f:
                if line.strip().startswith(f'{key}='):
                    return line.strip().split('=', 1)[1]
    except Exception as e:
        print(f"Error reading .env file: {e}")
    
    return None

def set_env_value(key, value):
    """Set environment variable in .env file"""
    
    if not os.path.exists('.env'):
        return False
    
    try:
        # Read current file
        with open('.env', 'r') as f:
            lines = f.readlines()
        
        # Update or add the key
        updated = False
        for i, line in enumerate(lines):
            if line.strip().startswith(f'{key}='):
                lines[i] = f'{key}={value}\n'
                updated = True
                break
        
        if not updated:
            # Add new key
            lines.append(f'{key}={value}\n')
        
        # Write back to file
        with open('.env', 'w') as f:
            f.writelines(lines)
        
        return True
        
    except Exception as e:
        print(f"Error updating .env file: {e}")
        return False

def show_api_key_help():
    """Show help for getting API keys"""
    
    print("\n" + "=" * 60)
    print("QUICK HELP - WHERE TO GET API KEYS:")
    print("=" * 60)
    
    help_info = {
        'GOOGLE_ADS_CLIENT_ID': 'Google Ads → Tools & Settings → API Center → Customer ID (remove dashes)',
        'GOOGLE_ADS_CONVERSION_ID': 'Google Ads → Tools & Settings → Conversions → Create conversion action',
        'GOOGLE_ANALYTICS_PROPERTY_ID': 'Google Analytics → Admin → Property Settings → Property ID',
        'GOOGLE_ANALYTICS_MEASUREMENT_ID': 'Google Analytics → Admin → Data Streams → Web → Measurement ID',
        'GOOGLE_ADS_API_KEY': 'Google Cloud Console → APIs & Services → Credentials → Create API Key',
        'GOOGLE_ADS_DEVELOPER_TOKEN': 'Google Ads API Center → Apply for access (requires approval)',
        'GOOGLE_ADS_REFRESH_TOKEN': 'Google Cloud Console → OAuth 2.0 setup (advanced)',
        'GOOGLE_ANALYTICS_API_KEY': 'Google Cloud Console → APIs & Services → Credentials → Create API Key'
    }
    
    for key, instruction in help_info.items():
        print(f"\n{key}:")
        print(f"  {instruction}")
    
    print(f"\nFor detailed instructions, see: API_KEYS_SETUP_GUIDE.md")

def main():
    """Main function"""
    
    print("This script will help you set up API keys in your .env file.")
    print("Make sure you have the API keys ready before proceeding.")
    print()
    
    proceed = input("Continue with setup? (y/n): ").lower().strip()
    if proceed != 'y':
        show_api_key_help()
        return
    
    success = setup_env_file()
    
    if success:
        print("\nRun 'python test_api_keys.py' to verify your setup!")

if __name__ == "__main__":
    main()
