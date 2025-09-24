"""
Google OAuth Routes for Client Authorization
"""

from flask import Blueprint, request, redirect, url_for, session, flash, jsonify
from flask_login import login_required, current_user
import os
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

google_oauth_bp = Blueprint('google_oauth', __name__, url_prefix='/auth/google')

# OAuth 2.0 configuration
SCOPES = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

@google_oauth_bp.route('/authorize')
@login_required
def authorize():
    """Initiate Google OAuth flow for client authorization"""
    try:
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_ADS_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_ADS_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [os.getenv('GOOGLE_ADS_REDIRECT_URI', 'http://localhost:9000/auth/google/callback')]
                }
            },
            scopes=SCOPES
        )
        
        # Set redirect URI
        flow.redirect_uri = url_for('google_oauth.callback', _external=True)
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        
        # Store state in session
        session['oauth_state'] = state
        session['user_id'] = current_user.id
        
        return redirect(authorization_url)
        
    except Exception as e:
        flash(f'OAuth authorization error: {str(e)}', 'error')
        return redirect(url_for('admin.client_management'))

@google_oauth_bp.route('/callback')
@login_required
def callback():
    """Handle Google OAuth callback"""
    try:
        # Get authorization code from callback
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code:
            flash('Authorization failed: No code received', 'error')
            return redirect(url_for('admin.client_management'))
        
        # Verify state
        if state != session.get('oauth_state'):
            flash('Authorization failed: Invalid state', 'error')
            return redirect(url_for('admin.client_management'))
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_ADS_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_ADS_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [os.getenv('GOOGLE_ADS_REDIRECT_URI', 'http://localhost:9000/auth/google/callback')]
                }
            },
            scopes=SCOPES
        )
        
        flow.redirect_uri = url_for('google_oauth.callback', _external=True)
        
        # Exchange code for tokens
        flow.fetch_token(code=code)
        
        # Get credentials
        credentials = flow.credentials
        
        # Store credentials for the user
        # In a real implementation, you'd store these securely in the database
        session['google_ads_credentials'] = {
            'token': credentials.token,
            'refresh_token': credentials.refresh_token,
            'token_uri': credentials.token_uri,
            'client_id': credentials.client_id,
            'client_secret': credentials.client_secret,
            'scopes': credentials.scopes
        }
        
        flash('Google Ads authorization successful!', 'success')
        return redirect(url_for('admin.client_management'))
        
    except Exception as e:
        flash(f'OAuth callback error: {str(e)}', 'error')
        return redirect(url_for('admin.client_management'))

@google_oauth_bp.route('/revoke')
@login_required
def revoke():
    """Revoke Google OAuth authorization"""
    try:
        # Clear stored credentials
        session.pop('google_ads_credentials', None)
        session.pop('oauth_state', None)
        
        flash('Google Ads authorization revoked', 'info')
        return redirect(url_for('admin.client_management'))
        
    except Exception as e:
        flash(f'Revocation error: {str(e)}', 'error')
        return redirect(url_for('admin.client_management'))

@google_oauth_bp.route('/status')
@login_required
def status():
    """Check Google OAuth authorization status"""
    try:
        credentials_data = session.get('google_ads_credentials')
        
        if not credentials_data:
            return jsonify({
                'authorized': False,
                'message': 'Not authorized'
            })
        
        # Check if credentials are still valid
        credentials = Credentials(
            token=credentials_data['token'],
            refresh_token=credentials_data['refresh_token'],
            token_uri=credentials_data['token_uri'],
            client_id=credentials_data['client_id'],
            client_secret=credentials_data['client_secret'],
            scopes=credentials_data['scopes']
        )
        
        # Refresh if needed
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
                # Update session with new token
                session['google_ads_credentials']['token'] = credentials.token
        
        return jsonify({
            'authorized': True,
            'message': 'Authorized and valid',
            'scopes': credentials.scopes
        })
        
    except Exception as e:
        return jsonify({
            'authorized': False,
            'error': str(e)
        })
