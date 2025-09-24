"""
Initialize default data
"""

from app import db
from app.models.user import User
from app.models.client import Client
from app.models.lead import IndustryCategory, IndustrySubcategory, SearchKeyword
from app.models.seo_audit import SEOAudit
from app.models.communication import Communication
from app.models.campaign import Campaign
from app.models.content_approval import ContentApproval
from app.models.marketing_performance import MarketingPerformance
from datetime import datetime, date

def create_default_users():
    """Create default users if they don't exist"""
    try:
        # Check if users already exist
        if User.query.first():
            print("INFO:__main__:Users already exist, skipping user creation")
            return
        
        # Create admin user
        admin = User(
            username='admin',
            email='admin@wetechforu.com',
            role='admin',
            is_active=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
        
        # Create promed user
        promed = User(
            username='promed',
            email='info@promedhca.com',
            role='customer',
            client_website='https://promedhca.com/',
            is_active=True
        )
        promed.set_password('Promed123')
        db.session.add(promed)
        
        # Create wetechforu user
        wetechforu = User(
            username='wetechforu',
            email='info@wetechforu.com',
            role='customer',
            client_website='https://wetechforu.com/',
            is_active=True
        )
        wetechforu.set_password('Wetechforu123')
        db.session.add(wetechforu)
        
        db.session.commit()
        print("INFO:__main__:Default users created successfully")
        
    except Exception as e:
        print(f"ERROR:__main__:Error creating default users: {e}")
        db.session.rollback()

def create_industry_data():
    """Create industry categories and subcategories"""
    try:
        # Check if industry data already exists
        if IndustryCategory.query.first():
            print("INFO:__main__:Industry data already exists, skipping creation")
            return
        
        # Healthcare categories
        healthcare = IndustryCategory(name='Healthcare', description='Medical and healthcare services')
        db.session.add(healthcare)
        db.session.flush()
        
        # Healthcare subcategories
        subcategories = [
            ('Primary Care', healthcare.id, 'General medical care and family medicine'),
            ('Dental', healthcare.id, 'Dental care and oral health services'),
            ('Mental Health', healthcare.id, 'Mental health and counseling services'),
            ('Specialty Care', healthcare.id, 'Specialized medical services'),
            ('Urgent Care', healthcare.id, 'Emergency and urgent medical care')
        ]
        
        for name, cat_id, desc in subcategories:
            subcat = IndustrySubcategory(name=name, category_id=cat_id, description=desc)
            db.session.add(subcat)
            db.session.flush()
            
            # Add keywords for each subcategory
            if name == 'Primary Care':
                keywords = ['family doctor', 'primary care physician', 'general practitioner', 'family medicine', 'internal medicine']
            elif name == 'Dental':
                keywords = ['dentist', 'dental care', 'oral health', 'dental cleaning', 'dental implants']
            elif name == 'Mental Health':
                keywords = ['therapist', 'counselor', 'mental health', 'psychologist', 'psychiatrist']
            elif name == 'Specialty Care':
                keywords = ['specialist', 'cardiology', 'dermatology', 'orthopedics', 'pediatrics']
            else:  # Urgent Care
                keywords = ['urgent care', 'emergency care', 'walk-in clinic', 'immediate care', 'after hours care']
            
            for keyword in keywords:
                search_keyword = SearchKeyword(
                    keyword=keyword,
                    subcategory_id=subcat.id,
                    search_volume=1000,
                    competition_level='medium'
                )
                db.session.add(search_keyword)
        
        db.session.commit()
        print("INFO:__main__:Industry data created successfully")
        
    except Exception as e:
        print(f"ERROR:__main__:Error creating industry data: {e}")
        db.session.rollback()

def create_sample_data():
    """Create sample data for testing"""
    try:
        # Check if sample data already exists
        if Client.query.first():
            print("INFO:__main__:Sample data already exists, skipping creation")
            return
        
        # Create ProMed Healthcare Associates client
        promed_client = Client(
            client_name='ProMed Healthcare Associates',
            website='https://promedhca.com/',
            email='info@promedhca.com',
            phone='(555) 123-4567',
            address='123 Medical Center Dr, Healthcare City, HC 12345',
            specialties='Primary Care, Internal Medicine, Family Medicine',
            monthly_retainer=2500.00,
            is_active=True
        )
        db.session.add(promed_client)
        db.session.flush()
        
        # Create SEO audit for ProMed
        seo_audit = SEOAudit(
            client_id=promed_client.id,
            website_url='https://promedhca.com/',
            overall_score=78,
            page_speed_score=85,
            mobile_friendly_score=92,
            seo_score=75,
            accessibility_score=88,
            best_practices_score=82,
            issues_found='Missing meta descriptions on 3 pages, slow loading images, need more internal linking',
            recommendations='Add meta descriptions, optimize images, improve internal linking structure, add schema markup',
            audit_date=datetime.utcnow()
        )
        db.session.add(seo_audit)
        
        # Create sample communication
        communication = Communication(
            client_id=promed_client.id,
            communication_type='email',
            subject='Monthly SEO Report - January 2024',
            message='Here is your monthly SEO performance report showing improvements in search rankings and website traffic.',
            direction='outbound',
            status='delivered'
        )
        db.session.add(communication)
        
        # Create sample campaign
        campaign = Campaign(
            client_id=promed_client.id,
            name='ProMed Local SEO Campaign',
            campaign_type='seo',
            platform='google',
            status='active',
            budget=1500.00,
            start_date=date(2024, 1, 1),
            target_audience='Local patients seeking primary care',
            objectives='Increase local search visibility and patient appointments'
        )
        db.session.add(campaign)
        
        # Create sample content approval
        content = ContentApproval(
            client_id=promed_client.id,
            content_type='post',
            content_title='Welcome to ProMed Healthcare Associates',
            content_body='We are excited to announce our new patient portal and online appointment booking system. Schedule your next visit with ease!',
            platform='facebook',
            status='draft'
        )
        db.session.add(content)
        
        # Create sample marketing performance
        performance = MarketingPerformance(
            client_id=promed_client.id,
            campaign_id=campaign.id,
            platform='facebook',
            metric_type='impressions',
            metric_value=12500,
            date_tracked=date(2024, 1, 15),
            cost=250.00,
            revenue_attributed=1200.00
        )
        db.session.add(performance)
        
        db.session.commit()
        print("INFO:__main__:Sample data created successfully")
        
    except Exception as e:
        print(f"ERROR:__main__:Error creating sample data: {e}")
        db.session.rollback()

