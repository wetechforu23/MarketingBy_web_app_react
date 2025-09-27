"""
WeTechForU AI Marketing Platform
Main Flask Application Factory
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    """Application factory pattern"""
    app = Flask(__name__, template_folder='../templates')
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    # Handle Heroku's postgres:// URLs (convert to postgresql://)
    database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/health_clinic_marketing')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['DEDICATED_PORT'] = int(os.getenv('FLASK_PORT', 9000))
    
    # Initialize extensions with app
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    
    # Import models
    from app.models import user, client, lead, seo_audit, content_approval, campaign, communication, marketing_performance, subscription, client_google_ads, email_template, secure_link, email_tracking
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.customer import customer_bp
    from app.routes.api import api_bp
    from app.routes.subscription import subscription_bp
    from app.routes.google_oauth import google_oauth_bp
    from app.routes.client_google_oauth import client_google_oauth_bp
    from app.routes.marketplace_api import marketplace_api_bp
    from app.routes.lead_management import lead_mgmt_bp
    # Temporarily commented out to fix startup issues
    # from app.routes.secure_links import secure_links_bp
    # from app.routes.email_tracking import email_tracking_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(customer_bp, url_prefix='/customer')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(subscription_bp)
    app.register_blueprint(google_oauth_bp)
    app.register_blueprint(client_google_oauth_bp)
    app.register_blueprint(marketplace_api_bp)
    app.register_blueprint(lead_mgmt_bp, url_prefix='/admin')
    # Temporarily commented out to fix startup issues
    # app.register_blueprint(secure_links_bp)
    # app.register_blueprint(email_tracking_bp)
    
    # Root route
    @app.route('/')
    def index():
        from flask import redirect, session
        if 'user_id' in session:
            from app.models.user import User
            user = User.query.get(session['user_id'])
            if user and user.role == 'admin':
                return redirect('/admin')
            elif user and user.role == 'customer':
                return redirect('/customer')
        return redirect('/home')
    
    @app.route('/home')
    def home():
        from flask import redirect
        return redirect('/auth/login')
    
    @app.route('/logout')
    def logout():
        from flask import session, redirect
        session.clear()
        return redirect('/home')
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        from flask import redirect
        return redirect('/auth/login')
    
    # Add missing routes for admin portal links
    @app.route('/clients')
    def clients():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        from app.models.client import Client
        clients = Client.query.all()
        return render_template('clients.html', clients=clients)
    
    @app.route('/leads')
    def leads():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        from app.models.lead import Lead
        leads = Lead.query.order_by(Lead.created_at.desc()).all()
        return render_template('leads_enhanced.html', leads=leads)
    
    @app.route('/lead-finder')
    def lead_finder():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        return render_template('lead_finder.html')
    
    @app.route('/campaigns')
    def campaigns():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        from app.models.campaign import Campaign
        campaigns = Campaign.query.all()
        return render_template('campaigns.html', campaigns=campaigns)
    
    @app.route('/analytics')
    def analytics():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        return render_template('analytics.html')
    
    @app.route('/add_client')
    def add_client():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        return render_template('add_client.html')
    
    @app.route('/scrape_clinics')
    def scrape_clinics():
        from flask import redirect
        return redirect('/lead-finder')
    
    @app.route('/seo_audit')
    def seo_audit():
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        return render_template('seo_audit.html')
    
    @app.route('/client/<int:client_id>/portal')
    def client_portal(client_id):
        from flask import session, redirect, render_template
        if 'user_id' not in session:
            return redirect('/home')
        
        # Get the client
        from app.models.client import Client
        client = Client.query.get_or_404(client_id)
        
        # Get the user associated with this client
        from app.models.user import User
        client_user = User.query.filter_by(client_website=client.website).first()
        
        if client_user:
            # Switch session to the client user
            session['user_id'] = client_user.id
            session['username'] = client_user.username
            session['role'] = client_user.role
            session['client_website'] = client_user.client_website
            return redirect('/customer')
        else:
            # If no user found, redirect to admin client management
            return redirect(f'/admin/client/{client_id}')
    
    # Create tables
    with app.app_context():
        db.create_all()
        
        # Initialize default data
        from app.utils.init_data import create_default_users, create_industry_data, create_sample_data
        from app.services.subscription_service import SubscriptionService
        create_default_users()
        create_industry_data()
        create_sample_data()
        SubscriptionService.create_default_plans()
    
    return app
