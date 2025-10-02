"""
Complete Lead Flow Service for WeTechForU Healthcare Marketing Platform
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime
import json

from .lead_scraping_service import LeadScrapingService
from .email_service import EmailService
from .calendar_service import CalendarService
from app import db
from app.models.lead import Lead
from app.models.client import Client

logger = logging.getLogger(__name__)

class LeadFlowService:
    """Complete lead flow service - from capture to conversion"""
    
    def __init__(self):
        self.lead_scraper = LeadScrapingService()
        self.email_service = EmailService()
        self.calendar_service = CalendarService()
        
        # Mock SEO data generator
        self.seo_data_generator = SEODataGenerator()
    
    def process_complete_lead_flow(self, website_url: str) -> Dict[str, any]:
        """Process complete lead flow from website URL to conversion"""
        try:
            logger.info(f"Starting complete lead flow for: {website_url}")
            
            # Step 1: Scrape website for lead data
            scraping_result = self.lead_scraper.scrape_healthcare_website(website_url)
            
            if not scraping_result['success']:
                return {
                    'success': False,
                    'error': f"Lead scraping failed: {scraping_result['error']}",
                    'step': 'scraping'
                }
            
            lead_data = scraping_result['lead_data']
            
            # Step 2: Create lead record in database
            lead = self.create_lead_record(lead_data)
            
            if not lead:
                return {
                    'success': False,
                    'error': 'Failed to create lead record',
                    'step': 'lead_creation'
                }
            
            # Step 3: Generate SEO analysis
            seo_data = self.seo_data_generator.generate_seo_analysis(website_url, lead_data)
            
            # Step 4: Send basic SEO email
            email_result = self.email_service.send_basic_seo_email(lead_data, seo_data)
            
            if not email_result['success']:
                logger.warning(f"Basic SEO email failed: {email_result.get('error', 'Unknown error')}")
            
            # Step 5: Update lead with SEO data
            self.update_lead_with_seo_data(lead, seo_data)
            
            # Step 6: Prepare for detailed analysis (triggered by user action)
            detailed_seo_data = self.seo_data_generator.generate_detailed_seo_analysis(website_url, lead_data)
            
            return {
                'success': True,
                'lead_id': lead.id,
                'lead_data': lead_data,
                'seo_data': seo_data,
                'detailed_seo_data': detailed_seo_data,
                'email_sent': email_result['success'],
                'next_steps': [
                    'Lead can schedule consultation',
                    'Detailed SEO report available',
                    'Follow-up email sequence ready'
                ],
                'compliance': scraping_result['compliance']
            }
            
        except Exception as e:
            logger.error(f"Error in complete lead flow: {e}")
            return {
                'success': False,
                'error': str(e),
                'step': 'unknown'
            }
    
    def create_lead_record(self, lead_data: Dict) -> Optional[Lead]:
        """Create lead record in database"""
        try:
            # Check if lead already exists
            existing_lead = Lead.query.filter_by(
                website_url=lead_data.get('website_url', '')
            ).first()
            
            if existing_lead:
                logger.info(f"Lead already exists: {existing_lead.id}")
                return existing_lead
            
            # Create new lead
            lead = Lead(
                clinic_name=lead_data.get('business_name', 'Unknown'),
                website_url=lead_data.get('website_url', ''),
                email=lead_data.get('email', ''),
                phone=lead_data.get('phone', ''),
                address=lead_data.get('address', ''),
                contact_person=lead_data.get('contact_person', ''),
                contact_email=lead_data.get('email', ''),
                contact_phone=lead_data.get('phone', ''),
                industry_category=lead_data.get('industry_category', 'Healthcare'),
                industry_subcategory=lead_data.get('industry_subcategory', 'General Healthcare'),
                services=json.dumps(lead_data.get('services', [])),
                lead_source=lead_data.get('lead_source', 'web_scraping'),
                status='new',
                notes=lead_data.get('notes', '')
            )
            
            db.session.add(lead)
            db.session.commit()
            
            logger.info(f"Lead created successfully: {lead.id}")
            return lead
            
        except Exception as e:
            logger.error(f"Error creating lead record: {e}")
            db.session.rollback()
            return None
    
    def update_lead_with_seo_data(self, lead: Lead, seo_data: Dict):
        """Update lead with SEO analysis data"""
        try:
            # Update lead notes with SEO information
            seo_summary = f"""
            SEO Analysis Summary:
            - Overall Score: {seo_data.get('overall_score', 0)}
            - Page Speed: {seo_data.get('page_speed', 'N/A')}
            - Mobile Score: {seo_data.get('mobile_score', 0)}
            - Accessibility Score: {seo_data.get('accessibility_score', 0)}
            - Analysis Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}
            """
            
            if lead.notes:
                lead.notes += "\n\n" + seo_summary
            else:
                lead.notes = seo_summary
            
            lead.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Lead {lead.id} updated with SEO data")
            
        except Exception as e:
            logger.error(f"Error updating lead with SEO data: {e}")
            db.session.rollback()
    
    def send_detailed_seo_email(self, lead_id: int) -> Dict[str, any]:
        """Send detailed SEO email to lead"""
        try:
            lead = Lead.query.get(lead_id)
            if not lead:
                return {
                    'success': False,
                    'error': 'Lead not found'
                }
            
            # Generate detailed SEO data
            lead_data = {
                'id': lead.id,
                'business_name': lead.clinic_name,
                'website_url': lead.website_url,
                'email': lead.email
            }
            
            detailed_seo_data = self.seo_data_generator.generate_detailed_seo_analysis(
                lead.website_url, lead_data
            )
            
            # Send detailed email
            result = self.email_service.send_detailed_seo_email(lead_data, detailed_seo_data)
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending detailed SEO email: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def schedule_consultation(self, lead_id: int, appointment_data: Dict) -> Dict[str, any]:
        """Schedule consultation for lead"""
        try:
            lead = Lead.query.get(lead_id)
            if not lead:
                return {
                    'success': False,
                    'error': 'Lead not found'
                }
            
            # Add lead information to appointment data
            appointment_data.update({
                'name': lead.clinic_name,
                'email': lead.email or lead.contact_email,
                'phone': lead.phone or lead.contact_phone,
                'lead_id': lead_id
            })
            
            # Book appointment
            booking_result = self.calendar_service.book_appointment(appointment_data)
            
            if booking_result['success']:
                # Send confirmation email
                confirmation_result = self.calendar_service.send_appointment_confirmation(
                    booking_result['appointment']
                )
                
                # Update lead status
                lead.status = 'appointment_scheduled'
                lead.updated_at = datetime.utcnow()
                db.session.commit()
                
                return {
                    'success': True,
                    'appointment': booking_result['appointment'],
                    'confirmation_sent': confirmation_result['success'],
                    'message': 'Consultation scheduled successfully'
                }
            else:
                return booking_result
            
        except Exception as e:
            logger.error(f"Error scheduling consultation: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def convert_lead_to_client(self, lead_id: int, conversion_data: Dict) -> Dict[str, any]:
        """Convert lead to client"""
        try:
            lead = Lead.query.get(lead_id)
            if not lead:
                return {
                    'success': False,
                    'error': 'Lead not found'
                }
            
            # Create client record
            client = Client(
                client_name=lead.clinic_name,
                website=lead.website_url,
                email=lead.email or lead.contact_email,
                phone=lead.phone or lead.contact_phone,
                address=lead.address,
                contact_name=lead.contact_person,
                specialties=json.dumps(lead.services) if lead.services else '',
                monthly_retainer=conversion_data.get('monthly_retainer', 0.0),
                is_active=True
            )
            
            db.session.add(client)
            db.session.flush()  # Get client ID
            
            # Update lead with conversion
            lead.status = 'converted'
            lead.converted_to_client_id = client.id
            lead.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info(f"Lead {lead_id} converted to client {client.id}")
            
            return {
                'success': True,
                'client_id': client.id,
                'message': 'Lead converted to client successfully'
            }
            
        except Exception as e:
            logger.error(f"Error converting lead to client: {e}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_lead_flow_stats(self) -> Dict[str, any]:
        """Get lead flow statistics"""
        try:
            total_leads = Lead.query.count()
            new_leads = Lead.query.filter_by(status='new').count()
            contacted_leads = Lead.query.filter_by(status='contacted').count()
            appointment_scheduled = Lead.query.filter_by(status='appointment_scheduled').count()
            converted_leads = Lead.query.filter_by(status='converted').count()
            
            conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
            
            return {
                'total_leads': total_leads,
                'new_leads': new_leads,
                'contacted_leads': contacted_leads,
                'appointment_scheduled': appointment_scheduled,
                'converted_leads': converted_leads,
                'conversion_rate': f"{conversion_rate:.1f}%",
                'email_stats': self.email_service.get_email_stats(),
                'calendar_stats': self.calendar_service.get_calendar_stats(),
                'scraping_stats': self.lead_scraper.get_scraping_report()
            }
            
        except Exception as e:
            logger.error(f"Error getting lead flow stats: {e}")
            return {
                'error': str(e)
            }


class SEODataGenerator:
    """Mock SEO data generator for testing"""
    
    def generate_seo_analysis(self, website_url: str, lead_data: Dict) -> Dict[str, any]:
        """Generate basic SEO analysis data"""
        return {
            'overall_score': 78,
            'score_rating': 'Good',
            'page_speed': '2.1s',
            'speed_rating': 'Good',
            'mobile_score': 88,
            'mobile_rating': 'Excellent',
            'accessibility_score': 92,
            'accessibility_rating': 'Excellent',
            'ranking_keywords': 15,
            'domain_authority': 32,
            'analysis_date': datetime.utcnow().isoformat(),
            'website_url': website_url
        }
    
    def generate_detailed_seo_analysis(self, website_url: str, lead_data: Dict) -> Dict[str, any]:
        """Generate detailed SEO analysis data"""
        basic_data = self.generate_seo_analysis(website_url, lead_data)
        
        detailed_data = basic_data.copy()
        detailed_data.update({
            'technical_seo': {
                'page_speed_insights': 'Good performance across all metrics',
                'ssl_certificate': 'Properly configured',
                'site_structure': 'Well-organized with clear navigation',
                'meta_tags': 'Optimized',
                'images': 'Need optimization'
            },
            'keyword_analysis': {
                'primary_keywords': [
                    'healthcare near me',
                    'medical practice',
                    'family medicine',
                    'primary care'
                ],
                'long_tail_keywords': [
                    'best family doctor near me',
                    'primary care physician consultation',
                    'healthcare services in area'
                ],
                'competitor_keywords': [
                    'wellness center',
                    'health and wellness',
                    'holistic health'
                ]
            },
            'competitor_analysis': {
                'top_competitors': [
                    'Local Wellness Center',
                    'Health Plus Clinic',
                    'Community Medical Group'
                ],
                'gaps': [
                    'Local directory listings',
                    'Patient reviews',
                    'Content marketing'
                ]
            },
            'roi_projections': {
                'monthly_investment': '$1,500 - $2,500',
                'projected_revenue_increase': '$8,000 - $12,000',
                'roi_percentage': '400% - 500%',
                'break_even_months': '2-3'
            }
        })
        
        return detailed_data
