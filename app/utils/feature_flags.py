"""
Feature Flag System for Subscription Plans
"""

from functools import wraps
from flask import session, redirect, url_for, flash, jsonify, request
from services.subscription_service import SubscriptionService

def require_feature(feature_name, redirect_url=None, error_message=None):
    """
    Decorator to require a specific feature for accessing a route
    
    Args:
        feature_name (str): Name of the required feature
        redirect_url (str): URL to redirect to if feature not available
        error_message (str): Error message to show if feature not available
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client ID from session
            client_id = session.get('client_id')
            if not client_id:
                if redirect_url:
                    flash('Please log in to access this feature.', 'error')
                    return redirect(redirect_url)
                return jsonify({'error': 'Authentication required'}), 401
            
            # Check if client has access to the feature
            has_access = SubscriptionService.check_feature_access(client_id, feature_name)
            
            if not has_access:
                if redirect_url:
                    flash(f'This feature is not available in your current plan. Please upgrade to access {feature_name}.', 'error')
                    return redirect(redirect_url)
                return jsonify({
                    'error': error_message or f'Feature {feature_name} not available in your current plan'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_feature_access(feature_name):
    """
    Check if current client has access to a feature
    
    Args:
        feature_name (str): Name of the feature to check
        
    Returns:
        bool: True if client has access, False otherwise
    """
    client_id = session.get('client_id')
    if not client_id:
        return False
    
    return SubscriptionService.check_feature_access(client_id, feature_name)

def get_client_features():
    """
    Get all features available to the current client
    
    Returns:
        list: List of feature names available to the client
    """
    client_id = session.get('client_id')
    if not client_id:
        return []
    
    return SubscriptionService.get_client_features(client_id)

def track_feature_usage(feature_name, usage_count=1):
    """
    Track usage of a feature for the current client
    
    Args:
        feature_name (str): Name of the feature being used
        usage_count (int): Number of times the feature was used
    """
    client_id = session.get('client_id')
    if not client_id:
        return False
    
    return SubscriptionService.track_feature_usage(client_id, feature_name, usage_count)

def get_plan_info():
    """
    Get comprehensive plan information for the current client
    
    Returns:
        dict: Plan information including features, limits, and usage stats
    """
    client_id = session.get('client_id')
    if not client_id:
        return {}
    
    return SubscriptionService.get_client_plan_info(client_id)

class FeatureFlagMiddleware:
    """Middleware to inject feature flags into template context"""
    
    def __init__(self, app=None):
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app"""
        app.context_processor(self.inject_feature_flags)
    
    def inject_feature_flags(self):
        """Inject feature flags into template context"""
        client_id = session.get('client_id')
        if not client_id:
            return {
                'has_feature': lambda x: False,
                'client_features': [],
                'plan_info': {}
            }
        
        features = SubscriptionService.get_client_features(client_id)
        plan_info = SubscriptionService.get_client_plan_info(client_id)
        
        return {
            'has_feature': lambda feature_name: feature_name in features,
            'client_features': features,
            'plan_info': plan_info
        }

# Feature categories for UI organization
FEATURE_CATEGORIES = {
    'seo': {
        'name': 'SEO & Analytics',
        'icon': 'search',
        'color': 'primary',
        'features': [
            'seo_audit', 'keyword_research', 'competitor_analysis', 
            'backlink_analysis', 'seo_reporting'
        ]
    },
    'social_media': {
        'name': 'Social Media',
        'icon': 'share-alt',
        'color': 'info',
        'features': [
            'facebook_posting', 'instagram_posting', 'content_approval',
            'auto_posting', 'social_analytics'
        ]
    },
    'ads': {
        'name': 'Advertising',
        'icon': 'bullhorn',
        'color': 'warning',
        'features': [
            'google_ads', 'facebook_ads', 'ad_optimization', 'ad_analytics'
        ]
    },
    'automation': {
        'name': 'Automation',
        'icon': 'cogs',
        'color': 'success',
        'features': [
            'lead_generation', 'email_marketing', 'automated_outreach'
        ]
    },
    'analytics': {
        'name': 'Analytics & Reports',
        'icon': 'chart-bar',
        'color': 'secondary',
        'features': [
            'performance_dashboard', 'custom_reports', 'roi_tracking'
        ]
    }
}

def get_feature_categories():
    """Get feature categories for UI display"""
    return FEATURE_CATEGORIES

def get_features_by_category():
    """Get features organized by category"""
    client_features = get_client_features()
    categorized_features = {}
    
    for category, info in FEATURE_CATEGORIES.items():
        categorized_features[category] = {
            'name': info['name'],
            'icon': info['icon'],
            'color': info['color'],
            'features': []
        }
        
        for feature_name in info['features']:
            if feature_name in client_features:
                categorized_features[category]['features'].append(feature_name)
    
    return categorized_features

