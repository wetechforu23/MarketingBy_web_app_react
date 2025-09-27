"""
Database migration script for Heroku deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import user, client, lead, seo_audit, content_approval, campaign, communication, marketing_performance, subscription, client_google_ads, email_template, secure_link, email_tracking, compliance, compliance_settings

def migrate():
    """Run database migrations"""
    app = create_app()
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            # Initialize default data
            from app.utils.init_data import create_default_users, create_industry_data, create_sample_data
            from app.services.subscription_service import SubscriptionService
            
            create_default_users()
            print("✅ Default users created")
            
            create_industry_data()
            print("✅ Industry data created")
            
            create_sample_data()
            print("✅ Sample data created")
            
            SubscriptionService.create_default_plans()
            print("✅ Default subscription plans created")
            
            print("🎉 Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
