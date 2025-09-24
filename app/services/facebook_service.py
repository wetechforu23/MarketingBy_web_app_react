"""
Facebook Service for WeTechForU Healthcare Marketing Platform
Handles Facebook API integration and post management
"""

import requests
import logging
from typing import Dict, List, Optional
import os

logger = logging.getLogger(__name__)

class FacebookService:
    """Service for managing Facebook API operations"""
    
    def __init__(self):
        self.logger = logger
        self.app_id = os.getenv('FACEBOOK_APP_ID')
        self.app_secret = os.getenv('FACEBOOK_APP_SECRET')
        self.base_url = 'https://graph.facebook.com/v18.0'
    
    def is_configured(self) -> bool:
        """Check if Facebook service is properly configured"""
        return bool(self.app_id and self.app_secret)
    
    def create_post(self, page_id: str, access_token: str, message: str, 
                   image_url: Optional[str] = None) -> Dict:
        """Create a Facebook post"""
        try:
            if not self.is_configured():
                return {'success': False, 'error': 'Facebook service not configured'}
            
            url = f"{self.base_url}/{page_id}/feed"
            data = {
                'message': message,
                'access_token': access_token
            }
            
            if image_url:
                data['link'] = image_url
            
            response = requests.post(url, data=data)
            
            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            self.logger.error(f"Error creating Facebook post: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_page_insights(self, page_id: str, access_token: str) -> Dict:
        """Get Facebook page insights"""
        try:
            if not self.is_configured():
                return {'success': False, 'error': 'Facebook service not configured'}
            
            url = f"{self.base_url}/{page_id}/insights"
            params = {
                'metric': 'page_impressions,page_reach,page_engaged_users',
                'period': 'day',
                'access_token': access_token
            }
            
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            self.logger.error(f"Error getting Facebook insights: {e}")
            return {'success': False, 'error': str(e)}
    
    def schedule_post(self, page_id: str, access_token: str, message: str,
                     scheduled_time: str) -> Dict:
        """Schedule a Facebook post"""
        try:
            if not self.is_configured():
                return {'success': False, 'error': 'Facebook service not configured'}
            
            url = f"{self.base_url}/{page_id}/feed"
            data = {
                'message': message,
                'scheduled_publish_time': scheduled_time,
                'published': False,
                'access_token': access_token
            }
            
            response = requests.post(url, data=data)
            
            if response.status_code == 200:
                return {'success': True, 'data': response.json()}
            else:
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            self.logger.error(f"Error scheduling Facebook post: {e}")
            return {'success': False, 'error': str(e)}
