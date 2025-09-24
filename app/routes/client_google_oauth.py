"""
Client-specific Google Ads OAuth Routes
Allows clients to grant permission to manage their Google Ads accounts
"""

from flask import Blueprint, request, redirect, url_for, session, flash, jsonify, render_template
from flask_login import login_required, current_user
from app import db
import os
import json
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

client_google_oauth_bp = Blueprint('client_google_oauth', __name__, url_prefix='/client/google')

# Google Ads OAuth scopes for client account management
GOOGLE_ADS_SCOPES = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

@client_google_oauth_bp.route('/ads/authorize/<int:client_id>')
@login_required
def authorize_client_google_ads(client_id):
    """Initiate Google Ads OAuth flow for a specific client"""
    try:
        from app.models.client import Client
        
        # Get client
        client = Client.query.get_or_404(client_id)
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_ADS_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_ADS_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [url_for('client_google_oauth.callback', client_id=client_id, _external=True)]
                }
            },
            scopes=GOOGLE_ADS_SCOPES
        )
        
        # Set redirect URI
        flow.redirect_uri = url_for('client_google_oauth.callback', client_id=client_id, _external=True)
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            login_hint=client.email  # Pre-fill client's email
        )
        
        # Store state and client info in session
        session['oauth_state'] = state
        session['oauth_client_id'] = client_id
        session['oauth_admin_id'] = current_user.id
        
        return redirect(authorization_url)
        
    except Exception as e:
        flash(f'Google Ads authorization error: {str(e)}', 'error')
        return redirect(url_for('admin.client_management', client_id=client_id))

@client_google_oauth_bp.route('/ads/callback/<int:client_id>')
@login_required
def callback(client_id):
    """Handle Google Ads OAuth callback for client"""
    try:
        from app.models.client import Client
        from app.models.client_google_ads import ClientGoogleAds
        
        # Get client
        client = Client.query.get_or_404(client_id)
        
        # Get authorization code from callback
        code = request.args.get('code')
        state = request.args.get('state')
        
        if not code:
            flash('Google Ads authorization failed: No code received', 'error')
            return redirect(url_for('admin.client_management', client_id=client_id))
        
        # Verify state
        if state != session.get('oauth_state'):
            flash('Google Ads authorization failed: Invalid state', 'error')
            return redirect(url_for('admin.client_management', client_id=client_id))
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_ADS_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_ADS_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [url_for('client_google_oauth.callback', client_id=client_id, _external=True)]
                }
            },
            scopes=GOOGLE_ADS_SCOPES
        )
        
        flow.redirect_uri = url_for('client_google_oauth.callback', client_id=client_id, _external=True)
        
        # Exchange code for credentials
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Store client's Google Ads credentials
        client_google_ads = ClientGoogleAds.query.filter_by(client_id=client_id).first()
        
        if not client_google_ads:
            client_google_ads = ClientGoogleAds(
                client_id=client_id,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_uri=credentials.token_uri,
                client_id_google=credentials.client_id,
                client_secret_google=credentials.client_secret,
                scopes=','.join(credentials.scopes),
                is_active=True,
                authorized_at=datetime.utcnow(),
                authorized_by=current_user.id
            )
            db.session.add(client_google_ads)
        else:
            # Update existing credentials
            client_google_ads.access_token = credentials.token
            client_google_ads.refresh_token = credentials.refresh_token
            client_google_ads.is_active = True
            client_google_ads.authorized_at = datetime.utcnow()
            client_google_ads.authorized_by = current_user.id
        
        db.session.commit()
        
        flash(f'✅ Google Ads access authorized for {client.client_name}!', 'success')
        return redirect(url_for('admin.client_management', client_id=client_id))
        
    except Exception as e:
        flash(f'Google Ads authorization error: {str(e)}', 'error')
        return redirect(url_for('admin.client_management', client_id=client_id))

@client_google_oauth_bp.route('/ads/status/<int:client_id>')
@login_required
def get_client_google_ads_status(client_id):
    """Get Google Ads authorization status for a client"""
    try:
        from app.models.client import Client
        from app.models.client_google_ads import ClientGoogleAds
        
        client = Client.query.get_or_404(client_id)
        client_google_ads = ClientGoogleAds.query.filter_by(client_id=client_id).first()
        
        if client_google_ads and client_google_ads.is_active:
            return jsonify({
                'success': True,
                'authorized': True,
                'authorized_at': client_google_ads.authorized_at.isoformat(),
                'authorized_by': client_google_ads.authorized_by,
                'scopes': client_google_ads.scopes.split(',') if client_google_ads.scopes else []
            })
        else:
            return jsonify({
                'success': True,
                'authorized': False,
                'message': 'Google Ads not authorized for this client'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@client_google_oauth_bp.route('/ads/revoke/<int:client_id>')
@login_required
def revoke_client_google_ads(client_id):
    """Revoke Google Ads access for a client"""
    try:
        from app.models.client import Client
        from app.models.client_google_ads import ClientGoogleAds
        
        client = Client.query.get_or_404(client_id)
        client_google_ads = ClientGoogleAds.query.filter_by(client_id=client_id).first()
        
        if client_google_ads:
            # Revoke the token with Google
            try:
                credentials = Credentials(
                    token=client_google_ads.access_token,
                    refresh_token=client_google_ads.refresh_token,
                    token_uri=client_google_ads.token_uri,
                    client_id=client_google_ads.client_id_google,
                    client_secret=client_google_ads.client_secret_google,
                    scopes=client_google_ads.scopes.split(',') if client_google_ads.scopes else []
                )
                credentials.revoke(Request())
            except Exception as e:
                print(f"Warning: Could not revoke token with Google: {e}")
            
            # Deactivate in database
            client_google_ads.is_active = False
            client_google_ads.revoked_at = datetime.utcnow()
            client_google_ads.revoked_by = current_user.id
            db.session.commit()
            
            flash(f'✅ Google Ads access revoked for {client.client_name}', 'success')
        else:
            flash('No Google Ads access found for this client', 'info')
        
        return redirect(url_for('admin.client_management', client_id=client_id))
        
    except Exception as e:
        flash(f'Error revoking Google Ads access: {str(e)}', 'error')
        return redirect(url_for('admin.client_management', client_id=client_id))
