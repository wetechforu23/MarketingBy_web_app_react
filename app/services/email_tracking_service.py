"""
Email Tracking Service for Comprehensive Email Analytics
"""

import os
import uuid
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from app import db
from app.models.email_tracking import (
    EmailDelivery, EmailOpen, EmailClick, SecureLinkAccess, EmailEngagement
)
from app.models.secure_link import SecureLink

class EmailTrackingService:
    """Comprehensive email tracking service"""
    
    def __init__(self):
        self.base_url = os.getenv('BASE_URL', 'http://localhost:9001')
    
    def create_tracking_pixel(self, delivery_id: int) -> str:
        """Create tracking pixel URL for email opens"""
        return f"{self.base_url}/track/email-open/{delivery_id}"
    
    def create_click_tracking_url(self, delivery_id: int, original_url: str, link_text: str = None) -> str:
        """Create click tracking URL"""
        return f"{self.base_url}/track/email-click/{delivery_id}?url={original_url}&text={link_text or ''}"
    
    def record_email_delivery(self, lead_id: int, campaign_id: int, to_email: str, 
                            subject: str, message_id: str = None) -> EmailDelivery:
        """Record email delivery"""
        
        delivery = EmailDelivery(
            lead_id=lead_id,
            campaign_id=campaign_id,
            to_email=to_email,
            subject=subject,
            message_id=message_id or str(uuid.uuid4()),
            status='sent',
            sent_at=datetime.utcnow()
        )
        
        db.session.add(delivery)
        db.session.commit()
        
        # Create engagement record
        engagement = EmailEngagement(
            lead_id=lead_id,
            campaign_id=campaign_id,
            delivery_id=delivery.id
        )
        
        db.session.add(engagement)
        db.session.commit()
        
        return delivery
    
    def record_email_open(self, delivery_id: int, ip_address: str = None, 
                         user_agent: str = None) -> EmailOpen:
        """Record email open"""
        
        # Get location from IP
        location = self.get_location_from_ip(ip_address) if ip_address else None
        
        email_open = EmailOpen(
            delivery_id=delivery_id,
            opened_at=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent,
            location=location
        )
        
        db.session.add(email_open)
        
        # Update engagement metrics
        engagement = EmailEngagement.query.filter_by(delivery_id=delivery_id).first()
        if engagement:
            if not engagement.is_opened:
                engagement.is_opened = True
                engagement.first_opened_at = datetime.utcnow()
                engagement.time_to_open = int((datetime.utcnow() - engagement.delivery.sent_at).total_seconds())
            
            engagement.open_count += 1
            engagement.last_opened_at = datetime.utcnow()
        
        db.session.commit()
        return email_open
    
    def record_email_click(self, delivery_id: int, link_url: str, link_text: str = None,
                          ip_address: str = None, user_agent: str = None) -> EmailClick:
        """Record email click"""
        
        # Get location from IP
        location = self.get_location_from_ip(ip_address) if ip_address else None
        
        email_click = EmailClick(
            delivery_id=delivery_id,
            clicked_at=datetime.utcnow(),
            link_url=link_url,
            link_text=link_text,
            ip_address=ip_address,
            user_agent=user_agent,
            location=location
        )
        
        db.session.add(email_click)
        
        # Update engagement metrics
        engagement = EmailEngagement.query.filter_by(delivery_id=delivery_id).first()
        if engagement:
            if not engagement.is_clicked:
                engagement.is_clicked = True
                engagement.first_clicked_at = datetime.utcnow()
                engagement.time_to_click = int((datetime.utcnow() - engagement.delivery.sent_at).total_seconds())
            
            engagement.click_count += 1
            engagement.last_clicked_at = datetime.utcnow()
        
        db.session.commit()
        return email_click
    
    def record_secure_link_access(self, secure_link_id: int, ip_address: str = None,
                                 user_agent: str = None, otp_verified: bool = False) -> SecureLinkAccess:
        """Record secure link access"""
        
        # Get location from IP
        location = self.get_location_from_ip(ip_address) if ip_address else None
        
        access = SecureLinkAccess(
            secure_link_id=secure_link_id,
            accessed_at=datetime.utcnow(),
            ip_address=ip_address,
            user_agent=user_agent,
            location=location,
            otp_verified=otp_verified,
            otp_verified_at=datetime.utcnow() if otp_verified else None
        )
        
        db.session.add(access)
        
        # Update engagement metrics
        secure_link = SecureLink.query.get(secure_link_id)
        if secure_link:
            engagement = EmailEngagement.query.filter_by(
                lead_id=secure_link.lead_id,
                campaign_id=secure_link.campaign_id
            ).first()
            
            if engagement:
                if not engagement.is_secure_link_accessed:
                    engagement.is_secure_link_accessed = True
                    engagement.secure_link_accessed_at = datetime.utcnow()
                    engagement.time_to_secure_access = int(
                        (datetime.utcnow() - engagement.delivery.sent_at).total_seconds()
                    )
                
                if otp_verified and not engagement.is_otp_verified:
                    engagement.is_otp_verified = True
                    engagement.otp_verified_at = datetime.utcnow()
        
        db.session.commit()
        return access
    
    def get_location_from_ip(self, ip_address: str) -> Optional[str]:
        """Get location from IP address using free service"""
        try:
            if ip_address and ip_address != '127.0.0.1':
                response = requests.get(f"http://ip-api.com/json/{ip_address}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'success':
                        return f"{data.get('city', '')}, {data.get('regionName', '')}, {data.get('country', '')}"
        except:
            pass
        return None
    
    def get_engagement_summary(self, lead_id: int, campaign_id: int = None) -> Dict[str, Any]:
        """Get comprehensive engagement summary"""
        
        query = EmailEngagement.query.filter_by(lead_id=lead_id)
        if campaign_id:
            query = query.filter_by(campaign_id=campaign_id)
        
        engagements = query.all()
        
        if not engagements:
            return {
                'total_emails': 0,
                'delivered': 0,
                'opened': 0,
                'clicked': 0,
                'secure_accessed': 0,
                'otp_verified': 0,
                'engagement_rate': 0,
                'click_through_rate': 0,
                'conversion_rate': 0
            }
        
        total_emails = len(engagements)
        delivered = sum(1 for e in engagements if e.is_delivered)
        opened = sum(1 for e in engagements if e.is_opened)
        clicked = sum(1 for e in engagements if e.is_clicked)
        secure_accessed = sum(1 for e in engagements if e.is_secure_link_accessed)
        otp_verified = sum(1 for e in engagements if e.is_otp_verified)
        
        engagement_rate = (opened / total_emails * 100) if total_emails > 0 else 0
        click_through_rate = (clicked / total_emails * 100) if total_emails > 0 else 0
        conversion_rate = (otp_verified / total_emails * 100) if total_emails > 0 else 0
        
        return {
            'total_emails': total_emails,
            'delivered': delivered,
            'opened': opened,
            'clicked': clicked,
            'secure_accessed': secure_accessed,
            'otp_verified': otp_verified,
            'engagement_rate': round(engagement_rate, 2),
            'click_through_rate': round(click_through_rate, 2),
            'conversion_rate': round(conversion_rate, 2),
            'engagements': engagements
        }
    
    def get_detailed_engagement(self, delivery_id: int) -> Dict[str, Any]:
        """Get detailed engagement for a specific email delivery"""
        
        delivery = EmailDelivery.query.get(delivery_id)
        if not delivery:
            return {}
        
        engagement = EmailEngagement.query.filter_by(delivery_id=delivery_id).first()
        
        return {
            'delivery': delivery,
            'engagement': engagement,
            'opens': delivery.opens,
            'clicks': delivery.clicks,
            'total_opens': len(delivery.opens),
            'total_clicks': len(delivery.clicks),
            'first_open': delivery.opens[0] if delivery.opens else None,
            'last_open': delivery.opens[-1] if delivery.opens else None,
            'first_click': delivery.clicks[0] if delivery.clicks else None,
            'last_click': delivery.clicks[-1] if delivery.clicks else None
        }
