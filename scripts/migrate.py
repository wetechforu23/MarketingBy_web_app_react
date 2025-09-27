"""
Database migration script for Heroku deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    """Run database migrations"""
    try:
        from app import create_app, db
        
        # Create app
        app = create_app()
        
        with app.app_context():
            # Import all models individually to ensure they're registered
            from app.models.user import User
            from app.models.client import Client
            from app.models.lead import Lead, IndustryCategory, IndustrySubcategory, SearchKeyword
            from app.models.seo_audit import SEOAudit
            from app.models.content_approval import ContentApproval
            from app.models.campaign import Campaign
            from app.models.communication import Communication
            from app.models.marketing_performance import MarketingPerformance
            from app.models.keyword_analysis import (
                KeywordAnalysis, CompetitorAnalysis, KeywordRecommendation,
                KeywordCampaign, BacklinkCampaign, GoogleAdsCampaign, ClientAcquisition
            )
            from app.models.subscription import (
                SubscriptionPlan, Feature, PlanFeature, ClientSubscription, FeatureUsage
            )
            from app.models.client_google_ads import ClientGoogleAds
            from app.models.email_template import EmailTemplate
            from app.models.secure_link import SecureLink
            # EmailTracking model temporarily commented out due to import issues
            # from app.models.email_tracking import EmailTracking
            
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            print("🎉 Migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    migrate()
