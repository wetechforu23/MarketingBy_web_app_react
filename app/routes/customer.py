"""
Customer Routes
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from app.models.user import User
from app.models.client import Client
from app.models.seo_audit import SEOAudit
from app.models.communication import Communication
from app.models.campaign import Campaign
from app.models.content_approval import ContentApproval
from app.models.marketing_performance import MarketingPerformance
from app import db
from functools import wraps
from app.utils.feature_flags import require_feature, check_feature_access, get_client_features, get_plan_info, get_features_by_category
from app.services.subscription_service import SubscriptionService

customer_bp = Blueprint('customer', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/auth/login')
        user = User.query.get(session['user_id'])
        if not user or user.role != 'customer':
            return redirect('/auth/login')
        return f(*args, **kwargs)
    return decorated_function

@customer_bp.route('/')
@login_required
def customer_portal():
    try:
        # Get client data based on user's client_website
        client_website = session.get('client_website')
        if not client_website:
            flash('No client website associated with your account', 'error')
            return redirect('/auth/login')
        
        client = Client.query.filter_by(website=client_website).first()
        if not client:
            flash('Client not found', 'error')
            return redirect('/auth/login')
        
        # Get client data
        seo_audits = SEOAudit.query.filter_by(client_id=client.id).order_by(SEOAudit.audit_date.desc()).limit(5).all()
        communications = Communication.query.filter_by(client_id=client.id).order_by(Communication.sent_at.desc()).limit(5).all()
        campaigns = Campaign.query.filter_by(client_id=client.id).all()
        content_approvals = ContentApproval.query.filter_by(client_id=client.id).order_by(ContentApproval.created_at.desc()).limit(10).all()
        marketing_performance = MarketingPerformance.query.filter_by(client_id=client.id).order_by(MarketingPerformance.date_tracked.desc()).limit(10).all()
        
        # Calculate pending content count
        pending_content_count = ContentApproval.query.filter_by(
            client_id=client.id,
            status='review'
        ).count()
        
        # Calculate new patients count (mock data for now)
        new_patients_count = 0  # This would come from actual patient data
        
        return render_template('clinic_customer_portal.html',
                             client=client,
                             seo_audits=seo_audits,
                             communications=communications,
                             campaigns=campaigns,
                             content_approvals=content_approvals,
                             marketing_performance=marketing_performance,
                             pending_content_count=pending_content_count,
                             new_patients_count=new_patients_count)
    except Exception as e:
        print(f"ERROR:__main__:Error loading customer portal: {e}")
        flash('Error loading customer portal', 'error')
        return redirect('/auth/login')

@customer_bp.route('/seo-reports')
@login_required
def seo_reports():
    client_website = session.get('client_website')
    client = Client.query.filter_by(website=client_website).first()
    if not client:
        flash('Client not found', 'error')
        return redirect('/customer')
    
    seo_audits = SEOAudit.query.filter_by(client_id=client.id).order_by(SEOAudit.audit_date.desc()).all()
    return render_template('customer_seo_reports.html', client=client, seo_audits=seo_audits)

@customer_bp.route('/content-approval')
@login_required
def content_approval():
    client_website = session.get('client_website')
    client = Client.query.filter_by(website=client_website).first()
    if not client:
        flash('Client not found', 'error')
        return redirect('/customer')
    
    content_approvals = ContentApproval.query.filter_by(client_id=client.id).order_by(ContentApproval.created_at.desc()).all()
    return render_template('customer_content_approval.html', client=client, content_approvals=content_approvals)

@customer_bp.route('/performance')
@login_required
def performance():
    client_website = session.get('client_website')
    client = Client.query.filter_by(website=client_website).first()
    if not client:
        flash('Client not found', 'error')
        return redirect('/customer')
    
    marketing_performance = MarketingPerformance.query.filter_by(client_id=client.id).order_by(MarketingPerformance.date_tracked.desc()).all()
    return render_template('customer_performance.html', client=client, marketing_performance=marketing_performance)

@customer_bp.route('/communications')
@login_required
def communications():
    client_website = session.get('client_website')
    client = Client.query.filter_by(website=client_website).first()
    if not client:
        flash('Client not found', 'error')
        return redirect('/customer')
    
    communications = Communication.query.filter_by(client_id=client.id).order_by(Communication.sent_at.desc()).all()
    return render_template('customer_communications.html', client=client, communications=communications)

@customer_bp.route('/plan')
@login_required
def plan_info():
    """Display client's subscription plan and features"""
    try:
        client_website = session.get('client_website')
        client = Client.query.filter_by(website_url=client_website).first()
        if not client:
            flash('Client not found', 'error')
            return redirect('/customer')
        
        # Get plan information
        plan_info = SubscriptionService.get_client_plan_info(client.id)
        features_by_category = get_features_by_category()
        
        return render_template('customer/plan_info.html', 
                             client=client, 
                             plan_info=plan_info,
                             features_by_category=features_by_category)
    except Exception as e:
        flash(f'Error loading plan information: {e}', 'error')
        return redirect('/customer')
