"""
Marketplace API Routes for WeTechForU Marketing Platform
"""

from flask import Blueprint, request, jsonify, make_response
from flask_login import login_required, current_user
from app import db
import csv
import io
from datetime import datetime, timedelta

marketplace_api_bp = Blueprint('marketplace_api', __name__, url_prefix='/api/marketplace')

def require_api_auth(f):
    """Custom decorator for API authentication that returns JSON errors"""
    from functools import wraps
    from flask import session
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check both Flask-Login and session-based authentication
        if not current_user.is_authenticated and 'user_id' not in session:
            return jsonify({
                'success': False,
                'error': 'Authentication required',
                'message': 'Please log in to access this API endpoint',
                'debug': {
                    'current_user_authenticated': current_user.is_authenticated,
                    'session_user_id': session.get('user_id'),
                    'current_user_id': getattr(current_user, 'id', None)
                }
            }), 401
        return f(*args, **kwargs)
    return decorated_function

@marketplace_api_bp.route('/clients/create', methods=['POST'])
@require_api_auth
def create_client():
    """Create a new client for the marketplace"""
    try:
        from app.models.client import Client
        from app.models.user import User
        
        data = request.get_json()
        
        # Create client user account
        client_user = User(
            username=data.get('email'),
            email=data.get('email'),
            role='customer',
            is_active=True
        )
        client_user.set_password('temp_password_123')  # Will be changed on first login
        
        db.session.add(client_user)
        db.session.flush()  # Get the user ID
        
        # Create client record
        client = Client(
            client_name=data.get('business_name'),
            website=data.get('website', ''),
            contact_name=data.get('contact_name'),
            email=data.get('email'),
            phone=data.get('phone', ''),
            is_active=True,
            created_at=datetime.utcnow()
        )
        
        db.session.add(client)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'client_id': client.id,
            'user_id': client_user.id,
            'message': f'Client {client.client_name} created successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@marketplace_api_bp.route('/clients/list', methods=['GET'])
@require_api_auth
def list_clients():
    """Get list of all clients for marketplace dashboard"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        from app.models.lead import Lead
        
        clients = Client.query.all()
        
        client_list = []
        for client in clients:
            # Get campaign count
            campaign_count = Campaign.query.filter_by(client_id=client.id).count()
            
            # Get lead count
            lead_count = Lead.query.count()  # Total leads for now
            
            # Calculate revenue (mock for now)
            revenue = 0
            if client.subscription_plan == 'basic':
                revenue = 299
            elif client.subscription_plan == 'professional':
                revenue = 599
            elif client.subscription_plan == 'enterprise':
                revenue = 999
            
            client_list.append({
                'id': client.id,
                'client_name': client.client_name,
                'business_type': client.business_type,
                'email': client.email,
                'is_active': client.is_active,
                'campaigns': campaign_count,
                'leads': lead_count,
                'revenue': revenue,
                'subscription_plan': client.subscription_plan,
                'created_at': client.created_at.isoformat() if client.created_at else None
            })
        
        return jsonify({
            'success': True,
            'clients': client_list,
            'total': len(client_list)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@marketplace_api_bp.route('/metrics', methods=['GET'])
@require_api_auth
def get_marketplace_metrics():
    """Get marketplace metrics for dashboard"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        from app.models.lead import Lead
        
        # Calculate metrics
        total_clients = Client.query.count()
        active_clients = Client.query.filter_by(is_active=True).count()
        total_campaigns = Campaign.query.count()
        total_leads = Lead.query.count()
        
        # Calculate revenue
        revenue = 0
        for client in Client.query.filter_by(is_active=True).all():
            if client.subscription_plan == 'basic':
                revenue += 299
            elif client.subscription_plan == 'professional':
                revenue += 599
            elif client.subscription_plan == 'enterprise':
                revenue += 999
        
        # Calculate average performance (mock)
        avg_performance = 75  # This would be calculated from actual performance data
        
        return jsonify({
            'success': True,
            'metrics': {
                'total_clients': total_clients,
                'active_clients': active_clients,
                'revenue': revenue,
                'campaigns': total_campaigns,
                'leads': total_leads,
                'performance': avg_performance
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@marketplace_api_bp.route('/activity', methods=['GET'])
@require_api_auth
def get_marketplace_activity():
    """Get recent marketplace activity"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        
        activities = []
        
        # Get recent clients
        recent_clients = Client.query.filter(
            Client.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(Client.created_at.desc()).limit(5).all()
        
        for client in recent_clients:
            activities.append({
                'icon': 'user-plus',
                'color': 'success',
                'message': f'New client added: {client.client_name}',
                'time': client.created_at.strftime('%H:%M') if client.created_at else 'Unknown'
            })
        
        # Get recent campaigns
        recent_campaigns = Campaign.query.filter(
            Campaign.created_at >= datetime.utcnow() - timedelta(days=7)
        ).order_by(Campaign.created_at.desc()).limit(5).all()
        
        for campaign in recent_campaigns:
            client = Client.query.get(campaign.client_id)
            activities.append({
                'icon': 'bullhorn',
                'color': 'primary',
                'message': f'Campaign created for {client.client_name if client else "Unknown"}',
                'time': campaign.created_at.strftime('%H:%M') if campaign.created_at else 'Unknown'
            })
        
        # Sort by time (most recent first)
        activities.sort(key=lambda x: x['time'], reverse=True)
        
        return jsonify({
            'success': True,
            'activities': activities[:10]  # Return top 10
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@marketplace_api_bp.route('/export-report', methods=['GET'])
@require_api_auth
def export_marketplace_report():
    """Export marketplace report"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        
        # Create CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Client Name', 'Business Type', 'Email', 'Status', 'Plan', 'Campaigns', 'Revenue'])
        
        # Write client data
        clients = Client.query.all()
        for client in clients:
            campaign_count = Campaign.query.filter_by(client_id=client.id).count()
            
            revenue = 0
            if client.subscription_plan == 'basic':
                revenue = 299
            elif client.subscription_plan == 'professional':
                revenue = 599
            elif client.subscription_plan == 'enterprise':
                revenue = 999
            
            writer.writerow([
                client.client_name,
                client.business_type or '',
                client.email,
                'Active' if client.is_active else 'Inactive',
                client.subscription_plan or '',
                campaign_count,
                revenue
            ])
        
        # Create response
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = 'attachment; filename=marketplace_report.csv'
        
        return response
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
